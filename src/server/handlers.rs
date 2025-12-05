use lsp_server::{ExtractError, Message, Notification, Request, RequestId, Response};
use serde_json;
use lsp_types::{
    CompletionItem, CompletionResponse,
    CompletionParams,
    HoverParams,

};

pub fn completion_handler(id:&RequestId ,params:CompletionParams)->serde_json::Value{
        eprintln!("got completion request #{}: {:?}", id, params);
        let responses = vec![
            CompletionItem::new_simple(
                "MOV".to_string(),
                "This instruction copies the content of the source register into destination register.".to_string(),
            ),
            CompletionItem::new_simple(
                "MVI".to_string(),
                "The 8-bit data is stored in the destination register of memory.".to_string(),
            ),
            CompletionItem::new_simple(
                "LDA".to_string(),
                "The contents of a memory location, specified by a 16-bit address in the operand, are copied to the accumulator.".to_string(),
            ),
            CompletionItem::new_simple(
                "LDAX".to_string(),
                "The contents of the designated register pair point to a memory location. This instruction copies the contents of that memory location into the accumulator.".to_string(),
            ),
            CompletionItem::new_simple(
                "LXI".to_string(),
                "The instruction loads 16-bit data in the register pair designated in the operand.".to_string(),
            ),
            CompletionItem::new_simple(
                "LHLD".to_string(),
                "The instruction copies the contents of the memory location pointed out by the 16-bit address into the register L and copies the contents of the next memory location into register H. The contents of the source memory are not altered.".to_string(),
            ),
            CompletionItem::new_simple(
                "SUB".to_string(),
                "Subtract instruction".to_string(),
            ),
            CompletionItem::new_simple(
                "ADD".to_string(),
                "Add values".to_string(),
            ),
        ];
        let result = CompletionResponse::Array(responses);
        let result = serde_json::to_value(&result).unwrap();
        return result;
}       
pub fn hover_handler(id:&RequestId ,params:HoverParams)->serde_json::Value{
            eprintln!("hovr request {}: {:?}", id, params);

            let hover_result = lsp_types::Hover {
                contents: lsp_types::HoverContents::Scalar(
                    lsp_types::MarkedString::String("dummy hover info".to_string()),
                ),
                range: None,
            };

            let result = serde_json::to_value(&hover_result).unwrap();
            return result;
}       
