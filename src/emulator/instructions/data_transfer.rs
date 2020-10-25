use crate::utils;
use crate::types::State8085;
use crate::types::RegM;
use crate::types::RegPair;

fn read_ref(operand: RegM, state: &State8085) -> u8 {
    match operand {
        A => state.a,
        B => state.b,
        C => state.c,
        D => state.d,
        E => state.e,
        H => state.h,
        L => state.l,
        M => utils::read_memory(state.h, state.l, state)
    }
}

fn read_reg_pair(pair: RegPair, state: &State8085) -> (u8, u8) {
    return match pair {
        B => (state.b, state.c),
        D => (state.d, state.e),
        H => (state.h, state.l),
        SP => {
            let [h, l] = state.sp.to_be_bytes();
            (h, l)
        },
    }
}

fn copy_byte_to(to: RegM, byte: u8, state: &mut State8085) {
    match to {
        A => state.a = byte,
        B => state.b = byte,
        C => state.c = byte,
        D => state.d = byte,
        E => state.e = byte,
        H => state.h = byte,
        L => state.l = byte,
        M => state.memory[utils::get_memory_reference(state.h, state.l)] = byte,
    }
}

fn copy_word_to(to: RegPair, high: u8, low: u8, state: &mut State8085) {
    match to {
        B => {
            state.b = high;
            state.c = low;
        },
        D => {
            state.d = high;
            state.e = low;
        },
        H => {
            state.h = high;
            state.l = low;
        },
        SP => state.sp = ((high.into(): u16) << 8) | (low.into(): u16),
    }
}

pub fn mov(to: RegM, from: RegM, state: &mut State8085) {
    copy_byte_to(to, read_ref(from, state), state);
}

pub fn mvi(to: RegM, byte: u8, state: &mut State8085) {
    copy_byte_to(to, byte, state);
    state.pc += 1;
}

pub fn lda(high: u8, low: u8, state: &mut State8085) {
    copy_byte_to(RegM::A, utils::read_memory(high, low, state), state);
    state.pc += 2;
}

pub fn sta(high: u8, low: u8, state: &mut State8085) {
    utils::write_memory(high, low, read_ref(RegM::A, state), state);
    state.pc += 2;
}

pub fn lhld(high: u8, low: u8, state: &mut State8085) {
    state.h = utils::read_memory_with_offset(1, high, low, state);
    state.l = utils::read_memory(high, low, state);
    state.pc += 2;
}

pub fn shld(high: u8, low: u8, state: &mut State8085) {
    utils::write_memory(high, low, state.l, state);
    utils::write_memory_with_offset(1, high, low, state.h, state);
    state.pc += 2;
}

pub fn lxi(regPair: RegPair, high: u8, low: u8, state: &mut State8085) {
    copy_word_to(regPair, high, low, state);
    state.pc += 2;
}

pub fn ldax(regPair: RegPair, state: &mut State8085) {
    let (high, low) = read_reg_pair(regPair, state);
    copy_byte_to(RegM::A, utils::read_memory(high, low, state), state);
}

pub fn stax(regPair: RegPair, state: &mut State8085) {
    let (high, low) = read_reg_pair(regPair, state);
    utils::write_memory(high, low, read_ref(RegM::A, state), state);
}

pub fn xchg(state: &mut State8085) {
    let d = state.d;
    let e = state.e;
    state.d = state.h;
    state.e = state.l;
    state.h = d;
    state.l = e;
}

pub fn xthl(state: &mut State8085) {
    let [spH, spL] = state.sp.to_be_bytes();
    let stackL = utils::read_memory(spH, spL, state);
    let stackH = utils::read_memory_with_offset(1, spH, spL, state);
    utils::write_memory(spH, spL, state.l, state);
    utils::write_memory_with_offset(1, spH, spL, state.h, state);
    state.h = stackH;
    state.l = stackL;
}
