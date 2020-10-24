mod utils;

use std::convert::TryInto;
use std::convert::TryFrom;
use std::process::exit;

// When the `wee_alloc` feature is enabled, this uses `wee_alloc` as the global
// allocator.
//
// If you don't want to use `wee_alloc`, you can safely delete this.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

struct Flags {
	z: bool, // 1 bit
	s: bool, // 1 bit
	p: bool, // 1 bit
	cy: bool, // 1 bit
    ac: bool, // 1 bit

    // pad: 3, // 3 bits
    // Total: 8 bits
}

struct State8085
{
	a: u8,
	b: u8,
	c: u8,
	d: u8,
	e: u8,
	h: u8,
	l: u8,
	sp: u16,
	pc: u16,
	cc: Flags,
	int_enable: u8,
	memory: [u8; 65535],
}

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

	println!("Emulating instruction at {}\n", state.pc);
    println!("Emulating instruction {}\n", opcode);

	if offset == pc
		{ state.sp = 0xFFFF; }

	//Disassemble8085Op(state.memory, state.pc);

    pc += 1;

	match state.memory[pc - 1] {

        0x00 => { // NOP
        },

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
        0x06 => { // MVI B, byte
            // state.b = opcode[1];
            // state.pc += 1;
		},
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

        0x76 => { // HLT
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
