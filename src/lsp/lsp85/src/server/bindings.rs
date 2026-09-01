use std::collections::HashMap;
use std::sync::Mutex;

use crate::frontend::lexer::Lexer;
use crate::frontend::parser::{self, Node};
use crate::frontend::token::{Token, TokenType};
use crate::server::completion_items::get_completion_items;
use crate::server::utils::{get_documentation, parse_immediate_val};

use lsp_types::{
    CompletionOptions, CompletionResponse, Diagnostic, DiagnosticSeverity,
    HoverProviderCapability, Position, PublishDiagnosticsParams, Range, ServerCapabilities,
    SignatureHelp, SignatureHelpOptions, SignatureInformation, Uri,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use wasm_bindgen::prelude::*;

// ── In-memory document store ──────────────────────────────────────────
static DOCUMENTS: std::sync::LazyLock<Mutex<HashMap<String, String>>> =
    std::sync::LazyLock::new(|| Mutex::new(HashMap::new()));

// ── JSON-RPC types (subset needed for WASM transport) ─────────────────
#[derive(Debug, Deserialize)]
struct JsonRpcMessage {
    jsonrpc: String,
    #[serde(default)]
    id: Option<Value>,
    method: Option<String>,
    #[serde(default)]
    params: Option<Value>,
}

#[derive(Debug, Serialize)]
struct JsonRpcResponse {
    jsonrpc: String,
    id: Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    result: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<Value>,
}

#[derive(Debug, Serialize)]
struct JsonRpcNotification {
    jsonrpc: String,
    method: String,
    params: Value,
}

// ── Public WASM entry point ───────────────────────────────────────────
/// Accepts a JSON-RPC message string, processes it, and returns a JSON
/// array of response/notification strings to send back to the client.
#[wasm_bindgen]
pub fn wasm_handle_message(message: &str) -> Result<JsValue, JsValue> {
    let msg: JsonRpcMessage = serde_json::from_str(message)
        .map_err(|e| JsValue::from_str(&format!("Parse error: {e}")))?;

    let mut responses: Vec<String> = Vec::new();

    match msg.method.as_deref() {
        // ── Lifecycle ────────────────────────────────────────────
        Some("initialize") => {
            let caps = build_server_capabilities();
            let result = serde_json::json!({
                "capabilities": caps,
                "serverInfo": {
                    "name": "lsp85",
                    "version": "0.1.1"
                }
            });
            responses.push(make_response(msg.id.unwrap_or(Value::Null), Some(result), None));
        }
        Some("initialized") => { /* no-op notification */ }
        Some("shutdown") => {
            responses.push(make_response(msg.id.unwrap_or(Value::Null), Some(Value::Null), None));
        }
        Some("exit") => { /* no-op */ }

        // ── Document synchronization ────────────────────────────
        Some("textDocument/didOpen") => {
            if let Some(params) = msg.params {
                if let (Some(uri), Some(text)) = (
                    params.get("textDocument").and_then(|td| td.get("uri")).and_then(|u| u.as_str()),
                    params.get("textDocument").and_then(|td| td.get("text")).and_then(|t| t.as_str()),
                ) {
                    let uri_str = uri.to_string();
                    DOCUMENTS.lock().unwrap().insert(uri_str.clone(), text.to_string());
                    // Push initial diagnostics
                    if let Some(diag_notif) = make_diagnostics_notification(&uri_str, text) {
                        responses.push(diag_notif);
                    }
                }
            }
        }
        Some("textDocument/didChange") => {
            if let Some(params) = msg.params {
                if let Some(uri) = params.get("textDocument").and_then(|td| td.get("uri")).and_then(|u| u.as_str()) {
                    let uri_str = uri.to_string();
                    // Full sync: take the last contentChange
                    if let Some(changes) = params.get("contentChanges").and_then(|c| c.as_array()) {
                        if let Some(last) = changes.last() {
                            if let Some(text) = last.get("text").and_then(|t| t.as_str()) {
                                DOCUMENTS.lock().unwrap().insert(uri_str.clone(), text.to_string());
                                if let Some(diag_notif) = make_diagnostics_notification(&uri_str, text) {
                                    responses.push(diag_notif);
                                }
                            }
                        }
                    }
                }
            }
        }
        Some("textDocument/didSave") => {
            if let Some(params) = msg.params {
                if let Some(uri) = params.get("textDocument").and_then(|td| td.get("uri")).and_then(|u| u.as_str()) {
                    let uri_str = uri.to_string();
                    let docs = DOCUMENTS.lock().unwrap();
                    if let Some(text) = docs.get(&uri_str) {
                        let text = text.clone();
                        drop(docs);
                        if let Some(diag_notif) = make_diagnostics_notification(&uri_str, &text) {
                            responses.push(diag_notif);
                        }
                    }
                }
            }
        }
        Some("textDocument/didClose") => {
            if let Some(params) = msg.params {
                if let Some(uri) = params.get("textDocument").and_then(|td| td.get("uri")).and_then(|u| u.as_str()) {
                    DOCUMENTS.lock().unwrap().remove(uri);
                }
            }
        }

        // ── Completion ──────────────────────────────────────────
        Some("textDocument/completion") => {
            let items = get_completion_items();
            let result = CompletionResponse::Array(items);
            let result_val = serde_json::to_value(&result).unwrap_or(Value::Null);
            responses.push(make_response(msg.id.unwrap_or(Value::Null), Some(result_val), None));
        }

        // ── Hover ───────────────────────────────────────────────
        Some("textDocument/hover") => {
            let hover_result = handle_hover(msg.params.as_ref());
            responses.push(make_response(msg.id.unwrap_or(Value::Null), Some(hover_result), None));
        }

        // ── Signature Help ──────────────────────────────────────
        Some("textDocument/signatureHelp") => {
            let sig_result = handle_signature_help(msg.params.as_ref());
            responses.push(make_response(msg.id.unwrap_or(Value::Null), Some(sig_result), None));
        }

        // ── Fallback ────────────────────────────────────────────
        Some(_method) => {
            // Unknown method — if it has an id, send MethodNotFound
            if let Some(id) = msg.id {
                let error = serde_json::json!({
                    "code": -32601,
                    "message": "Method not found"
                });
                responses.push(make_response(id, None, Some(error)));
            }
        }
        None => {
            // Response message from client (ignore)
        }
    }

    // Return array of JSON-RPC strings
    let js_array = js_sys::Array::new();
    for r in responses {
        js_array.push(&JsValue::from_str(&r));
    }
    Ok(js_array.into())
}

// ── Helpers ───────────────────────────────────────────────────────────

fn build_server_capabilities() -> ServerCapabilities {
    ServerCapabilities {
        text_document_sync: Some(lsp_types::TextDocumentSyncCapability::Kind(
            lsp_types::TextDocumentSyncKind::FULL,
        )),
        completion_provider: Some(CompletionOptions::default()),
        hover_provider: Some(HoverProviderCapability::Simple(true)),
        signature_help_provider: Some(SignatureHelpOptions {
            trigger_characters: Some(vec![" ".to_string(), ",".to_string()]),
            retrigger_characters: None,
            work_done_progress_options: Default::default(),
        }),
        ..Default::default()
    }
}

fn make_response(id: Value, result: Option<Value>, error: Option<Value>) -> String {
    let resp = JsonRpcResponse {
        jsonrpc: "2.0".to_string(),
        id,
        result,
        error,
    };
    serde_json::to_string(&resp).unwrap_or_default()
}

fn make_notification(method: &str, params: Value) -> String {
    let notif = JsonRpcNotification {
        jsonrpc: "2.0".to_string(),
        method: method.to_string(),
        params,
    };
    serde_json::to_string(&notif).unwrap_or_default()
}

// ── Diagnostics ─────────────────────────────────────────────────────

fn make_diagnostics_notification(uri: &str, text: &str) -> Option<String> {
    let diagnostics = collect_diagnostics(text);
    let parsed_uri: Uri = uri.parse().ok()?;
    let params = PublishDiagnosticsParams {
        uri: parsed_uri,
        diagnostics,
        version: None,
    };
    let params_val = serde_json::to_value(params).ok()?;
    Some(make_notification("textDocument/publishDiagnostics", params_val))
}

fn collect_diagnostics(text: &str) -> Vec<Diagnostic> {
    let mut diagnostics = Vec::new();
    let mut tokens: Vec<Token> = vec![];

    for (line_idx, line) in text.lines().enumerate() {
        if let Ok(lexer) = Lexer::new(line.to_string(), line_idx) {
            tokens.extend(lexer);
        }
    }

    tokens.retain(|t| !matches!(t.tok_type, TokenType::EOL | TokenType::EOF));

    let mut parser = parser::Parser::new(tokens.into_iter());
    while let Some(node) = parser.parse_expression() {
        inspect_node(&node, &mut diagnostics);
    }

    diagnostics
}

fn inspect_node(node: &Node, diagnostics: &mut Vec<Diagnostic>) {
    if node.value.tok_type != TokenType::OPERATION {
        return;
    }

    let expected = expected_operand_count(&node.value.tok_literal);
    let got = [&node.branch.l_child, &node.branch.r_child]
        .iter()
        .filter(|c| c.is_some())
        .count();

    if got != expected {
        diagnostics.push(Diagnostic {
            range: Range {
                start: Position {
                    line: node.value.location.row as u32,
                    character: (node.value.location.col - node.value.offset) as u32,
                },
                end: Position {
                    line: node.value.location.row as u32,
                    character: node.value.location.col as u32,
                },
            },
            severity: Some(DiagnosticSeverity::ERROR),
            message: format!(
                "'{}' expects {} operand(s), got {}",
                node.value.tok_literal, expected, got
            ),
            source: Some("lsp85".to_string()),
            ..Default::default()
        });
    }
}

fn expected_operand_count(op: &str) -> usize {
    match op.to_uppercase().as_str() {
        "NOP" | "HLT" | "RET" | "RLC" | "RRC" | "RAL" | "RAR" | "CMA" | "STC" | "CMC"
        | "DAA" | "XCHG" | "XTHL" | "SPHL" | "PCHL" | "EI" | "DI" | "RZ" | "RNZ" | "RC"
        | "RNC" | "RPE" | "RPO" | "RP" | "RM" => 0,

        "ADD" | "ADC" | "SUB" | "SBB" | "ANA" | "ORA" | "XRA" | "CMP" | "INR" | "DCR"
        | "PUSH" | "POP" | "DAD" | "INX" | "DCX" | "LDAX" | "STAX" => 1,

        "ADI" | "ACI" | "SUI" | "SBI" | "ANI" | "ORI" | "XRI" | "CPI" | "JMP" | "JZ"
        | "JNZ" | "JC" | "JNC" | "JPE" | "JPO" | "JP" | "JM" | "CALL" | "CZ" | "CNZ"
        | "CC" | "CNC" | "CPE" | "CPO" | "CP" | "CM" | "STA" | "LDA" | "SHLD" | "LHLD"
        | "OUT" | "IN" | "RST" => 1,

        "MOV" | "MVI" | "LXI" => 2,

        _ => 0,
    }
}

// ── Hover handler ───────────────────────────────────────────────────

fn handle_hover(params: Option<&Value>) -> Value {
    let params = match params {
        Some(p) => p,
        None => return Value::Null,
    };

    let uri = params
        .get("textDocument")
        .and_then(|td| td.get("uri"))
        .and_then(|u| u.as_str())
        .unwrap_or("");

    let line = params
        .get("position")
        .and_then(|p| p.get("line"))
        .and_then(|l| l.as_u64())
        .unwrap_or(0) as usize;

    let col = params
        .get("position")
        .and_then(|p| p.get("character"))
        .and_then(|c| c.as_u64())
        .unwrap_or(0) as usize;

    // Get the line from in-memory document store
    let docs = DOCUMENTS.lock().unwrap();
    let source_line = docs
        .get(uri)
        .and_then(|text| text.lines().nth(line))
        .map(|s| s.to_string());
    drop(docs);

    let source_line = match source_line {
        Some(s) => s,
        None => return Value::Null,
    };

    let hovered_word = Lexer::new(source_line, line)
        .ok()
        .and_then(|lexer| {
            lexer
                .filter(|tok| {
                    matches!(
                        tok.tok_type,
                        TokenType::OPERATION | TokenType::REGISTER | TokenType::ImmValue
                    )
                })
                .find(|tok| {
                    let tok_start = tok.location.col - tok.offset;
                    let tok_end = tok.location.col;
                    (col >= tok_start) && (col < tok_end)
                })
        });

    match hovered_word {
        Some(ref word) if word.tok_type == TokenType::ImmValue => {
            if let Ok(value_lit) = parse_immediate_val(&word.tok_literal) {
                let hover = lsp_types::Hover {
                    contents: lsp_types::HoverContents::Markup(lsp_types::MarkupContent {
                        kind: lsp_types::MarkupKind::Markdown,
                        value: format!(
                            "**Immediate value**\n\nHexadecimal: 0x{:X}\nBinary: {:b}\nDecimal: {}",
                            value_lit, value_lit, value_lit
                        ),
                    }),
                    range: None,
                };
                serde_json::to_value(&hover).unwrap_or(Value::Null)
            } else {
                Value::Null
            }
        }
        Some(word) => {
            let info = get_documentation()
                .into_iter()
                .find(|i| i.label == word.tok_literal);

            match info {
                Some(info) => {
                    let hover = lsp_types::Hover {
                        contents: lsp_types::HoverContents::Markup(lsp_types::MarkupContent {
                            kind: lsp_types::MarkupKind::Markdown,
                            value: format!("**{}**\n\n{}", info.detail, info.documentation),
                        }),
                        range: None,
                    };
                    serde_json::to_value(&hover).unwrap_or(Value::Null)
                }
                None => Value::Null,
            }
        }
        None => Value::Null,
    }
}

// ── Signature Help handler ──────────────────────────────────────────

fn handle_signature_help(params: Option<&Value>) -> Value {
    let params = match params {
        Some(p) => p,
        None => return Value::Null,
    };

    let uri = params
        .get("textDocument")
        .and_then(|td| td.get("uri"))
        .and_then(|u| u.as_str())
        .unwrap_or("");

    let line = params
        .get("position")
        .and_then(|p| p.get("line"))
        .and_then(|l| l.as_u64())
        .unwrap_or(0) as usize;

    let docs = DOCUMENTS.lock().unwrap();
    let source_line = docs
        .get(uri)
        .and_then(|text| text.lines().nth(line))
        .map(|s| s.to_string());
    drop(docs);

    let source_line = match source_line {
        Some(s) => s,
        None => return Value::Null,
    };

    let signature = Lexer::new(source_line, line)
        .ok()
        .and_then(|mut lexer| lexer.find(|tok| tok.tok_type == TokenType::OPERATION))
        .and_then(|op_tok| {
            get_documentation()
                .into_iter()
                .find(|i| i.label == op_tok.tok_literal)
        })
        .map(|info| SignatureInformation {
            label: info.label.to_string(),
            documentation: Some(lsp_types::Documentation::String(
                info.documentation.to_string(),
            )),
            parameters: None,
            active_parameter: None,
        });

    let result = signature.map(|sig| SignatureHelp {
        signatures: vec![sig],
        active_signature: Some(0),
        active_parameter: None,
    });

    serde_json::to_value(result).unwrap_or(Value::Null)
}
