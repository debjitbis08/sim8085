use std::fs::File;
use std::io::BufRead;
use std::io::BufReader;
use std::io::Lines;
use std::io::Read;
use std::iter::Enumerate;

pub fn get_source_buffer(f_name: &'static str) -> Option<Enumerate<Lines<BufReader<File>>>> {
    let file = File::open(f_name).ok()?;
    let buffer = BufReader::new(file);
    let lines = buffer.lines().enumerate();
    return Some(lines);
}
