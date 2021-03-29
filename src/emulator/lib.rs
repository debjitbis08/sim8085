mod types;
mod utils;
mod instructions;
mod disassemble;

use wasm_bindgen::prelude::*;
use web_sys::console;
use crate::disassemble::disassemble;
use crate::instructions::branch::{ call, cc, cnc, cm, cp, cpe, cpo, cnz, cz, jmp, jc, jnc, jm, jp, jpe, jpo, jnz, jz, ret, rc, rnc, rm, rp, rpe, rpo, rnz, rz, push, push_psw, pop, pop_psw};
use crate::instructions::arithmetic::{add, adi, aci, adc, sub, sui, sbb, sbi, inx, dcx, inr, dcr, dad};
use crate::instructions::logical::{ana, ani, ora, ori, xra, xri, cmp, cma, cmc, cpi, rar, ral, rrc, rlc};
use crate::instructions::data_transfer::{mvi, mov, lxi, lda, sta, stax, ldax, shld, lhld, xthl, xchg, pchl, sphl};
use std::convert::TryInto;
use std::convert::TryFrom;
use std::process::exit;
use types::State8085;
use types::Cpu;
use types::Flags;

// When the `wee_alloc` feature is enabled, this uses `wee_alloc` as the global
// allocator.
//
// If you don't want to use `wee_alloc`, you can safely delete this.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

// A macro to provide `println!(..)`-style syntax for `console.log` logging.
macro_rules! log {
    ( $( $t:tt )* ) => {
        web_sys::console::log_1(&format!( $( $t )* ).into());
    }
}

static mut MEMORY: [u8; 65536] = [0; 65536];

fn unimplemented_instruction(state: &mut State8085) {
	// pc will have advanced one, so undo that
	println!("Error: Unimplemented instruction\n");
	state.cpu.pc -= 1;
	disassemble(state.cpu.pc, &state);
	println!("\n");
	exit(1);
}

fn invalid_instruction(state: &mut State8085) {
	// pc will have advanced one, so undo that
	println!("Error: Invalid instruction\n");
	// println!("PC: %u\n", state.pc);
	// println!("Memory at PC: %u\n", state.memory[state.pc]);
	state.cpu.pc -= 1;
	exit(1);
}

#[wasm_bindgen]
pub fn init_8085() -> Cpu {
	Cpu {
        a: 0,
        b: 0,
        c: 0,
        d: 0,
        e: 0,
        h: 0,
        l: 0,
        sp: 0,
        pc: 0,
        cc: Flags {
            z: false,
            s: false,
            p: false,
            cy: false,
            ac: false,
        },
        int_enable: 0,
    }
}

#[no_mangle]
pub fn get_memory_ptr() -> &'static [u8; 65536] {
    unsafe {
        &MEMORY
    }
}


