use crate::types::State8085;
use std::convert::TryFrom;

pub fn set_panic_hook() {
    // When the `console_error_panic_hook` feature is enabled, we can call the
    // `set_panic_hook` function at least once during initialization, and then
    // we will get better error messages if our code ever panics.
    //
    // For more details see
    // https://github.com/rustwasm/console_error_panic_hook#readme
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

pub fn get_memory_reference (h: u8, l: u8) -> usize {
    return usize::try_from((h << 8) | (l)).unwrap();
}

pub fn read_memory(high: u8, low: u8, state: &State8085) -> u8 {
    return state.memory[get_memory_reference(high, low)];
}

pub fn read_memory_with_offset(offset: u8, high: u8, low: u8, state: &State8085) -> u8 {
    return state.memory[get_memory_reference(high, low) + usize::try_from(offset).unwrap()];
}

pub fn write_memory(high: u8, low: u8, byte: u8, state: &mut State8085) {
    state.memory[get_memory_reference(high, low)] = byte;
}

pub fn write_memory_with_offset(offset: u8, high: u8, low: u8, byte: u8, state: &mut State8085) {
    state.memory[get_memory_reference(high, low) + usize::try_from(offset).unwrap()] = byte;
}
