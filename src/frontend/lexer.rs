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
    pub fn next(&mut self){
        println!("{:?}",self);
        self.consume();
        println!("{:?}",self);
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
    pub fn read_identifier(&mut self){

    }
}

