use lsp_server::{ExtractError, Message, Notification, Request, RequestId, Response};
use lsp_types::CompletionItemKind;
use lsp_types::{
    CompletionItem, CompletionParams, CompletionResponse, Documentation, HoverParams,
    MarkupContent, MarkupKind,
};
use serde_json;

pub fn completion_handler(id: &RequestId, params: CompletionParams) -> serde_json::Value {
    eprintln!("got completion request #{}: {:?}", id, params);
    let responses = vec![
                    CompletionItem {
                        label: "MOV".to_string(),
                        detail: Some("MOV - Move data between registers".to_string()),
                        documentation: Some(Documentation::MarkupContent(MarkupContent {
                            kind: MarkupKind::Markdown,
                            value: "`MOV` instruction **copies** the content of the **source register** into **destination register**.".to_string(),
                        })),
                        kind: Some(CompletionItemKind::KEYWORD),
                        ..Default::default()
                    },
                    CompletionItem {
                        label: "MVI".to_string(),
                        detail: Some("MVI - Move immediate data".to_string()),
                        documentation: Some(Documentation::MarkupContent(MarkupContent {
                            kind: MarkupKind::Markdown,
                            value: "The **8-bit data** is stored in the **destination register** of **memory**.".to_string(),
                        })),
                        kind: Some(CompletionItemKind::KEYWORD),
                        ..Default::default()
                    },
                    CompletionItem {
                        label: "LDA".to_string(),
                        detail: Some("LDA - Load accumulator direct".to_string()),
                        documentation: Some(Documentation::MarkupContent(MarkupContent {
                            kind: MarkupKind::Markdown,
                            value: "The contents of a **memory location**, specified by a **16-bit address** in the operand, are copied to the **accumulator**.".to_string(),
                        })),
                        kind: Some(CompletionItemKind::KEYWORD),
                        ..Default::default()
                    },
                    CompletionItem {
                        label: "LDAX".to_string(),
                        detail: Some("LDAX - Load accumulator indirect".to_string()),
                        documentation: Some(Documentation::MarkupContent(MarkupContent {
                            kind: MarkupKind::Markdown,
                            value: "The contents of the **designated register pair** point to a **memory location**. This instruction **copies** the contents of that memory location into the **accumulator**.".to_string(),
                        })),
                        kind: Some(CompletionItemKind::KEYWORD),
                        ..Default::default()
                    },
                    CompletionItem {
                        label: "LXI".to_string(),
                        detail: Some("LXI - Load register pair immediate".to_string()),
                        documentation: Some(Documentation::MarkupContent(MarkupContent {
                            kind: MarkupKind::Markdown,
                            value: "The instruction **loads 16-bit data** in the **register pair** designated in the operand.".to_string(),
                        })),
                        kind: Some(CompletionItemKind::KEYWORD),
                        ..Default::default()
                    },
                    CompletionItem {
                        label: "LHLD".to_string(),
                        detail: Some("LHLD - Load H and L registers direct".to_string()),
                        documentation: Some(Documentation::MarkupContent(MarkupContent {
                            kind: MarkupKind::Markdown,
                            value: "The instruction **copies** the contents of the **memory location** pointed out by the **16-bit address** into **register L** and copies the contents of the **next memory location** into **register H**. The contents of the **source memory** are not altered.".to_string(),
                        })),
                        kind: Some(CompletionItemKind::KEYWORD),
                        ..Default::default()
                    },
                    CompletionItem {
                        label: "SUB".to_string(),
                        detail: Some("SUB - Subtract".to_string()),
                        documentation: Some(Documentation::MarkupContent(MarkupContent {
                            kind: MarkupKind::Markdown,
                            value: "**Subtract** instruction".to_string(),
                        })),
                        kind: Some(CompletionItemKind::KEYWORD),
                        ..Default::default()
                    },
                    CompletionItem {
                        label: "ADD".to_string(),
                        detail: Some("ADD - Add".to_string()),
                        documentation: Some(Documentation::MarkupContent(MarkupContent {
                            kind: MarkupKind::Markdown,
                            value: "**Add** values".to_string(),
                        })),
                        kind: Some(CompletionItemKind::KEYWORD),
                        ..Default::default()
                    },
                ];

    let result = CompletionResponse::Array(responses);
    let result = serde_json::to_value(&result).unwrap();
    return result;
}
pub fn hover_handler(id: &RequestId, params: HoverParams) -> serde_json::Value {
    eprintln!("hovr request {}: {:?}", id, params);

    let hover_result = lsp_types::Hover {
        contents: lsp_types::HoverContents::Scalar(lsp_types::MarkedString::String(
            "dummy hover info".to_string(),
        )),
        range: None,
    };

    let result = serde_json::to_value(&hover_result).unwrap();
    return result;
}
