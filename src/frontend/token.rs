#[derive(Debug, Copy, Clone,PartialEq)]
pub struct Location {
    pub row: i32,
    pub col: i32,
}
impl Location {
    pub fn new(row: i32, col: i32) -> Self {
        Self { row, col }
    }
}

#[derive(Debug,PartialEq)]
pub struct Token {
    pub tok_literal: String,
    pub tok_type: TokenType,
    pub location: Location,
    pub offset: usize, // -ve char offset
}

impl Token {
    pub fn new(
        tok_literal: String,
        tok_type: TokenType,
        location: Location,
        offset: usize,
    ) -> Self {
        Self {
            tok_literal,
            tok_type,
            location,
            offset,
        }
    }
}

// ADD A,B
//
// INSTRUCTION
// OPERATION REGISTER COMMA_DELIM REGISTER
//
#[derive(Debug,PartialEq)]
pub enum TokenType {
    OPERATION,
    IMM_VALUE,
    REGISTER,
    REGISTER_PAIR,
    COMMA_DELIM,
    EOL,
    EOF,
    ILLEGAL,
}
