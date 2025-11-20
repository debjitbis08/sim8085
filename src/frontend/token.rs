#[derive(Debug)]
pub struct Token {
    tok_literal: String,
    tok_type: TokenType,
}

impl Token{
    pub fn new(tok_literal: String,tok_type: TokenType)->Self{
        Self{
            tok_literal,
            tok_type,
        }
    }
}

// ADD A,B
//
// INSTRUCTION
// OPERATION REGISTER COMMA_DELIM REGISTER
//
#[derive(Debug)]
pub enum TokenType{
    OPERATION,
    IMM_VALUE,
    REGISTER,
    COMMA_DELIM,
    EOL,
    EOF,
    ILLEGAL,
}
