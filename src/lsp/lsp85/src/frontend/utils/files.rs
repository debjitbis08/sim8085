use std::fs::File;
use std::io;
use std::io::BufRead;
use std::io::BufReader;
use std::io::Lines;
use std::iter::Enumerate;

#[allow(dead_code)]
pub fn get_source_buffer(f_name: & str) -> Option<Enumerate<Lines<BufReader<File>>>> {
    let file = File::open(f_name).ok()?;
    let buffer = BufReader::new(file);
    let lines = buffer.lines().enumerate();
    return Some(lines);
}

pub fn get_source_line(f_name: &str,line: u32) ->Option<Result<String,io::Error>>{
    let file = File::open(f_name).ok()?;
    let buffer = BufReader::new(file);
    let lines = buffer.lines().nth(line as usize);
    return lines;
}
