mod frontend;

use frontend::lexer::Lexer;
use frontend::parser::{Parser,Node};
use frontend::token::{Token, TokenType,Location};
use frontend::utils::files::get_source_buffer;

fn main() {
    if let Some(source) = get_source_buffer("test_value.asm") {
        // buffered reading
        let mut ast_list: Vec<Option<Node>> = vec![];
        for (line_no, read_buf) in source {
            if let Ok(read_buf) = read_buf {
                let mut l = Lexer::new(read_buf, line_no);
                let mut tokns_buf: Vec<Token> = vec![];
                tokns_buf.push(Token::new(0,TokenType::BOL,Location::new(0,0),String::from("BOL")));

                for tok in l {
                    tokns_buf.push(tok);
                }
                // println!("{:?}", tokns_buf);

                let mut p = Parser::new(tokns_buf.into_iter());
                ast_list.push(p.parse_expression());
            } else {
                println!("Error reading!");
            }
            println!("{:?}",ast_list);
        }
    }
}