pub fn emulate_8085(cpu: Cpu, offset: usize) -> (bool, Cpu) {
    unsafe {
        let state: &mut State8085 = &mut State8085 {
            cpu: cpu,
            memory: &mut MEMORY
        };
        let mut pc = usize::try_from(state.cpu.pc).unwrap();
        let opcode = state.read_memory(pc);
        let low = state.read_memory(pc + 1);
        let high = state.read_memory(pc + 2);

        log!("Emulating instruction at {}", state.cpu.pc);
        log!("Emulating instruction {}", opcode);

        if offset == pc
            { state.cpu.sp = 0xFFFF; }

        //Disassemble8085Op(state.memory, state.pc);

        pc += 1;

        match state.read_memory(pc - 1) {

            // NOP
            0x00 => return (false, state.cpu),

            // LXI B, word
            0x01 => lxi(types::RegPair::B, high, low, state),

            // STAX B
            0x02 => stax(types::RegPair::B, state),

            // INX B
            0x03 => inx(types::RegPair::B, state),

            // INR B
            0x04 => inr(types::RegM::B, state),

            // DCR B
            0x05 => dcr(types::RegM::B, state),

            // MVI B, byte
            0x06 => mvi(types::RegM::B, low, state),

            // RLC
            0x07 => rlc(state),

            0x08 => {
                // invalid_instruction(state);
            },

            // DAD B
            0x09 => dad(types::RegPair::B, state),

            // LDAX B
            0x0a => ldax(types::RegPair::B, state),

            // DCX B
            0x0b => dcx(types::RegPair::B, state),

            // INR C
            0x0c => inr(types::RegM::C, state),

            // DCR C
            0x0d => dcr(types::RegM::C, state),

            // MVI C, byte
            0x0e => mvi(types::RegM::C, low, state),

            // RRC
            0x0f => rrc(state),

            0x10 => {
                // invalid_instruction(state);
            },

            // LXI D, word
            0x11 => lxi(types::RegPair::D, high, low, state),

            // STAX D
            0x12 => stax(types::RegPair::D, state),

            // INX D
            0x13 => inx(types::RegPair::D, state),

            // INR D
            0x14 => inr(types::RegM::D, state),

            // DCR D
            0x15 => dcr(types::RegM::D, state),

            // MVI D, byte
            0x16 => mvi(types::RegM::D, low, state),

            // RAL
            0x17 => ral(state),

            0x18 => {
                // invalid_instruction(state);
            },

            // DAD D
            0x19 => dad(types::RegPair::D, state),

            // LDAX D
            0x1a => ldax(types::RegPair::D, state),

            // DCX D
            0x1b => dcx(types::RegPair::D, state),

            // INR E
            0x1c => inr(types::RegM::E, state),

            // DCR E
            0x1d => dcr(types::RegM::E, state),

            // MVI E, byte
            0x1e => mvi(types::RegM::E, low, state),

            // RAR
            0x1f => rar(state),

            0x20 => {  // RIM
                // unimplemented_instruction(state);
            },

            // LXI H, word
            0x21 => lxi(types::RegPair::H, high, low, state),

            // SHLD word
            0x22 => shld(high, low, state),

            // INX H
            0x23 => inx(types::RegPair::H, state),

            // INR H
            0x24 => inr(types::RegM::H, state),

            // DCR H
            0x25 => dcr(types::RegM::H, state),

            // MVI H, byte
            0x26 => mvi(types::RegM::H, low, state),

            0x27 => { // DAA
                // uint16_t res = state.a;

                // if (state.cc.ac == 1 || (state.a & 0x0f) > 9)
                    // res = state.a + 6;

                // ArithFlagsA(state, res, PRESERVE_CARRY);
                // if ((uint8_t)res > 0xf)
                    // state.cc.ac = 1;
                // state.a = (uint8_t)res;

                // if (state.cc.cy == 1 || ((state.a >> 4) & 0x0f) > 9)
                //     res = state.a + 96;

                // ArithFlagsA(state, res, UpdateCarry);
                // state.a = (uint8_t)res;
            },
            0x28 => {
                // invalid_instruction(state);
            },

            // DAD H
            0x29 => dad(types::RegPair::H, state),

            // LHLD Addr
            0x2a => lhld(high, low, state),

            // DCX H
            0x2b => dcx(types::RegPair::H, state),

            // INR L
            0x2c => inr(types::RegM::L, state),

            // DCR L
            0x2d => dcr(types::RegM::L, state),

            // MVI L, byte
            0x2e => mvi(types::RegM::L, low, state),

            // CMA
            0x2f => cma(state),

            0x30 => {  // NOP
            },

            // LXI SP, word
            0x31 => lxi(types::RegPair::SP, high, low, state),

            // STA word
            0x32 => sta(high, low, state),

            // INX SP
            0x33 => inx(types::RegPair::SP, state),

            // INR M
            0x34 => inr(types::RegM::M, state),

            // DCR M
            0x35 => dcr(types::RegM::M, state),

            // MVI M, byte
            0x36 => mvi(types::RegM::M, low, state),

            0x37 => {  // STC
                // state.cc.cy = 1;
            },
            0x38 => {
                // invalid_instruction(state);
            },

            // DAD SP
            0x39 => dad(types::RegPair::SP, state),

            // LDA word
            0x3a => lda(high, low, state),

            // DCX SP
            0x3b => dcx(types::RegPair::SP, state),

            // INR A
            0x3c => inr(types::RegM::A, state),

            // DCR A
            0x3d => dcr(types::RegM::A, state),

            // MVI A, byte
            0x3e => mvi(types::RegM::A, low, state),

            // CMC
            0x3f => cmc(state),

            // MOV B, B
            0x40 => mov(types::RegM::B, types::RegM::B, state),

            // MOV B, C
            0x41 => mov(types::RegM::B, types::RegM::C, state),

            // MOV B, D
            0x42 => mov(types::RegM::B, types::RegM::D, state),

            // MOV B, E
            0x43 => mov(types::RegM::B, types::RegM::E, state),

            // MOV B, H
            0x44 => mov(types::RegM::B, types::RegM::H, state),

            // MOV B, L
            0x45 => mov(types::RegM::B, types::RegM::L, state),

            // MOV B, M
            0x46 => mov(types::RegM::B, types::RegM::M, state),

            // MOV B, A
            0x47 => mov(types::RegM::B, types::RegM::A, state),

            // MOV C, B
            0x48 => mov(types::RegM::C, types::RegM::B, state),

            // MOV C, C
            0x49 => mov(types::RegM::C, types::RegM::C, state),

            // MOV C, D
            0x4a => mov(types::RegM::C, types::RegM::D, state),

            // MOV C, E
            0x4b => mov(types::RegM::C, types::RegM::E, state),

            // MOV C, H
            0x4c => mov(types::RegM::C, types::RegM::H, state),

            // MOV C, L
            0x4d => mov(types::RegM::C, types::RegM::L, state),

            // MOV C, M
            0x4e => mov(types::RegM::C, types::RegM::M, state),

            // MOV C, A
            0x4f => mov(types::RegM::C, types::RegM::A, state),

            // MOV D, B
            0x50 => mov(types::RegM::D, types::RegM::B, state),

            // MOV D, C
            0x51 => mov(types::RegM::D, types::RegM::C, state),

            // MOV D, D
            0x52 => mov(types::RegM::D, types::RegM::D, state),

            // MOV D, E
            0x53 => mov(types::RegM::D, types::RegM::E, state),

            // MOV D, H
            0x54 => mov(types::RegM::D, types::RegM::H, state),

            // MOV D, L
            0x55 => mov(types::RegM::D, types::RegM::L, state),

            // MOV D, M
            0x56 => mov(types::RegM::D, types::RegM::M, state),

            // MOV D, A
            0x57 => mov(types::RegM::D, types::RegM::A, state),

            // MOV E, B
            0x58 => mov(types::RegM::E, types::RegM::B, state),

            // MOV E, C
            0x59 => mov(types::RegM::E, types::RegM::C, state),

            // MOV E, D
            0x5a => mov(types::RegM::E, types::RegM::D, state),

            // MOV E, E
            0x5b => mov(types::RegM::E, types::RegM::E, state),

            // MOV E, H
            0x5c => mov(types::RegM::E, types::RegM::H, state),

            // MOV E, L
            0x5d => mov(types::RegM::E, types::RegM::L, state),

            // MOV E, M
            0x5e => mov(types::RegM::E, types::RegM::M, state),

            // MOV E, A
            0x5f => mov(types::RegM::E, types::RegM::A, state),

            // MOV H, B
            0x60 => mov(types::RegM::H, types::RegM::B, state),

            // MOV H, C
            0x61 => mov(types::RegM::H, types::RegM::C, state),

            // MOV H, D
            0x62 => mov(types::RegM::H, types::RegM::D, state),

            // MOV H, E
            0x63 => mov(types::RegM::H, types::RegM::E, state),

            // MOV H, H
            0x64 => mov(types::RegM::H, types::RegM::H, state),

            // MOV H, L
            0x65 => mov(types::RegM::H, types::RegM::L, state),

            // MOV H, M
            0x66 => mov(types::RegM::H, types::RegM::M, state),

            // MOV H, A
            0x67 => mov(types::RegM::H, types::RegM::A, state),

            // MOV L, B
            0x68 => mov(types::RegM::L, types::RegM::B, state),

            // MOV L, C
            0x69 => mov(types::RegM::L, types::RegM::C, state),

            // MOV L, D
            0x6a => mov(types::RegM::L, types::RegM::D, state),

            // MOV L, E
            0x6b => mov(types::RegM::L, types::RegM::E, state),

            // MOV L, H
            0x6c => mov(types::RegM::L, types::RegM::H, state),

            // MOV L, L
            0x6d => mov(types::RegM::L, types::RegM::L, state),

            // MOV L, M
            0x6e => mov(types::RegM::L, types::RegM::M, state),

            // MOV L, A
            0x6f => mov(types::RegM::L, types::RegM::A, state),

            // MOV M, B
            0x70 => mov(types::RegM::M, types::RegM::B, state),

            // MOV M, C
            0x71 => mov(types::RegM::M, types::RegM::C, state),

            // MOV M, D
            0x72 => mov(types::RegM::M, types::RegM::D, state),

            // MOV M, E
            0x73 => mov(types::RegM::M, types::RegM::E, state),

            // MOV M, H
            0x74 => mov(types::RegM::M, types::RegM::H, state),

            // MOV M, L
            0x75 => mov(types::RegM::M, types::RegM::L, state),

            // HLT
            0x76 => return (true, state.cpu),

            // MOV M, A
            0x77 => mov(types::RegM::M, types::RegM::A, state),

            // MOV A, B
            0x78 => mov(types::RegM::A, types::RegM::B, state),

            // MOV A, C
            0x79 => mov(types::RegM::A, types::RegM::C, state),

            // MOV A, D
            0x7a => mov(types::RegM::A, types::RegM::D, state),

            // MOV A, E
            0x7b => mov(types::RegM::A, types::RegM::E, state),

            // MOV A, H
            0x7c => mov(types::RegM::A, types::RegM::H, state),

            // MOV A, L
            0x7d => mov(types::RegM::A, types::RegM::L, state),

            // MOV A, M
            0x7e => mov(types::RegM::A, types::RegM::M, state),

            // MOV A, A
            0x7f => mov(types::RegM::A, types::RegM::M, state),

            // ADD B
            0x80 => add(types::RegM::B, state),

            // ADD C
            0x81 => add(types::RegM::C, state),

            // ADD D
            0x82 => add(types::RegM::D, state),

            // ADD E
            0x83 => add(types::RegM::E, state),

            // ADD H
            0x84 => add(types::RegM::H, state),

            // ADD L
            0x85 => add(types::RegM::L, state),

            // ADD M
            0x86 => add(types::RegM::M, state),

            // ADD A
            0x87 => add(types::RegM::A, state),

            // ADC B
            0x88 => adc(types::RegM::B, state),

            // ADC C
            0x89 => adc(types::RegM::C, state),

            // ADC D
            0x8a => adc(types::RegM::D, state),

            // ADC E
            0x8b => adc(types::RegM::E, state),

            // ADC H
            0x8c => adc(types::RegM::H, state),

            // ADC L
            0x8d => adc(types::RegM::L, state),

            // ADC M
            0x8e => adc(types::RegM::M, state),

            // ADC A
            0x8f => adc(types::RegM::A, state),

            // SUB B
            0x90 => sub(types::RegM::B, state),

            // SUB C
            0x91 => sub(types::RegM::C, state),

            // SUB D
            0x92 => sub(types::RegM::D, state),

            // SUB E
            0x93 => sub(types::RegM::E, state),

            // SUB H
            0x94 => sub(types::RegM::H, state),

            // SUB L
            0x95 => sub(types::RegM::L, state),

            // SUB M
            0x96 => sub(types::RegM::M, state),

            // SUB A
            0x97 => sub(types::RegM::A, state),

            // SBB B
            0x98 => sbb(types::RegM::B, state),

            // SBB C
            0x99 => sbb(types::RegM::C, state),

            // SBB D
            0x9a => sbb(types::RegM::D, state),

            // SBB E
            0x9b => sbb(types::RegM::E, state),

            // SBB H
            0x9c => sbb(types::RegM::H, state),

            // SBB L
            0x9d => sbb(types::RegM::L, state),

            // SBB M
            0x9e => sbb(types::RegM::M, state),

            // SBB A
            0x9f => sbb(types::RegM::A, state),

            // ANA B
            0xa0 => ana(types::RegM::B, state),

            // ANA C
            0xa1 => ana(types::RegM::C, state),

            // ANA D
            0xa2 => ana(types::RegM::D, state),

            // ANA E
            0xa3 => ana(types::RegM::E, state),

            // ANA H
            0xa4 => ana(types::RegM::H, state),

            // ANA L
            0xa5 => ana(types::RegM::L, state),

            // ANA M
            0xa6 => ana(types::RegM::M, state),

            // ANA A
            0xa7 => ana(types::RegM::A, state),

            // XRA B
            0xa8 => xra(types::RegM::B, state),

            // XRA C
            0xa9 => xra(types::RegM::C, state),

            // XRA D
            0xaa => xra(types::RegM::D, state),

            // XRA E
            0xab => xra(types::RegM::E, state),

            // XRA H
            0xac => xra(types::RegM::H, state),

            // XRA L
            0xad => xra(types::RegM::L, state),

            // XRA M
            0xae => xra(types::RegM::M, state),

            // XRA A
            0xaf => xra(types::RegM::A, state),

            // ORA B
            0xb0 => ora(types::RegM::B, state),

            // ORA C
            0xb1 => ora(types::RegM::C, state),

            // ORA D
            0xb2 => ora(types::RegM::D, state),

            //  ORA E
            0xb3 => ora(types::RegM::E, state),

            // ORA H
            0xb4 => ora(types::RegM::H, state),

            // ORA L
            0xb5 => ora(types::RegM::L, state),

            // ORA M
            0xb6 => ora(types::RegM::M, state),

            // ORA A
            0xb7 => ora(types::RegM::A, state),

            // CMP B
            0xb8 => {
                cmp(types::RegM::B, state);
            },

            // CMP C
            0xb9 => {
                cmp(types::RegM::C, state);
            },

            // CMP D
            0xba => {
                cmp(types::RegM::D, state);
            },

            // CMP E
            0xbb => {
                cmp(types::RegM::E, state);
            },

            // CMP H
            0xbc => {
                cmp(types::RegM::H, state);
            },

            // CMP L
            0xbd => {
                cmp(types::RegM::L, state);
            },

            // CMP M
            0xbe => {
                cmp(types::RegM::M, state);
            },

            // CMP A
            0xbf => {
                cmp(types::RegM::A, state);
            },

            0xc0 => rnz(state),

            // POP B
            0xc1 => pop(types::RegPair::B, state),

            // JNZ Addr
            0xc2 => jnz(types::Addr { high: high, low: low }, state),

            // JMP Addr
            0xc3 => jmp(types::Addr { high: high, low: low }, state),

            // CNZ Addr
            0xc4 => cnz(types::Addr { high: high, low: low }, state),

            // PUSH B
            0xc5 => push(types::RegPair::B, state),

            // ADI byte
            0xc6 => adi(low, state),

            0xc7 => { // RST 0
                unimplemented_instruction(state);
            },

            // RZ
            0xc8 => rz(state),

            // RET
            0xc9 => ret(state),

            // JZ Addr
            0xca => jz(types::Addr { high: high, low: low }, state),

            0xcb => {
                invalid_instruction(state);
            },

            // CZ Addr
            0xcc => cz(types::Addr { high: high, low: low }, state),

            // CALL Addr
            0xcd => call(types::Addr { high: high, low: low }, state),

            // ACI d8
            0xce => aci(low, state),

            0xcf => { // RST 1
                unimplemented_instruction(state);
            },

            // RNC
            0xd0 => rnc(state),

            // POP D
            0xd1 => pop(types::RegPair::D, state),

            // JNC Addr
            0xd2 => jnc(types::Addr { high: high, low: low }, state),

            0xd3 => {
                // TODO Don't know what to do here (yet)
                state.cpu.pc += 1;
            },

            // CNC Addr
            0xd4 => cnc(types::Addr { high: high, low: low }, state),

            // PUSH D
            0xd5 => push(types::RegPair::D, state),

            // SUI d8
            0xd6 => sui(low, state),

            0xd7 => { // RST 2
                unimplemented_instruction(state);
            },

            // RC
            0xd8 => rc(state),

            0xd9 => {
                invalid_instruction(state);
            },

            // JC Addr
            0xda => jc(types::Addr { high: high, low: low }, state),

            0xdb => { //  IN d8
                unimplemented_instruction(state);
            },

            // CC Addr
            0xdc => cc(types::Addr { high: high, low: low }, state),

            0xdd => {
                invalid_instruction(state);
            },

            // SBI d8
            0xde => sbi(low, state),

            0xdf => { // RST 3
                unimplemented_instruction(state);
            },

            // RPO
            0xe0 => rpo(state),

            // POP H
            0xe1 => pop(types::RegPair::H, state),

            // JPO Addr
            0xe2 => jpo(types::Addr { high: high, low: low }, state),

            // XTHL
            0xe3 => xthl(state),

            // CPO Addr
            0xe4 => cpo(types::Addr { high: high, low: low }, state),

            // PUSH H
            0xe5 => push(types::RegPair::H, state),

            // ANI byte
            0xe6 => ani(low, state),

            0xe7 => { // RST 4
                unimplemented_instruction(state);
            },

            // RPE
            0xe8 => rpe(state),

            // PCHL
            0xe9 => pchl(state),

            // JPE Addr
            0xea => jpe(types::Addr { high: high, low: low }, state),

            // XCHG
            0xeb => xchg(state),

            // CPE Addr
            0xec => cpe(types::Addr { high: high, low: low }, state),

            0xed => {
                invalid_instruction(state);
            },

            // XRI d8
            0xee => xri(low, state),

            0xef => { // RST 5
                unimplemented_instruction(state);
            },

            // RP
            0xf0 => rp(state),

            // POP PSW
            0xf1 => pop_psw(state),

            // JP Addr
            0xf2 => jp(types::Addr { high: high, low: low }, state),

            0xf3 => { // DI
                unimplemented_instruction(state);
            },

            // CP Addr
            0xf4 => cp(types::Addr { high: high, low: low }, state),

            // PUSH PSW
            0xf5 => push_psw(state),

            // ORI d8
            0xf6 => ori(low, state),

            0xf7 => { // RST 6
                unimplemented_instruction(state);
            },

            // RM
            0xf8 => rm(state),

            // SPHL
            0xf9 => sphl(state),

            // JM Addr
            0xfa => jm(types::Addr { high: high, low: low }, state),

            0xfb => { // EI
                state.cpu.int_enable = 1;
            },

            // CM Addr
            0xfc => cm(types::Addr { high: high, low: low }, state),

            0xfd => {
                invalid_instruction(state);
            },

            // CPI d8
            0xfe => cpi(low, state),

            0xff => { // RST 7
                unimplemented_instruction(state);
            },
        }

        state.cpu.pc = pc.try_into().unwrap();
        log!("CPU after instruction execution {:?}", state.cpu);
        return (false, state.cpu);
    }
}

