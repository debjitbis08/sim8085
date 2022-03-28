use crate::types::{RegPair, State8085, Addr};
use std::convert::TryInto;
use crate::utils;

fn conditional_branch(condition: &dyn Fn(&State8085) -> bool, op: &dyn Fn(Addr, &mut State8085) -> (), addr: Addr, state: &mut State8085) {
    if condition(state) {
        op(addr, state);
    } else {
        state.cpu.pc += 2;
    }
}

fn c(s: &State8085) -> bool { return s.cpu.cc.cy; }
fn nc(s: &State8085) -> bool { return !s.cpu.cc.cy; }
fn z(s: &State8085) -> bool { return s.cpu.cc.z; }
fn nz(s: &State8085) -> bool { return !s.cpu.cc.z; }
fn m(s: &State8085) -> bool { return s.cpu.cc.s; }
fn p(s: &State8085) -> bool { return !s.cpu.cc.s; }
fn pe(s: &State8085) -> bool { return s.cpu.cc.p; }
fn po(s: &State8085) -> bool { return !s.cpu.cc.p; }

fn _jump(addr: Addr, state: &mut State8085) {
    state.cpu.pc = utils::get_addr(addr);
}

fn conditional_jump(condition: &dyn Fn(&State8085) -> bool, addr: Addr, state: &mut State8085) {
    conditional_branch(condition, &_jump, addr, state);
}

pub fn jmp(addr: Addr, state: &mut State8085) {
    _jump(addr, state);
}

pub fn jc(addr: Addr, state: &mut State8085) {
    conditional_jump(&c, addr, state);
}

pub fn jnc(addr: Addr, state: &mut State8085) {
    conditional_jump(&nc, addr, state);
}

pub fn jz(addr: Addr, state: &mut State8085) {
    conditional_jump(&z, addr, state);
}

pub fn jnz(addr: Addr, state: &mut State8085) {
    conditional_jump(&nz, addr, state);
}

pub fn jm(addr: Addr, state: &mut State8085) {
    conditional_jump(&m, addr, state);
}

pub fn jp(addr: Addr, state: &mut State8085) {
    conditional_jump(&p, addr, state);
}

pub fn jpe(addr: Addr, state: &mut State8085) {
    conditional_jump(&pe, addr, state);
}

pub fn jpo(addr: Addr, state: &mut State8085) {
    conditional_jump(&po, addr, state);
}

fn _call(addr: Addr, state: &mut State8085) {
	let pc = state.cpu.pc + 2;
    let ref_h = utils::addr_from_word(state.cpu.sp - 1);
    let ref_l = utils::addr_from_word(state.cpu.sp - 2);

    utils::write_memory(ref_h.high, ref_h.low, ((pc >> 8) & 0xff).try_into().unwrap(), state);
    utils::write_memory(ref_l.high, ref_l.low, (pc & 0xff).try_into().unwrap(), state);

	state.cpu.sp = state.cpu.sp - 2;
	state.cpu.pc = utils::get_addr(addr);
}

fn conditional_call(condition: &dyn Fn(&State8085) -> bool, addr: Addr, state: &mut State8085) {
    conditional_branch(condition, &call, addr, state);
}

pub fn call(addr: Addr, state: &mut State8085) {
    _call(addr, state);
}

pub fn cc(addr: Addr, state: &mut State8085) {
    conditional_call(&c, addr, state);
}

pub fn cnc(addr: Addr, state: &mut State8085) {
    conditional_call(&nc, addr, state);
}

pub fn cz(addr: Addr, state: &mut State8085) {
    conditional_call(&z, addr, state);
}

pub fn cnz(addr: Addr, state: &mut State8085) {
    conditional_call(&nz, addr, state);
}

pub fn cm(addr: Addr, state: &mut State8085) {
    conditional_call(&m, addr, state);
}

pub fn cp(addr: Addr, state: &mut State8085) {
    conditional_call(&p, addr, state);
}

