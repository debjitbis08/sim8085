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
                            // 
                            //
    pub location: Location,     // current location 
}

impl Lexer{
    pub fn new(source: String)->Self{
        Self{
            source:source.clone(),
            ch: source.chars().nth(0).expect("source of size <1?"),
            curr_position: 0,
            read_position: 1,
            location:Location{row: 0,col: 0},
        }
    }
}

impl Lexer{
    pub fn next(&mut self)->Token{
        match self.ch {
            c if self.ch.is_alphabetic() =>{ 
                // identifier
                return self.read_identifier();
            },
            c if self.ch.is_numeric() =>{
                return self.read_immediate();
            }
            ',' =>{
                self.consume();
                return Token::new(String::from(','),TokenType::COMMA_DELIM);
            },
            ' '=>{
                self.consume();
                return self.next();
            },
            '\n'=>{
                self.consume();
                return Token::new(String::from('\0'),TokenType::EOL);
            },
            '\0'=>{
                return Token::new(String::from('\0'),TokenType::EOF);
            },
            _=>{
                self.consume();
                return Token::new(String::from('\0'),TokenType::ILLEGAL);
            },
        }
    }
    pub fn consume(&mut self){
        if self.read_position >= self.source.len(){
            self.ch = '\0';
        }else{
            self.ch = self.source.chars().nth(self.read_position).unwrap_or(' ');
        }
        self.curr_position = self.read_position;
        self.read_position = self.curr_position + 1;

        self.location.col += 1;
        self.location.row = 0;
    }
    pub fn read_identifier(&mut self)->Token{
        let mut identifier_buf = String::from("");
        while self.ch.is_alphabetic(){
            identifier_buf += &self.ch.to_string();
            self.consume();
        }
        return Token::new(identifier_buf.clone(),get_identifier_token(&identifier_buf));
    }
    pub fn read_immediate(&mut self)->Token{
        let mut immediate_buf = String::from("");
        while self.ch.is_numeric(){
            immediate_buf += &self.ch.to_string();
            self.consume();
        }
        return Token::new(immediate_buf.clone(),TokenType::IMM_VALUE);
    }
}
fn get_identifier_token(identifier_lit: &String)->TokenType{
    match identifier_lit.as_str(){
        "ADD" => {
            return TokenType::OPERATION; 
        }
        "A"
        |"B"
        |"C"
        |"D"
        |"E"
        |"PSW"
        |"H"
        |"L"
        =>{
            return TokenType::REGISTER;
        }
        _=>{
            return TokenType::ILLEGAL;
        }
    }
}

