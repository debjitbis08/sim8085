#[derive(Debug, Copy, Clone, PartialEq)]
pub struct Location {
    pub row: usize,
    pub col: usize,
}
impl Location {
    pub fn new(row: usize, col: usize) -> Self {
        Self { row, col }
    }
}

#[derive(Debug,Clone,PartialEq)]
pub struct Token {
    pub tok_literal: String,
    pub tok_type: TokenType,
    pub location: Location,
    pub offset: usize, // -ve char offset
}

impl Token {
    pub fn new(
        offset: usize,
        tok_type: TokenType,
        location: Location,
        tok_literal: String,
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
#[derive(Debug,Copy,Clone,PartialEq)]
pub enum TokenType {
    OPERATION,
    IMM_VALUE,
    REGISTER,
    COMMA_DELIM,
    BOL,
    EOL,
    EOF,
    ILLEGAL,
}
