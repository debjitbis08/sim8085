use crate::utils;
use crate::types::State8085;
use crate::types::RegM;
use crate::types::RegPair;

/**
 * Data Transfer Group. The data transfer instructions move data between registers or between memory and registers.
 *
 *     ---------------------------------------------------------------
 *     | MOV       | Move                                            |
 *     ---------------------------------------------------------------
 *     | MVI       | Move Immediate                                  |
 *     ---------------------------------------------------------------
 *     | LDA       | Load Accumulator Directly from Memory           |
 *     ---------------------------------------------------------------
 *     | STA       | Store Accumulator Directly in Memory            |
 *     ---------------------------------------------------------------
 *     | LHLD      | Load H and L Registers Directly from Memory     |
 *     ---------------------------------------------------------------
 *     | SHLD      | Store H and L Registers Directly in Memory      |
 *     ---------------------------------------------------------------
 *     | LXI       | Load Register Pair with Immediate data          |
 *     ---------------------------------------------------------------
 *     | LDAX      | Load Accumulator from Address in Register Pair  |
 *     ---------------------------------------------------------------
 *     | STAX      | Store Accumulator in Address in Register Pair   |
 *     ---------------------------------------------------------------
 *     | XCHG      | Exchange Hand L with D and E                    |
 *     ---------------------------------------------------------------
 *     | XTHL      | Exchange Top of Stack with Hand L               |
 *     ---------------------------------------------------------------
 */

fn read_ref(operand: RegM, state: &State8085) -> u8 {
    match operand {
        A => state.cpu.a,
        B => state.cpu.b,
        C => state.cpu.c,
        D => state.cpu.d,
        E => state.cpu.e,
        H => state.cpu.h,
        L => state.cpu.l,
        M => utils::read_memory(state.cpu.h, state.cpu.l, state)
    }
}

fn read_reg_pair(pair: RegPair, state: &State8085) -> (u8, u8) {
    return match pair {
        B => (state.cpu.b, state.cpu.c),
        D => (state.cpu.d, state.cpu.e),
        H => (state.cpu.h, state.cpu.l),
        SP => {
            let [h, l] = state.cpu.sp.to_be_bytes();
            (h, l)
        },
    }
}

fn copy_byte_to(to: RegM, byte: u8, state: &mut State8085) {
    match to {
        RegM::A => state.cpu.a = byte,
        RegM::B => state.cpu.b = byte,
        RegM::C => state.cpu.c = byte,
        RegM::D => state.cpu.d = byte,
        RegM::E => state.cpu.e = byte,
        RegM::H => state.cpu.h = byte,
        RegM::L => state.cpu.l = byte,
        RegM::M => utils::write_memory(state.cpu.h, state.cpu.l, byte, state),
    }
}

fn copy_word_to(to: RegPair, high: u8, low: u8, state: &mut State8085) {
    match to {
        B => {
            state.cpu.b = high;
            state.cpu.c = low;
        },
        D => {
            state.cpu.d = high;
            state.cpu.e = low;
        },
        H => {
            state.cpu.h = high;
            state.cpu.l = low;
        },
        SP => state.cpu.sp = ((high as u16) << 8) | (low as u16),
    }
}

pub fn mov(to: RegM, from: RegM, state: &mut State8085) {
    copy_byte_to(to, read_ref(from, state), state);
}

pub fn mvi(to: RegM, byte: u8, state: &mut State8085) {
    copy_byte_to(to, byte, state);
    state.cpu.pc += 1;
}

pub fn lda(high: u8, low: u8, state: &mut State8085) {
    copy_byte_to(RegM::A, utils::read_memory(high, low, state), state);
    state.cpu.pc += 2;
}

pub fn sta(high: u8, low: u8, state: &mut State8085) {
    utils::write_memory(high, low, read_ref(RegM::A, state), state);
    state.cpu.pc += 2;
}

pub fn lhld(high: u8, low: u8, state: &mut State8085) {
    state.cpu.h = utils::read_memory_with_offset(1, high, low, state);
    state.cpu.l = utils::read_memory(high, low, state);
    state.cpu.pc += 2;
}

pub fn shld(high: u8, low: u8, state: &mut State8085) {
    utils::write_memory(high, low, state.cpu.l, state);
    utils::write_memory_with_offset(1, high, low, state.cpu.h, state);
    state.cpu.pc += 2;
}

pub fn lxi(regPair: RegPair, high: u8, low: u8, state: &mut State8085) {
    copy_word_to(regPair, high, low, state);
    state.cpu.pc += 2;
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
    let d = state.cpu.d;
    let e = state.cpu.e;
    state.cpu.d = state.cpu.h;
    state.cpu.e = state.cpu.l;
    state.cpu.h = d;
    state.cpu.l = e;
}

pub fn xthl(state: &mut State8085) {
    let [spH, spL] = state.cpu.sp.to_be_bytes();
    let stackL = utils::read_memory(spH, spL, state);
    let stackH = utils::read_memory_with_offset(1, spH, spL, state);
    utils::write_memory(spH, spL, state.cpu.l, state);
    utils::write_memory_with_offset(1, spH, spL, state.cpu.h, state);
    state.cpu.h = stackH;
    state.cpu.l = stackL;
}

pub fn pchl(state: &mut State8085) {
    state.cpu.pc = utils::bytes_to_word(state.cpu.h, state.cpu.l);
}

pub fn sphl(state: &mut State8085) {
    state.cpu.sp = utils::bytes_to_word(state.cpu.h, state.cpu.l);
}