#[wasm_bindgen]
pub fn load_program(ls: JsValue, offset: usize) {
    log!("In Load Program");
    unsafe {
        log!("offset {}", offset);
        let mut counter = 0;
        let lines: Vec<u8> = ls.into_serde().unwrap();
        log!("lines {:?}", lines);
        for line in lines.iter() {
            log!("line {}", line);
            MEMORY[offset + counter] = *line;
            counter += 1;
        }
        log!("Memory at offset {}", MEMORY[offset]);
    }
}

#[wasm_bindgen]
pub fn execute_program(cpu_obj: &JsValue, offset: usize) -> JsValue {
    unsafe {
        let cpu: Cpu = cpu_obj.into_serde().unwrap();
        let mut done = false;
        let mut cycles = 0;
        let mut execution_state = (false, cpu);
        let state: &mut State8085 = &mut State8085 {
            cpu: cpu,
            memory: &mut MEMORY
        };
        log!("SP Ptr: {0}", state.cpu.sp);
        log!("Offset {0}", offset);
        state.cpu.pc = offset.try_into().unwrap(); // Try to convert to u16 and panic if that fails
        state.cpu.sp = 0xFFFF;
        log!("Memory at offset {0}", state.read_memory(offset));
        log!("Memory at offset + 1 {0}", state.read_memory(offset + 1));

        while !done {
            if cycles > 10000
                { exit(2); }
            execution_state = emulate_8085(state.cpu, offset);
            done = execution_state.0;
            state.cpu = execution_state.1;
            cycles += 1;
        }
        log!("{} {} {} {} {}"
            , if state.cpu.cc.z { 'z' } else { '.' }
            , if state.cpu.cc.s { 's' } else { '.' }
            , if state.cpu.cc.p { 'p' } else { '.' }
            , if state.cpu.cc.cy { 'c' } else { '.' }
            , if state.cpu.cc.ac { 'a' } else { '.' });
        /*
        println!("A $%02x B $%02x C $%02x D $%02x E $%02x H $%02x L $%02x SP %04x PC %04x\n", state.a, state.b, state.c,
            state.d, state.e, state.h, state.l, state.sp, state.pc);
        */
        JsValue::from_serde(&state.cpu).unwrap()
    }

}