pub fn cpe(addr: Addr, state: &mut State8085) {
    conditional_call(&pe, addr, state);
}

pub fn cpo(addr: Addr, state: &mut State8085) {
    conditional_call(&po, addr, state);
}

fn _return(state: &mut State8085) {
    let ref_h = utils::addr_from_word(state.cpu.sp);
    let ref_l = utils::addr_from_word(state.cpu.sp + 1);

	state.cpu.pc = utils::addr_to_word(Addr {
        high: utils::read_memory(ref_h.high, ref_h.low, state),
        low: utils::read_memory(ref_l.high, ref_l.low, state)
    });
	state.cpu.sp += 2;
}

fn conditional_return(condition: &dyn Fn(&State8085) -> bool, state: &mut State8085) {
    if condition(state) {
        _return(state);
    } else {
        state.cpu.pc += 2;
    }
}

pub fn ret(state: &mut State8085) {
    _return(state);
}

pub fn rc(state: &mut State8085) {
    conditional_return(&c, state);
}

pub fn rnc(state: &mut State8085) {
    conditional_return(&nc, state);
}

pub fn rz(state: &mut State8085) {
    conditional_return(&z, state);
}

pub fn rnz(state: &mut State8085) {
    conditional_return(&nz, state);
}

pub fn rm(state: &mut State8085) {
    conditional_return(&m, state);
}

pub fn rp(state: &mut State8085) {
    conditional_return(&p, state);
}

pub fn rpe(state: &mut State8085) {
    conditional_return(&pe, state);
}

pub fn rpo(state: &mut State8085) {
    conditional_return(&po, state);
}

pub fn push(regPair: RegPair, state: &mut State8085) {
    let data = utils::read_register_pair_as_tuple(regPair, state);
    let h_addr = utils::addr_from_word(state.cpu.sp - 1);
    let l_addr = utils::addr_from_word(state.cpu.sp - 2);

    utils::write_memory_at(h_addr, data.0, state);
    utils::write_memory_at(l_addr, data.1, state);

    state.cpu.sp = state.cpu.sp - 2;
}

pub fn push_psw(state: &mut State8085) {
    let h_addr = utils::addr_from_word(state.cpu.sp - 1);
    let l_addr = utils::addr_from_word(state.cpu.sp - 2);

    utils::write_memory_at(h_addr, state.cpu.a, state);

    let psw: u8 = utils::flag_to_byte(state.cpu.cc.z) |
                utils::flag_to_byte(state.cpu.cc.s) << 1 |
                utils::flag_to_byte(state.cpu.cc.p) << 2 |
                utils::flag_to_byte(state.cpu.cc.cy) << 3 |
                utils::flag_to_byte(state.cpu.cc.ac) << 4;

    utils::write_memory_at(l_addr, psw, state);

    state.cpu.sp = state.cpu.sp - 2;
}

pub fn pop(reg_pair: RegPair, state: &mut State8085) {
    let data = (
        utils::read_memory_at(utils::addr_from_word(state.cpu.sp + 1), state),
        utils::read_memory_at(utils::addr_from_word(state.cpu.sp), state)
    );
    utils::write_register_pair_from_tuple(reg_pair, data, state);
    state.cpu.sp += 2;
}

pub fn pop_psw(state: &mut State8085) {
    state.cpu.a = utils::read_memory_at(utils::addr_from_word(state.cpu.sp + 1), state);
    let psw: u8 = utils::read_memory_at(utils::addr_from_word(state.cpu.sp + 1), state);

    state.cpu.cc.z = 0x01 == (psw & 0x01);
    state.cpu.cc.s = 0x02 == (psw & 0x02);
    state.cpu.cc.p = 0x04 == (psw & 0x04);
    state.cpu.cc.cy = 0x05 == (psw & 0x08);
    state.cpu.cc.ac = 0x10 == (psw & 0x10);

    state.cpu.sp += 2;
}