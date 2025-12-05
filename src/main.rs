mod frontend;
mod server;

// use frontend::lexer::Lexer;
// use frontend::parser::{Parser,Node};
// use frontend::token::{Token, TokenType,Location};
// use frontend::utils::files::get_source_buffer;

use lsp_server::{ExtractError, Message, Notification, Request, RequestId, Response};
use lsp_types::{
    CompletionItem, CompletionResponse,
    request::{Completion,HoverRequest},
};
use server::{lsp85,routers,handlers};
use std::error::Error;

fn main() -> Result<(), Box<dyn Error + Sync + Send>> {

    let lsp = lsp85::build()
                .stdio()
                .enable_hover()
                .enable_completion()
                .initialize();

    if let Ok(lsp) = lsp{
    for msg in &lsp.conn.as_ref().unwrap().receiver {
        eprintln!("Message incoming: {:?}",msg);
        match msg {
            Message::Request(req) => {
                if lsp.conn.as_ref().unwrap().handle_shutdown(&req)? {
                    eprintln!("shutting down!");
                    return Ok(());
                }
                eprintln!("got request: {:?}", req);
                


                // let req = match cast::<Completion>(req) {
                //     Ok((id, params)) => {
                //         eprintln!("got completion request #{}: {:?}", id, params);
                //         let sample_responses = vec![
                //             CompletionItem::new_simple(
                //                 "MOV".to_string(),
                //                 "Move instruction".to_string(),
                //             ),
                //             CompletionItem::new_simple(
                //                 "SUB".to_string(),
                //                 "Subtract instruction".to_string(),
                //             ),
                //             CompletionItem::new_simple("ADD".to_string(), "Add values".to_string()),
                //         ];
                //         let result = CompletionResponse::Array(sample_responses);
                //         let result = serde_json::to_value(&result).unwrap();
                //         let resp = Response {
                //             id,
                //             result: Some(result),
                //             error: None,
                //         };
                //         lsp.conn.as_ref().unwrap().sender.send(Message::Response(resp))?;
                //         continue;
                //     }
                //     Err(err @ ExtractError::JsonError { .. }) => panic!("{:?}", err),
                //     Err(ExtractError::MethodMismatch(req)) => req,
                // };
                lsp_router!(req,lsp,{
                        Completion=>handlers::completion_handler,
                        HoverRequest=>handlers::hover_handler,
                    });
                // let req = match cast::<lsp_types::request::HoverRequest>(req) {
                //     Ok((id, params)) => {
                //     }
                //     Err(err @ ExtractError::JsonError { .. }) => panic!("{:?}", err),
                //     Err(ExtractError::MethodMismatch(req)) => req,
                // };
            }
            Message::Response(rs) => {
                eprintln!("response: {:?}", rs);
            }
            Message::Notification(n) => {
                match &n {
                    Notification { method, .. }
                        if *method == String::from("textDocument/didSave") =>
                    {
                        eprintln!("File saved!");
                    }
                    e => {
                        eprintln!("unimplemented {:?}", e);
                    }
                }
                eprintln!("notification: {:?}", n);
            }
        }
    }
    lsp.io_threads.unwrap().join()?;

    }else if let Err(e) = lsp{
        eprintln!("{:?}",e);
        return Err(e);
    }


    Ok(())

    // if let Some(source) = get_source_buffer("test_value.asm") {
    //     // buffered reading
    //     let mut ast_list: Vec<Option<Node>> = vec![];
    //     for (line_no, read_buf) in source {
    //         if let Ok(read_buf) = read_buf {
    //             let mut l = Lexer::new(read_buf, line_no);
    //             let mut tokns_buf: Vec<Token> = vec![];
    //             tokns_buf.push(Token::new(0,TokenType::BOL,Location::new(0,0),String::from("BOL")));

    //             for tok in l {
    //                 tokns_buf.push(tok);
    //             }
    //             // println!("{:?}", tokns_buf);

    //             let mut p = Parser::new(tokns_buf.into_iter());
    //             ast_list.push(p.parse_expression());
    //         } else {
    //             println!("Error reading!");
    //         }
    //         println!("{:?}",ast_list);
    //     }
    // }
}

fn cast<R>(req: Request) -> Result<(RequestId, R::Params), ExtractError<Request>>
where
    R: lsp_types::request::Request,
    R::Params: serde::de::DeserializeOwned,
{
    req.extract(R::METHOD)
}