#[wasm_bindgen]
pub fn execute_one_instruction(cpu_obj: &JsValue, offset: usize) -> JsValue {
    unsafe {
        let cpu: Cpu = cpu_obj.into_serde().unwrap();
        let state: &mut State8085 = &mut State8085 {
            cpu: cpu,
            memory: &mut MEMORY
        };
        log!("SP Ptr: {0}", state.cpu.sp);
        log!("Offset {0}", offset);
        state.cpu.pc = offset.try_into().unwrap(); // Try to convert to u16 and panic if that fails
        state.cpu.sp = 0xFFFF;
        log!("Memory at offset {0}", state.read_memory(offset));
        log!("Memory at offset + 1 {0}", state.read_memory(offset + 1));

        let execution_state = emulate_8085(state.cpu, offset);
        state.cpu = execution_state.1;

        log!("{} {} {} {} {}"
            , if state.cpu.cc.z { 'z' } else { '.' }
            , if state.cpu.cc.s { 's' } else { '.' }
            , if state.cpu.cc.p { 'p' } else { '.' }
            , if state.cpu.cc.cy { 'c' } else { '.' }
            , if state.cpu.cc.ac { 'a' } else { '.' });
        /*
        println!("A $%02x B $%02x C $%02x D $%02x E $%02x H $%02x L $%02x SP %04x PC %04x\n", state.a, state.b, state.c,
            state.d, state.e, state.h, state.l, state.sp, state.pc);
        */
        JsValue::from_serde(&state.cpu).unwrap()
    }

}