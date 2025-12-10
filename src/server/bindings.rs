use wasm_bindgen::prelude::*;
use lsp_server::{ExtractError, Message, Notification, Request, RequestId, Response};
use lsp_types::CompletionItemKind;
use lsp_types::{
    CompletionItem, CompletionParams, CompletionResponse, Documentation, HoverParams,
    MarkupContent, MarkupKind,
};

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn wasm_completion_handler(id: JsValue, params: JsValue) -> Result<JsValue,JsValue> {
    // eprintln!("got completion request #{}: {:?}", id, params);
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
        CompletionItem {
            label: "STAX".to_string(),
            detail: Some("STAX - Store accumulator indirect".to_string()),
            documentation: Some(Documentation::MarkupContent(MarkupContent {
                kind: MarkupKind::Markdown,
                value: "Stores the contents of the **accumulator** into the **memory location** pointed to by the **designated register pair**.".to_string(),
            })),
            kind: Some(CompletionItemKind::KEYWORD),
            ..Default::default()
        },

        CompletionItem {
            label: "PUSH".to_string(),
            detail: Some("PUSH - Push register pair to stack".to_string()),
            documentation: Some(Documentation::MarkupContent(MarkupContent {
                kind: MarkupKind::Markdown,
                value: "The contents of the specified **register pair** are **pushed onto the stack**, decrementing the **stack pointer** by 2.".to_string(),
            })),
            kind: Some(CompletionItemKind::KEYWORD),
            ..Default::default()
        },

        CompletionItem {
            label: "POP".to_string(),
            detail: Some("POP - Pop register pair from stack".to_string()),
            documentation: Some(Documentation::MarkupContent(MarkupContent {
                kind: MarkupKind::Markdown,
                value: "Two bytes from the **stack** are **popped** and loaded into the specified **register pair**, incrementing the **stack pointer** by 2.".to_string(),
            })),
            kind: Some(CompletionItemKind::KEYWORD),
            ..Default::default()
        },

        CompletionItem {
            label: "INR".to_string(),
            detail: Some("INR - Increment register".to_string()),
            documentation: Some(Documentation::MarkupContent(MarkupContent {
                kind: MarkupKind::Markdown,
                value: "Increments the contents of the specified **register** by **1**. Flags are affected except Carry.".to_string(),
            })),
            kind: Some(CompletionItemKind::KEYWORD),
            ..Default::default()
        },

        CompletionItem {
            label: "DCR".to_string(),
            detail: Some("DCR - Decrement register".to_string()),
            documentation: Some(Documentation::MarkupContent(MarkupContent {
                kind: MarkupKind::Markdown,
                value: "Decrements the contents of the specified **register** by **1**. Flags are affected except Carry.".to_string(),
            })),
            kind: Some(CompletionItemKind::KEYWORD),
            ..Default::default()
        },

        CompletionItem {
            label: "DAD".to_string(),
            detail: Some("DAD - Double add register pair".to_string()),
            documentation: Some(Documentation::MarkupContent(MarkupContent {
                kind: MarkupKind::Markdown,
                value: "Adds the contents of the specified **register pair** to the **HL pair**. Only the **Carry flag** is affected.".to_string(),
            })),
            kind: Some(CompletionItemKind::KEYWORD),
            ..Default::default()
        },

        // --- JMP Variants ---
        CompletionItem {
            label: "JMP".to_string(),
            detail: Some("JMP - Unconditional jump".to_string()),
            documentation: Some(Documentation::MarkupContent(MarkupContent {
                kind: MarkupKind::Markdown,
                value: "Program execution **jumps** to the specified **16-bit address** unconditionally.".to_string(),
            })),
            kind: Some(CompletionItemKind::KEYWORD),
            ..Default::default()
        },

        CompletionItem {
            label: "JC".to_string(),
            detail: Some("JC - Jump if carry".to_string()),
            documentation: Some(Documentation::MarkupContent(MarkupContent {
                kind: MarkupKind::Markdown,
                value: "Jumps to the given address **if the Carry flag = 1**.".to_string(),
            })),
            kind: Some(CompletionItemKind::KEYWORD),
            ..Default::default()
        },

        CompletionItem {
            label: "JNC".to_string(),
            detail: Some("JNC - Jump if no carry".to_string()),
            documentation: Some(Documentation::MarkupContent(MarkupContent {
                kind: MarkupKind::Markdown,
                value: "Jumps to the given address **if the Carry flag = 0**.".to_string(),
            })),
            kind: Some(CompletionItemKind::KEYWORD),
            ..Default::default()
        },

        CompletionItem {
            label: "JZ".to_string(),
            detail: Some("JZ - Jump if zero".to_string()),
            documentation: Some(Documentation::MarkupContent(MarkupContent {
                kind: MarkupKind::Markdown,
                value: "Jumps to the given address **if the Zero flag = 1**.".to_string(),
            })),
            kind: Some(CompletionItemKind::KEYWORD),
            ..Default::default()
        },

        CompletionItem {
            label: "JNZ".to_string(),
            detail: Some("JNZ - Jump if not zero".to_string()),
            documentation: Some(Documentation::MarkupContent(MarkupContent {
                kind: MarkupKind::Markdown,
                value: "Jumps to the given address **if the Zero flag = 0**.".to_string(),
            })),
            kind: Some(CompletionItemKind::KEYWORD),
            ..Default::default()
        },
                ];

    let result = CompletionResponse::Array(responses);
    let result = match serde_json::to_string(&result){
        Ok(result)=>{
            result
        }
        Err(e)=>{
            "[ERROR] failed to convert JSON-2-String".to_string().into()
        }
    };
    return Ok(serde_wasm_bindgen::to_value(&result)?);
}

#[wasm_bindgen]
pub fn wasm_hover_handler(id: JsValue, params:JsValue ) -> Result<JsValue,JsValue>{
    // eprintln!("hovr request {}: {:?}", id, params);

    let hover_result = lsp_types::Hover {
        contents: lsp_types::HoverContents::Scalar(lsp_types::MarkedString::String(
            "dummy hover info".to_string(),
        )),
        range: None,
    };

    let result = match serde_json::to_string(&hover_result){
        Ok(result)=>{
            result
        }
        Err(_)=>{
            return Err("[ERROR] failed to convert JSON-2-String".to_string().into())
        }
    };
    return Ok(serde_wasm_bindgen::to_value(&result)?);
}
