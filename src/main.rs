mod frontend;
mod server;

// use frontend::lexer::Lexer;
// use frontend::parser::{Parser,Node};
// use frontend::token::{Token, TokenType,Location};
// use frontend::utils::files::get_source_buffer;

use lsp_server::{Connection, Message, Notification, Request, Response};
use lsp_types::{
    ClientCapabilities, CompletionItem, CompletionOptions, CompletionResponse, InitializeParams,
    ServerCapabilities,
};
use std::error::Error;

fn main() -> Result<(), Box<dyn Error + Sync + Send>> {
    let (connection, io_threads) = Connection::stdio();

    let (id, params) = connection.initialize_start()?;
    eprintln!("Connection initialized!");

    let init_params: InitializeParams = serde_json::from_value(params).unwrap();
    let client_capabilities: ClientCapabilities = init_params.capabilities;
    let mut server_capabilities = ServerCapabilities::default();

    server_capabilities.completion_provider = Some(CompletionOptions::default());

    let initialize_data = serde_json::json!({
        "capabilities": server_capabilities,
        "serverInfo": {
            "name":"lsp85",
            "version":"0.1",
        }
    });
    connection.initialize_finish(id, initialize_data)?;

    for msg in &connection.receiver {
        match &msg {
            Message::Request(req) => {
                match req {
                    Request { method, .. } if *method == String::from("Close") => {
                        eprintln!("Close called!");
                    }
                    Request { method, .. }
                        if *method == String::from("textDocument/completion") =>
                    {
                        eprintln!("Close called!");
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
                        let resp = Response::new_ok(
                            req.id.clone(),
                            CompletionResponse::Array(sample_responses),
                        );
                        connection.sender.send(Message::Response(resp))?;
                    }
                    e => {
                        eprintln!("unimplemented {:?}", e)
                    }
                }
                eprintln!("request: {:?}", req);
            }
            Message::Response(rs) => {
                eprintln!("response: {:?}", rs);
            }
            Message::Notification(n) => {
                match n {
                    Notification { method, .. }
                        if *method == String::from("textDocument/didSave") =>
                    {
                        eprintln!("File saved!");
                    }
                    e => {
                        eprintln!("unimplemented {:?}", e)
                    }
                }
                eprintln!("notification: {:?}", n);
            }
        }
    }

    io_threads.join()?;
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
