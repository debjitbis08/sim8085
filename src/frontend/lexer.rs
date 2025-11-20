use crate::frontend::token::{TokenType,Token};

#[derive(Debug)]
struct Location{
    row: i64,
    col: i64,
}

#[derive(Debug)]
pub struct Lexer{
    pub source: String,         // source string
    pub ch : char,              // current literal
    pub curr_position: usize,   // current position
    pub read_position: usize,   // next position
    pub location: Location,     // current location 
}
