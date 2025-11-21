mod frontend;

use frontend::lexer::{Lexer};
use frontend::token::{Token,TokenType};
use frontend::utils::files::get_raw_source;

fn main(){
    if let Some(source) = get_raw_source("test_value.asm"){
        let mut l = Lexer::new(source);
        println!("{:?}",l.next());
        println!("{:?}",l.next());
        println!("{:?}",l.next());
        println!("{:?}",l.next());
    }
}
