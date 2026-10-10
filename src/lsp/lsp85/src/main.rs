mod frontend;
mod server;

use lsp_server::{ExtractError, Message, Notification, Response};
use lsp_types::request::{Completion, HoverRequest, SignatureHelpRequest};
use server::{handlers, Lsp85};
use std::error::Error;

use crate::server::handlers::diagnostic_handler;

pub fn main() -> Result<(), Box<dyn Error>> {
    let lsp = Lsp85::build()
        .stdio()
        .enable_hover()
        .enable_completion()
        .enable_diagnostics()
        .enable_signature_help()
        .initialize();

    let lsp = match lsp {
        Ok(lsp) => lsp,
        Err(e) => {
            eprintln!("init failed: {:?}", e);
            return Err(e);
        }
    };

    let conn = match lsp.conn.as_ref() {
        Some(conn) => conn,
        None => {
            eprintln!("no conn");
            return Err("no conn".into());
        }
    };

    for msg in &conn.receiver {
        eprintln!("Message incoming: {:?}", msg);
        match msg {
            Message::Request(req) => {
                let down = match conn.handle_shutdown(&req) {
                    Ok(true) => true,
                    Ok(false) => false,
                    Err(e) => {
                        eprintln!("error: {:?}", e);
                        false
                    }
                };
                if down {
                    eprintln!("shutting down!");
                    return Ok(());
                }
                eprintln!("got request: {:?}", req);

                let _ = lsp_router!(req,lsp,{
                    Completion=>handlers::completion_handler,
                    HoverRequest=>handlers::hover_handler,
                    SignatureHelpRequest=>handlers::signature_help_handler,
                });
            }
            Message::Response(rs) => {
                eprintln!("response: {:?}", rs);
            }
            Message::Notification(n) => {
                match &n {
                    Notification { method, params } => {
                        if *method == String::from("textDocument/didSave") {
                            eprintln!("Document saved!, running diagnostics!");
                            let result = diagnostic_handler(params)?;
                            conn.sender
                                .send(Message::Notification(lsp_server::Notification {
                                    method: "textDocument/publishDiagnostics".to_string(),
                                    params: result,
                                }))?;
                        } else if *method == String::from("textDocument/signatureHelp") {
                        } else {
                            eprintln!("unimplemented");
                        }
                    }
                }
                eprintln!("notification: {:?}", n);
            }
        }
    }

    if let Some(io_threads) = lsp.io_threads {
        if let Err(e) = io_threads.join() {
            eprintln!("Error joining IO threads: {:?}", e);
        }
    }

    Ok(())
}
