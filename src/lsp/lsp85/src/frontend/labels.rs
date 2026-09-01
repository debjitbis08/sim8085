use crate::frontend::lexer::Lexer;
use crate::frontend::token::{Token, TokenType};

#[derive(Debug, Clone, PartialEq)]
pub struct LabelInfo {
    pub name: String,
    pub line: u32,
    pub start_col: u32,
    pub end_col: u32,
}

pub fn collect_labels_from_text(text: &str) -> (Vec<LabelInfo>, Vec<LabelInfo>) {
    let mut defs = Vec::new();
    let mut refs = Vec::new();

    for (line_idx, line) in text.lines().enumerate() {
        let lexer = match Lexer::new(line.to_string(), line_idx) {
            Ok(l) => l,
            Err(_) => continue,
        };

        let line_tokens: Vec<Token> = lexer
            .filter(|t| !matches!(t.tok_type, TokenType::EOL | TokenType::EOF))
            .collect();

        if line_tokens.is_empty() {
            continue;
        }

        let first_tok = &line_tokens[0];
        let mut has_def = false;

        if first_tok.tok_type == TokenType::LABEL {
            let start_col = (first_tok.location.col - first_tok.offset) as u32;
            let end_col = (first_tok.location.col) as u32;
            defs.push(LabelInfo {
                name: first_tok.tok_literal.clone(),
                line: line_idx as u32,
                start_col,
                end_col,
            });
            has_def = true;
        }

        let start_idx = if has_def { 1 } else { 0 };
        for tok in line_tokens.iter().skip(start_idx) {
            if tok.tok_type == TokenType::LABEL {
                let start_col = (tok.location.col - tok.offset) as u32;
                let end_col = (tok.location.col) as u32;
                refs.push(LabelInfo {
                    name: tok.tok_literal.clone(),
                    line: line_idx as u32,
                    start_col,
                    end_col,
                });
            }
        }
    }

    (defs, refs)
}
