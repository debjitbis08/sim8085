mod frontend;

use frontend::lexer::{Lexer};
use frontend::token::{Token,TokenType};

fn main() {
    let mut l = Lexer::new(String::from("Hello, world!\n"));
    println!("{:?}",l.next());
}
