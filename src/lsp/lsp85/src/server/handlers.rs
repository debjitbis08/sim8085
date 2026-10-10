use crate::frontend::token::{Token, TokenType};
use crate::frontend::{parser, parser::Node};
use crate::server::utils::get_documentation;
use crate::server::utils::parse_immediate_val;
use crate::{frontend::lexer::Lexer, server::completion_items::get_completion_items};
use lsp_server::RequestId;
use lsp_types::{CompletionParams, CompletionResponse, HoverParams};
use lsp_types::{
    Diagnostic, DiagnosticSeverity, DidSaveTextDocumentParams, Position, PublishDiagnosticsParams,
    Range, Uri,
};
use lsp_types::{SignatureHelp, SignatureHelpParams, SignatureInformation};
use serde::de::Error;
use std::io;

use crate::frontend::utils::files::get_source_line;

pub fn completion_handler(
    id: &RequestId,
    params: CompletionParams,
) -> Result<serde_json::Value, serde_json::Error> {
    eprintln!("got completion request #{}: {:?}", id, params);
    let result = CompletionResponse::Array(get_completion_items());
    serde_json::to_value(&result)
}

pub fn hover_handler(
    _id: &RequestId,
    params: HoverParams,
) -> Result<serde_json::Value, serde_json::Error> {
    let file_name = params
        .text_document_position_params
        .text_document
        .uri
        .path()
        .as_str();
    let position = params.text_document_position_params.position;

    let hovered_word = get_source_line(file_name, position.line)
        .and_then(|source| source.ok())
        .and_then(|line| {
            let col = position.character as usize;
            let lexer = Lexer::new(line, position.line as usize).ok()?;
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
        })
        .map(|token| token);

    if let Some(ref word) = hovered_word {
        if word.tok_type != TokenType::ImmValue {
            let info = hovered_word.and_then(|word| {
                get_documentation()
                    .into_iter()
                    .find(|i| i.label == word.tok_literal)
            });

            match info {
                Some(info) => {
                    let hover_result = lsp_types::Hover {
                        contents: lsp_types::HoverContents::Markup(lsp_types::MarkupContent {
                            kind: lsp_types::MarkupKind::Markdown,
                            value: format!("**{}**\n\n{}", info.detail, info.documentation),
                        }),
                        range: None,
                    };
                    serde_json::to_value(&hover_result)
                }
                None => serde_json::to_value(Option::<lsp_types::Hover>::None),
            }
        } else {
            let value_lit = parse_immediate_val(&word.tok_literal).map_err(|e| Error::custom(e))?;
            let hover_result = lsp_types::Hover {
                contents: lsp_types::HoverContents::Markup(lsp_types::MarkupContent {
                    kind: lsp_types::MarkupKind::Markdown,
                    value: format!(
                        "**Immediate value**\n\nHexadecimal:0x{:X}\nBinary:{:b}\nDecimal:{}",
                        value_lit,
                        value_lit,
                        value_lit
                    ),
                }),
                range: None,
            };
            serde_json::to_value(&hover_result)
        }
    } else {
        let hover_result = lsp_types::Hover {
            contents: lsp_types::HoverContents::Markup(lsp_types::MarkupContent {
                kind: lsp_types::MarkupKind::Markdown,
                value: format!("No information available!"),
            }),
            range: None,
        };
        serde_json::to_value(&hover_result)
    }
}

pub fn diagnostic_handler(
    params: &serde_json::Value,
) -> Result<serde_json::Value, serde_json::Error> {
    let save_params: DidSaveTextDocumentParams = serde_json::from_value(params.clone())?;
    let uri = save_params.text_document.uri;

    eprintln!("document analysis call!");
    let diagnostics = analyze_document(&uri, save_params.text.as_deref()).unwrap_or_default();
    serde_json::to_value(PublishDiagnosticsParams {
        uri,
        diagnostics,
        version: None,
    })
}

