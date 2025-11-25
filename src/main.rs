mod frontend;

// use frontend::lexer::Lexer;
// use frontend::parser::{Parser,Node};
// use frontend::token::{Token, TokenType,Location};
// use frontend::utils::files::get_source_buffer;

use lsp_server::{Connection};
use lsp_types::{InitializeParams,ClientCapabilities,ServerCapabilities};
use std::error::{Error};


fn main() -> Result<(),Box<dyn Error + Sync + Send > >{

    let (connection,io_threads) = Connection::stdio();

    let (id,params) = connection.initialize_start()?;

    let init_params: InitializeParams = serde_json::from_value(params).unwrap();
    let client_capabilities: ClientCapabilities = init_params.capabilities;
    let server_capabilities =  ServerCapabilities::default();


    let initialize_data = serde_json::json!({
        "capabilities": server_capabilities,
        "serverInfo": {
            "name":"lsp-server",
            "version":"0.1",
        }
    });
    connection.initialize_finish(id,initialize_data);


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
