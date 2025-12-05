use lsp_server::{ExtractError, Message, Notification, Request, RequestId, Response};
use serde_json;
use lsp_types::{
    CompletionItem, CompletionResponse,
    CompletionParams
};

pub fn completion_handler(id:&RequestId ,params:CompletionParams)->serde_json::Value{
        eprintln!("got completion request #{}: {:?}", id, params);
        let sample_responses = vec![
            CompletionItem::new_simple(
                "MOV".to_string(),
                "Move instruction".to_string(),
            ),
            CompletionItem::new_simple(
                "SUB".to_string(),
                "Subtract instruction".to_string(),
            ),
            CompletionItem::new_simple("ADD".to_string(), "Add values".to_string()),
        ];
        let result = CompletionResponse::Array(sample_responses);
        let result = serde_json::to_value(&result).unwrap();
        return result;
}       
