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

#[derive(Debug, PartialEq)]
pub struct Tree {
    pub l_child: Option<Node>,
    pub r_child: Option<Node>,
}

impl Tree {
    pub fn default() -> Self {
        Self {
            l_child: None,
            r_child: None,
        }
    }

    #[allow(dead_code)]
    pub fn new(l_child: Option<Node>, r_child: Option<Node>) -> Self {
        Self { l_child, r_child }
    }
}

#[derive(Debug, PartialEq)]
pub struct Node {
    pub value: Token,
    pub branch: Box<Tree>,
}

impl Node {
    pub fn new(tok_val: Token, branch: Box<Tree>) -> Self {
        Self {
            value: tok_val,
            branch,
        }
    }
}

pub fn expected_operand_count(op: &str) -> usize {
    match op.to_uppercase().as_str() {
        "NOP" | "HLT" | "RET" | "RLC" | "RRC" | "RAL" | "RAR" | "CMA" | "STC" | "CMC"
        | "DAA" | "XCHG" | "XTHL" | "SPHL" | "PCHL" | "EI" | "DI" | "RZ" | "RNZ" | "RC"
        | "RNC" | "RPE" | "RPO" | "RP" | "RM" | "RIM" | "SIM" => 0,

        "ADD" | "ADC" | "SUB" | "SBB" | "ANA" | "ORA" | "XRA" | "CMP" | "INR" | "DCR"
        | "PUSH" | "POP" | "DAD" | "INX" | "DCX" | "LDAX" | "STAX" | "ADI" | "ACI"
        | "SUI" | "SBI" | "ANI" | "ORI" | "XRI" | "CPI" | "JMP" | "JZ" | "JNZ" | "JC"
        | "JNC" | "JPE" | "JPO" | "JP" | "JM" | "CALL" | "CZ" | "CNZ" | "CC" | "CNC"
        | "CPE" | "CPO" | "CP" | "CM" | "STA" | "LDA" | "SHLD" | "LHLD" | "OUT" | "IN"
        | "RST" => 1,

        "MOV" | "MVI" | "LXI" => 2,

        _ => 0,
    }
}

impl Parser {
    pub fn parse_expression(&mut self) -> Option<Node> {
        while let Some(peeked_token) = self.tok_stream.peek() {
            match peeked_token.tok_type {
                TokenType::OPERATION => return self.parse_operation(),
                TokenType::EOF | TokenType::EOL => {
                    self.tok_stream.next();
                }
                _ => {
                    self.tok_stream.next();
                }
            }
        }
        None
    }

    pub fn parse_operation(&mut self) -> Option<Node> {
        let op_tok = match self.tok_stream.peek() {
            Some(t) if t.tok_type == TokenType::OPERATION => t.clone(),
            _ => return None,
        };
        self.tok_stream.next();

        let mut node = Node::new(op_tok.clone(), Box::new(Tree::default()));
        let expected = expected_operand_count(&op_tok.tok_literal);

        if expected >= 1 {
            node.branch.l_child = self.parse_operand();
        }
        if expected >= 2 {
            node.branch.r_child = self.parse_operand();
        }

        Some(node)
    }

    pub fn parse_operand(&mut self) -> Option<Node> {
        while let Some(peeked_token) = self.tok_stream.peek() {
            match peeked_token.tok_type {
                TokenType::REGISTER | TokenType::ImmValue | TokenType::LABEL => {
                    let token_buffer = peeked_token.clone();
                    self.tok_stream.next();
                    return Some(Node::new(token_buffer, Box::new(Tree::default())));
                }
                TokenType::CommaDelim => {
                    self.tok_stream.next();
                    continue;
                }
                _ => return None,
            }
        }
        None
    }
}
