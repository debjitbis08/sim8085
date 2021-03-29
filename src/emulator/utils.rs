use crate::types::{State8085, RegM, RegPair, Addr};
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
    usize::try_from(((h as u16) << 8) | (l as u16)).unwrap()
}

pub fn read_memory(high: u8, low: u8, state: &State8085) -> u8 {
    state.read_memory(get_memory_reference(high, low))
}

pub fn read_memory_at(addr: Addr, state: &State8085) -> u8 {
    read_memory(addr.high, addr.low, state)
}

pub fn read_memory_with_offset(offset: u8, high: u8, low: u8, state: &State8085) -> u8 {
    state.read_memory(get_memory_reference(high, low) + usize::try_from(offset).unwrap())
}

pub fn write_memory(high: u8, low: u8, byte: u8, state: &mut State8085) {
    state.write_memory(get_memory_reference(high, low), byte);
}

pub fn write_memory_at(addr: Addr, byte: u8, state: &mut State8085) {
    write_memory(addr.high, addr.low, byte, state);
}

pub fn write_memory_with_offset(offset: u8, high: u8, low: u8, byte: u8, state: &mut State8085) {
    state.write_memory(get_memory_reference(high, low) + usize::try_from(offset).unwrap(), byte);
}

pub fn parity(x: u8) -> bool {
    x.count_ones() % 2 == 0
}

pub fn read_register(reg: RegM, state: &State8085) -> u8 {
    match reg {
        A => state.cpu.a,
        B => state.cpu.b,
        C => state.cpu.c,
        D => state.cpu.d,
        E => state.cpu.e,
        H => state.cpu.h,
        L => state.cpu.l,
        M => read_memory(state.cpu.h, state.cpu.l, state)
    }
}

pub fn read_register_pair(regPair: RegPair, state: &mut State8085) -> u16 {
    match regPair {
        B => bytes_to_word(state.cpu.b, state.cpu.c),
        D => bytes_to_word(state.cpu.d, state.cpu.e),
        H => bytes_to_word(state.cpu.h, state.cpu.l),
        SP => state.cpu.sp,
    }
}

pub fn read_register_pair_as_tuple(regPair: RegPair, state: &mut State8085) -> (u8, u8) {
    match regPair {
        B => (state.cpu.b, state.cpu.c),
        D => (state.cpu.d, state.cpu.e),
        H => (state.cpu.h, state.cpu.l),
        SP => {
            let data = state.cpu.sp.to_be_bytes();

            (data[1], data[0])
        },
    }
}

pub fn write_register_pair_from_tuple(regPair: RegPair, data: (u8, u8), state: &mut State8085) {
    match regPair {
        B => {
            state.cpu.b = data.0;
            state.cpu.c = data.1;
        },
        D => {
            state.cpu.d = data.0;
            state.cpu.e = data.1;
        },
        H => {
            state.cpu.h = data.0;
            state.cpu.l = data.1;
        },
        SP => {
            state.cpu.sp = bytes_to_word(data.0, data.1);
        },
    }
}

pub fn get_addr(addr: Addr) -> u16 {
    return bytes_to_word(addr.high, addr.low);
}

pub fn addr_to_word(addr: Addr) -> u16 {
    return bytes_to_word(addr.high, addr.low);
}

pub fn addr_from_word(word: u16) -> Addr {
    let bytes = word.to_be_bytes();

    Addr {
        high: bytes[1],
        low: bytes[0]
    }
}

pub fn bytes_to_word(high: u8, low: u8) -> u16 {
    ((high as u16) << 8 ) | (low as u16)
}

pub fn flag_to_byte(flag: bool) -> u8 {
    if flag { 1 } else { 0 }
}