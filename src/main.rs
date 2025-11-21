mod frontend;

use frontend::lexer::{Lexer};
use frontend::token::{Token,TokenType};
use frontend::utils::files::get_raw_source;

fn main(){
    if let Some(source) = get_raw_source("test_value.asm"){
        let mut l = Lexer::new(source);
        let mut tokns_buf : Vec<Token> = vec![];
        for tok in l {
            tokns_buf.push(tok);
        }
        println!("{:?}",tokns_buf);
    }
}
