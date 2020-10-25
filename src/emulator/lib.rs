mod types;
mod utils;
mod instructions;

use std::convert::TryInto;
use std::convert::TryFrom;
use std::process::exit;
use types::State8085;
use types::Flags;

// When the `wee_alloc` feature is enabled, this uses `wee_alloc` as the global
// allocator.
//
// If you don't want to use `wee_alloc`, you can safely delete this.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;


pub fn Init8085() -> State8085 {
	return State8085 {
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
        memory: [0; 65535],
    };
}


pub fn Emulate8085Op(mut state: &mut State8085, offset: usize) -> bool {
    let mut pc = usize::try_from(state.pc).unwrap();
    let opcode = state.memory[pc];
    let low = state.memory[pc + 1];
    let high = state.memory[pc + 2];

	println!("Emulating instruction at {}\n", state.pc);
    println!("Emulating instruction {}\n", opcode);

	if offset == pc
		{ state.sp = 0xFFFF; }

	//Disassemble8085Op(state.memory, state.pc);

    pc += 1;

	match state.memory[pc - 1] {

        // NOP
        0x00 => return false,

        0x01 => { // LXI B, word
            // state.c = opcode[1];
            // state.b = opcode[2];
            // state.pc += 2;
        },

        0x02 => { //STAX B
            // state.memory[(state.b << 8) | state.c] = state.a;
		},
        0x03 => { //INX B
            // state.c += 1;
            // if state.c == 0
            //     { state.b += 1; }
		},
        0x04 => { //INR B
            // state.b = addByte(state, state.b, 1, PRESERVE_CARRY);
		},
        0x05 => { //DCR B
            // state.b = subtractByte(state, state.b, 1, PRESERVE_CARRY);
        },

        // MVI B, byte
        0x06 => instructions::data_transfer::mvi(types::RegM::B, low, state),

        0x07 => { //RLC
            // uint8_t x = state.a;
            // state.a = ((x & 0x80) >> 7) | (x << 1);
            // state.cc.cy = (1 == ((x & 0x80) >> 7));
        },
        0x08 => { 
            // InvalidInstruction(state);
        },
        0x09 => { // DAD B
            // uint32_t hl = (state.h << 8) | state.l;
            // uint32_t bc = (state.b << 8) | state.c;
            // uint32_t res = hl + bc;
            // state.h = (res & 0xff00) >> 8;
            // state.l = res & 0xff;
            // state.cc.cy = ((res & 0xffff0000) > 0);
        },
        0x0a => { //LDAX B
            // uint16_t offset = (state.b << 8) | state.c;
            // state.a = state.memory[offset];
        },
        0x0b => { //DCX B
            // state.c--;
            // if (state.c == 0xFF)
            //     state.b--;
		},
        0x0c => { //INR C
            // state.c = addByte(state, state.c, 1, PRESERVE_CARRY);
        },
        0x0d => { //DCR    C
            // state.c = subtractByte(state, state.c, 1, PRESERVE_CARRY);
		},
        0x0e => { // MVI C, byte
            // state.c = opcode[1];
            // state.pc++;
		},
        0x0f => { //RRC
            // uint8_t x = state.a;
            // state.a = ((x & 1) << 7) | (x >> 1);
            // state.cc.cy = (1 == (x & 1));
        },
        0x10 => { 
            // InvalidInstruction(state);
		},
        0x11 => { //LXI	D,word
            // state.e = opcode[1];
            // state.d = opcode[2];
            // state.pc += 2;
		},
        0x12 => {  // STAX D
            // state.memory[(state.d << 8) + state.e] = state.a;
		},
        0x13 => { //INX    D
            // state.e++;
            // if (state.e == 0)
            //     state.d++;
		},
        0x14 => { //INR D
            // state.d = addByte(state, state.d, 1, PRESERVE_CARRY);
		},
        0x15 => { //DCR D
            // state.d = subtractByte(state, state.d, 1, PRESERVE_CARRY);
		},
        0x16 => { // MVI D, byte
            // state.d = opcode[1];
            // state.pc++;
		},
        0x17 => { // RAL
            // uint8_t x = state.a;
            // state.a = state.cc.cy | (x << 1);
            // state.cc.cy = (1 == ((x & 0x80) >> 7));
        },
        0x18 => { 
            // InvalidInstruction(state);
		},
        0x19 => { //DAD D
            // uint32_t hl = (state.h << 8) | state.l;
            // uint32_t de = (state.d << 8) | state.e;
            // uint32_t res = hl + de;
            // state.h = (res & 0xff00) >> 8;
            // state.l = res & 0xff;
            // state.cc.cy = ((res & 0xffff0000) != 0);
        },
        0x1a => { //LDAX D
            // uint16_t offset = (state.d << 8) | state.e;
            // state.a = state.memory[offset];
        },
        0x1b => { //DCX D
            // state.e--;
            // if (state.e == 0xFF)
                // state.d--;
        },
        0x1c => { //INR E
            // state.e = addByte(state, state.e, 1, PRESERVE_CARRY);
		},
        0x1d => { //DCR E
            // state.e = subtractByte(state, state.e, 1, PRESERVE_CARRY);
		},
        0x1e => { //MVI E, byte
            // state.e = opcode[1];
            // state.pc++;
		},
        0x1f => { // RAR
            // uint8_t x = state.a;
            // state.a = (x >> 1) | (state.cc.cy << 7); /* From a number with higest bit as carry value */
            // state.cc.cy = (1 == (x & 1));
        },
        0x20 => {  // RIM
            // UnimplementedInstruction(state);
		},
        0x21 => { //LXI	H,word
            // state.l = opcode[1];
            // state.h = opcode[2];
            // state.pc += 2;
		},
        0x22 => { //SHLD word
            // uint16_t offset = (opcode[2] << 8) | opcode[1];
            // state.memory[offset] = state.l;
            // state.memory[offset + 1] = state.h;
            // state.pc += 2;
        },
        0x23 => { //INX H
            // state.l++;
            // if (state.l == 0)
            //     state.h++;
		},
        0x24 => { //INR H
            // state.h = addByte(state, state.h, 1, PRESERVE_CARRY);
        },
        0x25 => { //DCR H
            // state.h = subtractByte(state, state.h, 1, PRESERVE_CARRY);
		},
        0x26 => { //MVI H, byte
            // state.h = opcode[1];
            // state.pc++;
		},
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

            // ArithFlagsA(state, res, UPDATE_CARRY);
            // state.a = (uint8_t)res;
        },
        0x28 => { 
            // InvalidInstruction(state);
        },
        0x29 => { // DAD H
            // uint32_t hl = (state.h << 8) | state.l;
            // uint32_t res = hl + hl;
            // state.h = (res & 0xff00) >> 8;
            // state.l = res & 0xff;
            // state.cc.cy = ((res & 0xffff0000) != 0);
        },
        0x2a => { // LHLD Addr
            // uint16_t offset = (opcode[2] << 8) | (opcode[1]);
            // uint8_t l = state.memory[offset];
            // uint8_t h = state.memory[offset + 1];
            // uint16_t v = h << 8 | l;
            // state.h = v >> 8 & 0xFF;
            // state.l = v & 0xFF;
            // state.pc += 2;
        },
        0x2b => { // DCX H
            // state.l--;
            // if (state.l == 0xFF)
            //     state.h--;
		},
        0x2c => { //INR L
            // state.l = addByte(state, state.l, 1, PRESERVE_CARRY);
		},
        0x2d => { //DCR L
            // state.l = subtractByte(state, state.l, 1, PRESERVE_CARRY);
        },
        0x2e => { // MVI L,byte
            // state.l = opcode[1];
            // state.pc++;
		},
        0x2f => { // CMA
            // state.a ^= 0xFF;
		},
        0x30 => {  // NOP
		},
        0x31 => { // LXI SP, word
            // state.sp = (opcode[2] << 8) | opcode[1];
            // state.pc += 2;
		},
        0x32 => { // STA word
            // uint16_t offset = (opcode[2] << 8) | (opcode[1]);
            // state.memory[offset] = state.a;
            // state.pc += 2;
        },
        0x33 => { // INX SP
            // state.sp++;
		},
        0x34 => { // INR M
            // uint16_t offset = (state.h << 8) | state.l;
            // state.memory[offset] = addByte(state, state.memory[offset], 1, PRESERVE_CARRY);
        },
        0x35 => { // DCR M
            // uint16_t offset = (state.h << 8) | state.l;
            // state.memory[offset] = subtractByte(state, state.memory[offset], 1, PRESERVE_CARRY);
        },
        0x36 => { // MVI M, byte
            // AC set if lower nibble of h was zero prior to dec
            // uint16_t offset = (state.h << 8) | state.l;
            // state.memory[offset] = opcode[1];
            // state.pc++;
        },
        0x37 => {  // STC
            // state.cc.cy = 1;
        },
        0x38 => { 
            // InvalidInstruction(state);
		},
        0x39 => { // DAD SP
            // uint16_t hl = (state.h << 8) | state.l;
            // uint16_t sp = state.sp;
            // uint32_t res = hl + sp;
            // state.h = (res & 0xff00) >> 8;
            // state.l = res & 0xff;
            // state.cc.cy = ((res & 0xffff0000) > 0);
		},
        0x3a => { // LDA word
            // uint16_t offset = (opcode[2] << 8) | (opcode[1]);
            // state.a = state.memory[offset];
            // state.pc += 2;
        },
        0x3b => { // DCX SP
            // state.sp--;
        },
        0x3c => { // INR A
            // state.a = addByte(state, state.a, 1, PRESERVE_CARRY);
        },
        0x3d => { // DCR A
            // state.a = subtractByte(state, state.a, 1, PRESERVE_CARRY);
        },

        0x3e => { // MVI A, byte
            state.a = opcode;
            pc += 1;
        },


        0x3f => { // CMC
            if !state.cc.cy
                { state.cc.cy = true; }
            else
                { state.cc.cy = false; }
        },

        // MOV B, B
        0x40 => instructions::data_transfer::mov(types::RegM::B, types::RegM::B, state),

        // MOV B, C
        0x41 => instructions::data_transfer::mov(types::RegM::B, types::RegM::C, state),

        // MOV B, D
        0x42 => instructions::data_transfer::mov(types::RegM::B, types::RegM::D, state),

        // MOV B, E
        0x43 => instructions::data_transfer::mov(types::RegM::B, types::RegM::E, state),

        // MOV B, H
        0x44 => instructions::data_transfer::mov(types::RegM::B, types::RegM::H, state),

        // MOV B, L
        0x45 => instructions::data_transfer::mov(types::RegM::B, types::RegM::L, state),

        // MOV B, M
        0x46 => instructions::data_transfer::mov(types::RegM::B, types::RegM::M, state),

        // MOV B, A
        0x47 => instructions::data_transfer::mov(types::RegM::B, types::RegM::A, state),

        // MOV C, B
        0x48 => instructions::data_transfer::mov(types::RegM::C, types::RegM::B, state),

        // MOV C, C
        0x49 => instructions::data_transfer::mov(types::RegM::C, types::RegM::C, state),

        // MOV C, D
        0x4a => instructions::data_transfer::mov(types::RegM::C, types::RegM::D, state),

        // MOV C, E
        0x4b => instructions::data_transfer::mov(types::RegM::C, types::RegM::E, state),

        // MOV C, H
        0x4c => instructions::data_transfer::mov(types::RegM::C, types::RegM::H, state),

        // MOV C, L
        0x4d => instructions::data_transfer::mov(types::RegM::C, types::RegM::L, state),

        // MOV C, M
        0x4e => instructions::data_transfer::mov(types::RegM::C, types::RegM::M, state),

        // MOV C, A
        0x4f => instructions::data_transfer::mov(types::RegM::C, types::RegM::A, state),

        // MOV D, B
        0x50 => instructions::data_transfer::mov(types::RegM::D, types::RegM::B, state),

        // MOV D, C
        0x51 => instructions::data_transfer::mov(types::RegM::D, types::RegM::C, state),

        // MOV D, D
        0x52 => instructions::data_transfer::mov(types::RegM::D, types::RegM::D, state),

        // MOV D, E
        0x53 => instructions::data_transfer::mov(types::RegM::D, types::RegM::E, state),

        // MOV D, H
        0x54 => instructions::data_transfer::mov(types::RegM::D, types::RegM::H, state),

        // MOV D, L
        0x55 => instructions::data_transfer::mov(types::RegM::D, types::RegM::L, state),

        // MOV D, M
        0x56 => instructions::data_transfer::mov(types::RegM::D, types::RegM::M, state),

        // MOV D, A
        0x57 => instructions::data_transfer::mov(types::RegM::D, types::RegM::A, state),

        // MOV E, B
        0x58 => instructions::data_transfer::mov(types::RegM::E, types::RegM::B, state),

        // MOV E, C
        0x59 => instructions::data_transfer::mov(types::RegM::E, types::RegM::C, state),

        // MOV E, D
        0x5a => instructions::data_transfer::mov(types::RegM::E, types::RegM::D, state),

        // MOV E, E
        0x5b => instructions::data_transfer::mov(types::RegM::E, types::RegM::E, state),

        // MOV E, H
        0x5c => instructions::data_transfer::mov(types::RegM::E, types::RegM::H, state),

        // MOV E, L
        0x5d => instructions::data_transfer::mov(types::RegM::E, types::RegM::L, state),

        // MOV E, M
        0x5e => instructions::data_transfer::mov(types::RegM::E, types::RegM::M, state),

        // MOV E, A
        0x5f => instructions::data_transfer::mov(types::RegM::E, types::RegM::A, state),

        // MOV H, B
        0x60 => instructions::data_transfer::mov(types::RegM::H, types::RegM::B, state),

        // MOV H, C
        0x61 => instructions::data_transfer::mov(types::RegM::H, types::RegM::C, state),

        // MOV H, D
        0x62 => instructions::data_transfer::mov(types::RegM::H, types::RegM::D, state),

        // MOV H, E
        0x63 => instructions::data_transfer::mov(types::RegM::H, types::RegM::E, state),

        // MOV H, H
        0x64 => instructions::data_transfer::mov(types::RegM::H, types::RegM::H, state),

        // MOV H, L
        0x65 => instructions::data_transfer::mov(types::RegM::H, types::RegM::L, state),

        // MOV H, M
        0x66 => instructions::data_transfer::mov(types::RegM::H, types::RegM::M, state),

        // MOV H, A
        0x67 => instructions::data_transfer::mov(types::RegM::H, types::RegM::A, state),

        // MOV L, B
        0x68 => instructions::data_transfer::mov(types::RegM::L, types::RegM::B, state),

        // MOV L, C
        0x69 => instructions::data_transfer::mov(types::RegM::L, types::RegM::C, state),

        // MOV L, D
        0x6a => instructions::data_transfer::mov(types::RegM::L, types::RegM::D, state),

        // MOV L, E
        0x6b => instructions::data_transfer::mov(types::RegM::L, types::RegM::E, state),

        // MOV L, H
        0x6c => instructions::data_transfer::mov(types::RegM::L, types::RegM::H, state),

        // MOV L, L
        0x6d => instructions::data_transfer::mov(types::RegM::L, types::RegM::L, state),

        // MOV L, M
        0x6e => instructions::data_transfer::mov(types::RegM::L, types::RegM::M, state),

        // MOV L, A
        0x6f => instructions::data_transfer::mov(types::RegM::L, types::RegM::A, state),

        // MOV M, B
        0x70 => instructions::data_transfer::mov(types::RegM::M, types::RegM::B, state),

        // MOV M, C
        0x71 => instructions::data_transfer::mov(types::RegM::M, types::RegM::C, state),

        // MOV M, D
        0x72 => instructions::data_transfer::mov(types::RegM::M, types::RegM::D, state),

        // MOV M, E
        0x73 => instructions::data_transfer::mov(types::RegM::M, types::RegM::E, state),

        // MOV M, H
        0x74 => instructions::data_transfer::mov(types::RegM::M, types::RegM::H, state),

        // MOV M, L
        0x75 => instructions::data_transfer::mov(types::RegM::M, types::RegM::L, state),

        // HLT
        0x76 => return true,

        // MOV M, A
        0x77 => instructions::data_transfer::mov(types::RegM::M, types::RegM::A, state),

        // MOV A, B
        0x78 => instructions::data_transfer::mov(types::RegM::A, types::RegM::B, state),

        // MOV A, C
        0x79 => instructions::data_transfer::mov(types::RegM::A, types::RegM::C, state),

        // MOV A, D
        0x7a => instructions::data_transfer::mov(types::RegM::A, types::RegM::D, state),

        // MOV A, E
        0x7b => instructions::data_transfer::mov(types::RegM::A, types::RegM::E, state),

        // MOV A, H
        0x7c => instructions::data_transfer::mov(types::RegM::A, types::RegM::H, state),

        // MOV A, L
        0x7d => instructions::data_transfer::mov(types::RegM::A, types::RegM::L, state),

        // MOV A, M
        0x7e => instructions::data_transfer::mov(types::RegM::A, types::RegM::M, state), 

        // MOV A, A
        0x7f => instructions::data_transfer::mov(types::RegM::A, types::RegM::M, state),

        0x80 => { // ADD B
            state.a = addByte(state, state.a, state.b, UPDATE_CARRY);
        }, 

        0x81 => { // ADD C
            state.a = addByte(state, state.a, state.c, UPDATE_CARRY);
        }, 

        0x82 => { // ADD D
            state.a = addByte(state, state.a, state.d, UPDATE_CARRY);
        }, 

        0x83 => { // ADD E
            state.a = addByte(state, state.a, state.e, UPDATE_CARRY);
        }, 

        0x84 => { // ADD H
            state.a = addByte(state, state.a, state.h, UPDATE_CARRY);
        }, 

        0x85 => { // ADD L
            state.a = addByte(state, state.a, state.l, UPDATE_CARRY);
        }, 

        0x86 => { // ADD M
            uint16_t offset = (state.h << 8) | (state.l);
            state.a = addByte(state, state.a, state.memory[offset], UPDATE_CARRY);
        }, 

        0x87 => { // ADD A
            state.a = addByte(state, state.a, state.a, UPDATE_CARRY);
        }, 
        0x88 => { // ADC B
            state.a = addByteWithCarry(state, state.a, state.b, UPDATE_CARRY);
        }, 

        0x89 => { // ADC C
            state.a = addByteWithCarry(state, state.a, state.c, UPDATE_CARRY);
        }, 

        0x8a => { // ADC D
            state.a = addByteWithCarry(state, state.a, state.d, UPDATE_CARRY);
        }, 

        0x8b => { // ADC E
            state.a = addByteWithCarry(state, state.a, state.e, UPDATE_CARRY);
        }, 

        0x8c => { // ADC H
            state.a = addByteWithCarry(state, state.a, state.h, UPDATE_CARRY);
        }, 

        0x8d => { // ADC L
            state.a = addByteWithCarry(state, state.a, state.l, UPDATE_CARRY);
        }, 

        0x8e => { // ADC M
            uint16_t offset = (state.h << 8) | (state.l);
            state.a = addByteWithCarry(state, state.a, state.memory[offset], UPDATE_CARRY);
        }, 
        0x8f => { // ADC A
            state.a = addByteWithCarry(state, state.a, state.a, UPDATE_CARRY);
        }, 

        0x90 => { // SUB B
            state.a = subtractByte(state, state.a, state.b, UPDATE_CARRY);
        }, 

        0x91 => { // SUB C
            state.a = subtractByte(state, state.a, state.c, UPDATE_CARRY);
        }, 

        0x92 => { // SUB D
            state.a = subtractByte(state, state.a, state.d, UPDATE_CARRY);
        }, 

        0x93 => { // SUB E
            state.a = subtractByte(state, state.a, state.e, UPDATE_CARRY);
        }, 

        0x94 => { // SUB H
            state.a = subtractByte(state, state.a, state.h, UPDATE_CARRY);
        }, 

        0x95 => { // SUB L
            state.a = subtractByte(state, state.a, state.l, UPDATE_CARRY);
        }, 

        0x96 => { // SUB M
            uint16_t offset = (state.h << 8) | (state.l);
            state.a = subtractByte(state, state.a, state.memory[offset], UPDATE_CARRY);
        }, 

        0x97 => { // SUB A
            state.a = subtractByte(state, state.a, state.a, UPDATE_CARRY);
        }, 

        0x98 => { // SBB B
            state.a = subtractByteWithBorrow(state, state.a, state.b, UPDATE_CARRY);
        }, 

        0x99 => { // SBB C
            state.a = subtractByteWithBorrow(state, state.a, state.c, UPDATE_CARRY);
        }, 

        0x9a => { // SBB D
            state.a = subtractByteWithBorrow(state, state.a, state.d, UPDATE_CARRY);
        }, 

        0x9b => { // SBB E
            state.a = subtractByteWithBorrow(state, state.a, state.e, UPDATE_CARRY);
        }, 

        0x9c => { // SBB H
            state.a = subtractByteWithBorrow(state, state.a, state.h, UPDATE_CARRY);
        }, 

        0x9d => { // SBB L
            state.a = subtractByteWithBorrow(state, state.a, state.l, UPDATE_CARRY);
        }, 

        0x9e => { // SBB M
            uint16_t offset = (state.h << 8) | (state.l);
            state.a = subtractByteWithBorrow(state, state.a, state.memory[offset], UPDATE_CARRY);
        }, 
        0x9f => { // SBB A
            state.a = subtractByteWithBorrow(state, state.a, state.a, UPDATE_CARRY);
        }, 
        0xa0 => { // ANA B
            state.a = state.a & state.b;
            LogicFlagsA(state, 1);
        }, 

        0xa1 => { // ANA C
            state.a = state.a & state.c;
            LogicFlagsA(state, 1);
        }, 

        0xa2 => { // ANA D
            state.a = state.a & state.d;
            LogicFlagsA(state, 1);
        }, 

        0xa3 => { // ANA E
            state.a = state.a & state.e;
            LogicFlagsA(state, 1);
        }, 

        0xa4 => { // ANA H
            state.a = state.a & state.h;
            LogicFlagsA(state, 1);
        }, 

        0xa5 => { // ANA L
            state.a = state.a & state.l;
            LogicFlagsA(state, 1);
        }, 

        0xa6 => { // ANA M
            uint16_t offset = (state.h << 8) | (state.l);
            state.a = state.a & state.memory[offset];
            LogicFlagsA(state, 1);
        }, 

        0xa7 => { // ANA A
            state.a = state.a & state.a;
            LogicFlagsA(state, 1);
        }, 

        0xa8 => { // XRA B
            state.a = state.a ^ state.b;
            LogicFlagsA(state, 0);
        },

        0xa9 => { // XRA C
            state.a = state.a ^ state.c;
            LogicFlagsA(state, 0);
        },

        0xaa => { // XRA D
            state.a = state.a ^ state.d;
            LogicFlagsA(state, 0);
        },

        0xab => { // XRA E
            state.a = state.a ^ state.e;
            LogicFlagsA(state, 0);
        },

        0xac => { // XRA H
            state.a = state.a ^ state.h;
            LogicFlagsA(state, 0);
        },

        0xad => { // XRA L
            state.a = state.a ^ state.l;
            LogicFlagsA(state, 0);
        },

        0xae => { // XRA M
            uint16_t offset = (state.h << 8) | (state.l);
            state.a = state.a ^ state.memory[offset];
            LogicFlagsA(state, 0);
        }, 

        0xaf => { // XRA A
            state.a = state.a ^ state.a;
            LogicFlagsA(state, 0);
        },

        0xb0 => { // ORA B
            state.a = state.a | state.b;
            LogicFlagsA(state, 0);
        },

        0xb1 => { // ORA C
            state.a = state.a | state.c;
            LogicFlagsA(state, 0);
        },

        0xb2 => { // ORA D
            state.a = state.a | state.d;
            LogicFlagsA(state, 0);
        },

        0xb3 => { //  ORA E
            state.a = state.a | state.e;
            LogicFlagsA(state, 0);
        },

        0xb4 => { // ORA H
            state.a = state.a | state.h;
            LogicFlagsA(state, 0);
        },

        0xb5 => { // ORA L
            state.a = state.a | state.l;
            LogicFlagsA(state, 0);
        },

        0xb6 => { // ORA M
            uint16_t offset = (state.h << 8) | (state.l);
            state.a = state.a | state.memory[offset];
            LogicFlagsA(state, 0);
        }, 

        0xb7 => { // ORA A
            state.a = state.a | state.a;
            LogicFlagsA(state, 0);
        },

        0xb8 => { // CMP B
            subtractByte(state, state.a, state.b, UPDATE_CARRY);
        }, 

        0xb9 => { // CMP C
            subtractByte(state, state.a, state.c, UPDATE_CARRY);
        }, 

        0xba => { // CMP D
            subtractByte(state, state.a, state.d, UPDATE_CARRY);
        }, 

        0xbb => { // CMP E
            subtractByte(state, state.a, state.e, UPDATE_CARRY);
        }, 

        0xbc => { // CMP H
            subtractByte(state, state.a, state.h, UPDATE_CARRY);
        }, 

        0xbd => { // CMP L
            subtractByte(state, state.a, state.l, UPDATE_CARRY);
        }, 

        0xbe => { // CMP M
            uint16_t offset = (state.h << 8) | (state.l);
            subtractByte(state, state.a, state.memory[offset], UPDATE_CARRY);
        }, 

        0xbf => { // CMP A
            subtractByte(state, state.a, state.a, UPDATE_CARRY);
        }, 

        0xc0 => { // RNZ
            if (0 == state.cc.z)
                returnToCaller(state, offset);
        }, 

        0xc1 => { // POP B
            state.c = state.memory[state.sp];
            state.b = state.memory[state.sp + 1];
            state.sp += 2;
        }, 

        0xc2 => { // JNZ Addr
            if (0 == state.cc.z)
                state.pc = offset + ((opcode[2] << 8) | opcode[1]);
            else
                state.pc += 2;
        }, 

        0xc3 => { // JMP Addr
            state.pc = offset + ((opcode[2] << 8) | opcode[1]);
        }, 

        0xc4 => { // CNZ Addr
            if (0 == state.cc.z) {
                uint16_t pc = state.pc;
                state.memory[state.sp - 1] = (pc >> 8) & 0xff;
                state.memory[state.sp - 2] = (pc & 0xff);
                state.sp = state.sp - 2;
                state.pc = (opcode[2] << 8) | opcode[1];
            } else
                state.pc += 2;
        }, 

        0xc5 => { // PUSH   B
            state.memory[state.sp - 1] = state.b;
            state.memory[state.sp - 2] = state.c;
            state.sp = state.sp - 2;
        }, 

        0xc6 => { // ADI byte
            uint16_t x = (uint16_t)state.a + (uint16_t)opcode[1];
            state.cc.z = ((x & 0xff) == 0);
            state.cc.s = (0x80 == (x & 0x80));
            state.cc.p = parity((x & 0xff), 8);
            state.cc.cy = (x > 0xff);
            state.a = (uint8_t)x;
            state.pc++;
        }, 

        0xc7 => { // RST 0
            UnimplementedInstruction(state);
        }, 

        0xc8 => { // RZ
            if (1 == state.cc.z)
                returnToCaller(state, offset);
        }, 

        0xc9 => { // RET
            returnToCaller(state, offset);
        }, 

        0xca => { // JZ Addr
            if 1 == state.cc.z
                state.pc = offset + ((opcode[2] << 8) | opcode[1]);
            else
                state.pc += 2;
        }, 

        0xcb => { 
            InvalidInstruction(state);
        }, 

        0xcc => { // CZ Addr
            if (1 == state.cc.z)
                call(state, offset, (opcode[2] << 8) | opcode[1]);
            else
                state.pc += 2;
        }, 

        0xcd => { // CALL Addr
            call(state, offset, (opcode[2] << 8) | opcode[1]);
        }, 

        0xce => { // ACI d8
            state.a = addByteWithCarry(state, state.a, opcode[1], UPDATE_CARRY);
            state.pc++;
        }, 

        0xcf => { // RST 1
            UnimplementedInstruction(state);
        }, 

        0xd0 => { // RNC
            if (0 == state.cc.cy)
                returnToCaller(state, offset);
        }, 

        0xd1 => { // POP D
            state.e = state.memory[state.sp];
            state.d = state.memory[state.sp + 1];
            state.sp += 2;
        }, 

        0xd2 => { // JNC Addr
            if (0 == state.cc.cy)
                state.pc = offset + ((opcode[2] << 8) | opcode[1]);
            else
                state.pc += 2;
        }, 

        0xd3 => { 
            // TODO Don't know what to do here (yet)
            state.pc++;
        }, 

        0xd4 => { // CNC Addr
            if (0 == state.cc.cy)
                call(state, offset, (opcode[2] << 8) | opcode[1]);
            else
                state.pc += 2;
        }, 

        0xd5 => { // PUSH   D
            state.memory[state.sp - 1] = state.d;
            state.memory[state.sp - 2] = state.e;
            state.sp = state.sp - 2;
        }, 
        0xd6 => { // SUI d8
            state.a = subtractByte(state, state.a, opcode[1], UPDATE_CARRY);
            state.pc++;
        }, 

        0xd7 => { // RST 2
            UnimplementedInstruction(state);
        }, 

        0xd8 => { // RC
            if (1 == state.cc.cy)
                returnToCaller(state, offset);
        }, 

        0xd9 => { 
            InvalidInstruction(state);
        }, 

        0xda => { // JC Addr
            if (1 == state.cc.cy)
                state.pc = offset + ((opcode[2] << 8) | opcode[1]);
            else
                state.pc += 2;
        }, 

        0xdb => { //  IN d8
            UnimplementedInstruction(state);
        },

        0xdc => { // CC Addr
            if (1 == state.cc.cy)
                call(state, offset, (opcode[2] << 8) | opcode[1]);
            else
                state.pc += 2;
        }, 

        0xdd => { 
            InvalidInstruction(state);
        }, 

        0xde => { // SBI d8
            state.a = subtractByteWithBorrow(state, state.a, opcode[1], UPDATE_CARRY);
            state.pc++;
        }, 

        0xdf => { // RST 3
            UnimplementedInstruction(state);
        }, 

        0xe0 => { // RPO
            if (0 == state.cc.cy)
                returnToCaller(state, offset);
        }, 

        0xe1 => { // POP H
            state.l = state.memory[state.sp];
            state.h = state.memory[state.sp + 1];
            state.sp += 2;
        }, 

        0xe2 => { // JPO Addr
            if (0 == state.cc.p)
                state.pc = offset + ((opcode[2] << 8) | opcode[1]);
            else
                state.pc += 2;
        }, 

        0xe3 => { // XTHL
            uint16_t spL = state.memory[state.sp];
            uint16_t spH = state.memory[state.sp + 1];
            state.memory[state.sp] = state.l;
            state.memory[state.sp + 1] = state.h;
            state.h = spH;
            state.l = spL;
        }, 

        0xe4 => { // CPO Addr
            if (0 == state.cc.p)
                call(state, offset, (opcode[2] << 8) | opcode[1]);
            else
                state.pc += 2;
        }, 

        0xe5 => { // PUSH H
            state.memory[state.sp - 1] = state.h;
            state.memory[state.sp - 2] = state.l;
            state.sp = state.sp - 2;
        }, 

        0xe6 => { // ANI byte
            state.a = state.a & opcode[1];
            LogicFlagsA(state, 1);
            state.pc++;
        }, 

        0xe7 => { // RST 4
            UnimplementedInstruction(state);
        }, 

        0xe8 => { // RPE
            if (0 == state.cc.cy)
                returnToCaller(state, offset);
        }, 

        0xe9 => { // PCHL
            state.pc = (state.h << 8) | state.l;
        }, 

        0xea => { // JPE Addr
            if (1 == state.cc.p)
                state.pc = offset + ((opcode[2] << 8) | opcode[1]);
            else
                state.pc += 2;
        }, 

        0xeb => { // XCHG
            uint8_t save1 = state.d;
            uint8_t save2 = state.e;
            state.d = state.h;
            state.e = state.l;
            state.h = save1;
            state.l = save2;
        }, 

        0xec => { // CPE Addr
            if (1 == state.cc.p)
                call(state, offset, (opcode[2] << 8) | opcode[1]);
            else
                state.pc += 2;
        }, 

        0xed => { 
            InvalidInstruction(state);
        }, 

        0xee => { // XRI d8
            state.a = state.a ^ opcode[1];
            LogicFlagsA(state, 0);
            state.pc++;
        }, 

        0xef => { // RST 5
            UnimplementedInstruction(state);
        }, 

        0xf0 => { // RP
            if (0 == state.cc.s)
                returnToCaller(state, offset);
        }, 

        0xf1 => { //POP PSW
            state.a = state.memory[state.sp + 1];
            uint8_t psw = state.memory[state.sp];
            state.cc.z = (0x01 == (psw & 0x01));
            state.cc.s = (0x02 == (psw & 0x02));
            state.cc.p = (0x04 == (psw & 0x04));
            state.cc.cy = (0x05 == (psw & 0x08));
            state.cc.ac = (0x10 == (psw & 0x10));
            state.sp += 2;
        }, 

        0xf2 => { // JP Addr
            if (0 == state.cc.s)
                state.pc = offset + ((opcode[2] << 8) | opcode[1]);
            else
                state.pc += 2;
        }, 

        0xf3 => { // DI
            UnimplementedInstruction(state);
        }, 

        0xf4 => { // CP Addr
            if (0 == state.cc.s)
                call(state, offset, (opcode[2] << 8) | opcode[1]);
            else
                state.pc += 2;
        }, 

        0xf5 => { // PUSH PSW
            state.memory[state.sp - 1] = state.a;
            uint8_t psw = (state.cc.z |
                        state.cc.s << 1 |
                        state.cc.p << 2 |
                        state.cc.cy << 3 |
                        state.cc.ac << 4);
            state.memory[state.sp - 2] = psw;
            state.sp = state.sp - 2;
        }, 

        0xf6 => { // ORI d8
            state.a = state.a | opcode[1];
            LogicFlagsA(state, 0);
            state.pc++;
        }, 

        0xf7 => { // RST 6
            UnimplementedInstruction(state);
        }, 

        0xf8 => { // RM
            if (1 == state.cc.s)
                returnToCaller(state, offset);
        }, 

        0xf9 => { // SPHL
            state.sp = (state.h << 8) | state.l;
        }, 

        0xfa => { // JM Addr
            if (1 == state.cc.s)
                state.pc = offset + ((opcode[2] << 8) | opcode[1]);
            else
                state.pc += 2;
        }, 

        0xfb => { // EI
            state.int_enable = 1;
        },

        0xfc => { // CM Addr
            if (1 == state.cc.s)
                call(state, offset, (opcode[2] << 8) | opcode[1]);
            else
                state.pc += 2;
        }, 

        0xfd => { 
            InvalidInstruction(state);
        }, 

        0xfe => { // CPI d8
            uint8_t x = state.a - opcode[1];
            state.cc.z = (x == 0);
            state.cc.s = (0x80 == (x & 0x80));
            state.cc.p = parity(x, 8);
            state.cc.cy = (state.a < opcode[1]);
            state.pc++;
        }, 

        0xff => { // RST 7
            UnimplementedInstruction(state);
        }, 
    }

    state.pc = pc.try_into().unwrap();
    return true;
}

