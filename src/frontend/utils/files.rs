use std::fs::File;
use std::io::Read;

pub fn get_raw_source(f_name: &'static str) -> Option<String> {
    let mut f_contents = String::from("");
    let mut f = File::open(f_name);
    if let Ok(mut f) = f {
        if let Ok(_) = f.read_to_string(&mut f_contents) {
            return Some(f_contents);
        } else {
            return None;
        }
    } else {
        return None;
    }
}
