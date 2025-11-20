mod frontend;

use frontend::lexer::{Lexer};
use frontend::token::{Token,TokenType};

fn main() {
    let mut l = Lexer::new(String::from("ADD A,50\nADD B,D"));
    println!("{:?}",l.next());
    println!("{:?}",l.next());
    println!("{:?}",l.next());
    println!("{:?}",l.next());
    println!("{:?}",l.next());
    println!("{:?}",l.next());
    println!("{:?}",l.next());
    println!("{:?}",l.next());
    println!("{:?}",l.next());
    println!("{:?}",l.next());
}
