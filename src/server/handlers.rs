use lsp_server::{ExtractError, Message, Notification, Request, RequestId, Response};
use lsp_types::{
    CompletionItem, CompletionResponse,
    request::Completion,
};

pub fn completion_handler(id,params)->T
    where T:CompletionResponse::Array{
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
        return result;
}       