fn analyze_document(
    uri: &Uri,
    text: Option<&str>,
) -> Result<Vec<Diagnostic>, Box<dyn std::error::Error>> {
    eprintln!("document analysis called!");
    let Some(text) = text else {
        // If text isn't sent on save, read from disk
        let path = uri.path().as_str();
        let Ok(content) = std::fs::read_to_string(path) else {

            eprintln!("Error in reading from document!");
            return Err(Box::new(io::Error::other("Error in reading from document!")));
        };

        eprintln!("Document read successfully!");
        return Ok(collect_diagnostics(&content)?);
    };

    eprintln!("Text read successfully!");
    return Ok(collect_diagnostics(text)?);
}

fn collect_diagnostics(text: &str) -> io::Result<Vec<Diagnostic>> {
    let mut diagnostics = Vec::new();
    let mut tokens: Vec<Token> = vec![];

    for (line_idx, line) in text.lines().enumerate() {
        let lexer = Lexer::new(line.to_string(), line_idx)?;
        tokens.extend(lexer);
    }

    tokens.retain(|t| !matches!(t.tok_type, TokenType::EOL | TokenType::EOF));

    let mut parser = parser::Parser::new(tokens.into_iter());
    while let Some(node) = parser.parse_expression() {
        inspect_node(&node, &mut diagnostics);
    }

    Ok(diagnostics)
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
        diagnostics.push(make_diagnostic(
            &node.value,
            DiagnosticSeverity::ERROR,
            &format!(
                "'{}' expects {} operand(s), got {}",
                node.value.tok_literal, expected, got
            ),
        ));
    }
}

fn expected_operand_count(op: &str) -> usize {
    match op.to_uppercase().as_str() {
        // 0 operands
        "NOP" | "HLT" | "RET" | "RLC" | "RRC" | "RAL" | "RAR" | "CMA" | "STC" | "CMC" | "DAA"
        | "XCHG" | "XTHL" | "SPHL" | "PCHL" | "EI" | "DI" | "RZ" | "RNZ" | "RC" | "RNC" | "RPE"
        | "RPO" | "RP" | "RM" => 0,

        // 1 operand
        "ADD" | "ADC" | "SUB" | "SBB" | "ANA" | "ORA" | "XRA" | "CMP" | "INR" | "DCR" | "PUSH"
        | "POP" | "DAD" | "INX" | "DCX" | "LDAX" | "STAX" => 1,

        // 1 operand
        "ADI" | "ACI" | "SUI" | "SBI" | "ANI" | "ORI" | "XRI" | "CPI" | "JMP" | "JZ" | "JNZ"
        | "JC" | "JNC" | "JPE" | "JPO" | "JP" | "JM" | "CALL" | "CZ" | "CNZ" | "CC" | "CNC"
        | "CPE" | "CPO" | "CP" | "CM" | "STA" | "LDA" | "SHLD" | "LHLD" | "OUT" | "IN" | "RST" => 1,

        // 2 operands
        "MOV" | "MVI" | "LXI" => 2,

        _ => 0,
    }
}

fn make_diagnostic(tok: &Token, severity: DiagnosticSeverity, message: &str) -> Diagnostic {
    Diagnostic {
        range: Range {
            start: Position {
                line: tok.location.row as u32,
                character: (tok.location.col - tok.offset) as u32,
            },
            end: Position {
                line: tok.location.row as u32,
                character: tok.location.col as u32,
            },
        },
        severity: Some(severity),
        message: message.to_string(),
        source: Some("my-ls".to_string()),
        ..Default::default()
    }
}

pub fn signature_help_handler(
    _id: &RequestId,
    params: SignatureHelpParams,
) -> Result<serde_json::Value, serde_json::Error> {
    let position = params.text_document_position_params.position;
    let file_name = params
        .text_document_position_params
        .text_document
        .uri
        .path()
        .as_str();

    let signature = get_source_line(file_name, position.line)
        .and_then(|line| line.ok())
        .and_then(|line| {
            let mut lexer = Lexer::new(line, position.line as usize).ok()?;
            lexer.find(|tok| tok.tok_type == TokenType::OPERATION)
        })
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

    serde_json::to_value(result)
}
