use crate::frontend::token::{Token, TokenType};
use std::iter::Peekable;
use std::vec::IntoIter;

#[derive(Debug)]
pub struct Parser {
    tok_stream: Peekable<IntoIter<Token>>,
}
impl Parser {
    pub fn new(tok_stream: IntoIter<Token>) -> Self {
        Self {
            tok_stream: tok_stream.peekable(),
        }
    }
}

pub struct Tree{
    l_child: Option<Node>,
    r_child: Option<Node>,
}

pub struct Node{
    val: Token,
    branch: Box<Tree>,
}


impl Parser{
    pub fn parse(){

    }
}
