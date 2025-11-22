mod frontend;

use frontend::lexer::Lexer;
use frontend::parser::Parser;
use frontend::token::{Token, TokenType};
use frontend::utils::files::get_source_buffer;

fn main() { 

    if let Some(source) = get_source_buffer("test_value.asm") {
        // buffered reading
        for (line_no,read_buf) in source {
            if let Ok(read_buf) = read_buf{

                let mut l = Lexer::new(read_buf,line_no);
                let mut tokns_buf: Vec<Token> = vec![];
                for tok in l {
                    tokns_buf.push(tok);
                }
                println!("{:?}", tokns_buf);

                let mut p = Parser::new(tokns_buf.into_iter());

            }else {
                println!("Error reading!");
            }
        }
    }

}
