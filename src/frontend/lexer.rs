use crate::frontend::token::{TokenType,Token,Location};
#[derive(Debug)]
pub struct Lexer{
    pub source: String,         // source string
    pub ch : char,              // current literal
    pub curr_position: usize,   // current position
    pub read_position: usize,   // next position
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

impl Iterator for Lexer{
    type Item = Token; 
    fn next(&mut self)->Option<Token>{
        match self.ch {
            c if self.ch.is_alphabetic() =>{ 
                // identifier
                return Some(self.read_identifier());
            },
            c if self.ch.is_numeric() =>{
                return Some(self.read_immediate());
            }
            ',' =>{
                self.consume();
                return Some(Token::new(String::from(','),TokenType::COMMA_DELIM,self.location,1));
            },
            ' '=>{
                self.consume();
                return self.next();
            },
            '\n'=>{

                self.location.col = 0;
                self.location.row += 1;
                self.consume();
                return Some(Token::new(String::from('\n'),TokenType::EOL,self.location,1));
            },
            '\0'=>{
                return None;
            },
            _=>{
                self.consume();
                return Some(Token::new(String::from('\0'),TokenType::ILLEGAL,self.location,1));
            },
        }
    }
}
impl Lexer {
    pub fn consume(&mut self){
        if self.read_position >= self.source.len(){
            self.ch = '\0';
        }else{
            self.ch = self.source.chars().nth(self.read_position).unwrap_or(' ');
        }
        self.curr_position = self.read_position;
        self.read_position = self.curr_position + 1;
        self.location.col += 1;
    }
    pub fn read_identifier(&mut self)->Token{
        let mut identifier_buf = String::from("");
        while self.ch.is_alphabetic(){
            identifier_buf += &self.ch.to_string();
            self.consume();
        }
        return Token::new(identifier_buf.clone(),get_identifier_token(&identifier_buf),self.location,identifier_buf.len());
    }
    pub fn read_immediate(&mut self)->Token{
        let mut immediate_buf = String::from("");
        while self.ch.is_numeric(){
            immediate_buf += &self.ch.to_string();
            self.consume();
        }
        return Token::new(immediate_buf.clone(),TokenType::IMM_VALUE,self.location,immediate_buf.len());
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
