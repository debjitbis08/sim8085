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

#[derive(Debug,PartialEq)]
pub struct Tree{
    pub l_child: Option<Node>,
    pub r_child: Option<Node>,
}

impl Tree {
    pub fn default()->Self{
        Self{
            l_child:None,
            r_child:None,
        }
    }

    pub fn new(l_child:Option<Node>,r_child: Option<Node>)->Self{
        Self{
            l_child,
            r_child
        }
    }
}
#[derive(Debug,PartialEq)]
pub struct Node {
    pub value: Token,
    pub branch: Box<Tree>
}

impl Node {
    pub fn new(tok_val: Token, branch: Box<Tree>)->Self{
        Self{
            value: tok_val,
            branch
        }
    }
}

impl Parser {
    pub fn parse_expression(&mut self) {
        if let Some(peeked_token) = self.tok_stream.peek(){
            match peeked_token {
                Token{tok_type: TokenType::OPERATION,..}=>{
                    self.parse_operation();
                },
                Token{tok_type: TokenType::REGISTER,..}=>{
                    self.parse_register();
                },
            }
        }
    }
    pub fn parse_operation(){

    }
}
