use crate::frontend::token::{Token, TokenType};
use std::iter::Peekable;
use std::vec::IntoIter;

struct Parser {
    tok_stream: Peekable<IntoIter<Token>>,
}
impl Parser {
    pub fn new(tok_stream: IntoIter<Token>) -> Self {
        Self {
            tok_stream: tok_stream.peekable(),
        }
    }
}