pub fn LoadProgram(mut state: &mut State8085, lines: Vec<u8>, offset: usize) -> &State8085 {
    let mut counter = 0;
    for line in lines.iter() {
		println!("line {0}\n", line);
        state.memory[offset + counter] = *line;
        counter += 1;
    }
	println!("Offset {0}\n", offset);
	println!("Memory at offset {0}\n", state.memory[offset]);
	return state;
}

pub fn ExecuteProgram(mut state: &mut State8085, offset: usize) -> &State8085 {
	let mut done = false;
	let mut cycles = 0;

	println!("SP Ptr: {0}\n", state.sp);
	println!("Offset {0}\n", offset);
	state.pc = offset.try_into().unwrap(); // Try to convert to u16 and panic if that fails
	state.sp = 0xFFFF;
	println!("Memory at offset {0}\n", state.memory[offset]);
	println!("Memory at offset + 1 {0}\n", state.memory[offset + 1]);

	while !done
	{
		if cycles > 10000
			{ exit(2); }
		done = Emulate8085Op(state, offset);
		cycles += 1;
	}
	print!("{}", if state.cc.z { 'z' } else { '.' });
	print!("{}", if state.cc.s { 's' } else { '.' });
	print!("{}", if state.cc.p { 'p' } else { '.' });
	print!("{}", if state.cc.cy { 'c' } else { '.' });
    print!("{}", if state.cc.ac { 'a' } else { '.' });
    /*
	println!("A $%02x B $%02x C $%02x D $%02x E $%02x H $%02x L $%02x SP %04x PC %04x\n", state.a, state.b, state.c,
           state.d, state.e, state.h, state.l, state.sp, state.pc);
    */
	return state;
}
