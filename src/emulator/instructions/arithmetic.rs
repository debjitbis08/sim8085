use crate::types::RegM;
use crate::types::RegPair;
use crate::types::State8085;
use crate::utils;
use std::convert::TryInto;

/**
 * Arithmetic Group
 * ================
 *
 * The arithmetic instructions add, subtract, increment, or decrement data in registers or memory.
 *
 *     ----------------------------------------------------------------------
 *     | ADD       | Add to Accumulator                              		|
 *     ----------------------------------------------------------------------
 *     | ADI       | Add Immediate Data to Accumulator               		|
 *     ----------------------------------------------------------------------
 *     | ADC       | Add to Accumulator Using Carry Flag             		|
 *     ----------------------------------------------------------------------
 *     | ACI       | Add Immediate Data to Accumulator Using Carry Flag     |
 *     ----------------------------------------------------------------------
 *     | SUB       | Subtract from Accumulator     							|
 *     ----------------------------------------------------------------------
 *     | SUI       | Subtract Immediate Data from Accumulator      			|
 *     ----------------------------------------------------------------------
 *     | SBB       | Subtract from Accumulator Using Borrow (Carry) Flag    |
 *     ----------------------------------------------------------------------
 *     | SBI       | Subtract Immediate from Accumulator Using Borrow 	 	|
 *     ----------------------------------------------------------------------
 *     | INR       | Increment Specified Byte by One   						|
 *     ----------------------------------------------------------------------
 *     | DCR       | Decrement Specified Byte by One                  		|
 *     ----------------------------------------------------------------------
 *     | INX       | Increment Register Pair by One               			|
 *     ----------------------------------------------------------------------
 *     | DCX       | Decrement Register Pair by One               			|
 *     ----------------------------------------------------------------------
 *     | DAD       | Double Register Add:									|
 *     |           | Add Contents of Register Pair to Hand L Register Pair	|
 *     ----------------------------------------------------------------------
 */

#[derive(PartialEq)]
pub enum ShouldPreserveCarry {
	PreserveCarry,
	UpdateCarry,
}

fn update_arithmetic_flags(
	result: u16,
	should_preserve_carry: ShouldPreserveCarry,
	state: &mut State8085,
) {
	if should_preserve_carry == ShouldPreserveCarry::UpdateCarry {
		state.cpu.cc.cy = result > 0xff;
	}

	state.cpu.cc.z = (result & 0xff) == 0;
	state.cpu.cc.s = 0x80 == (result & 0x80);
	state.cpu.cc.p = utils::parity((result & 0xff).try_into().unwrap());
}

fn addBytes(
	lhs: u8,
	rhs: u8,
	should_preserve_carry: ShouldPreserveCarry,
	state: &mut State8085,
) -> u8 {
	let result: u16 = (lhs as u16) + (rhs as u16);
	update_arithmetic_flags(result, should_preserve_carry, state);

	if (lhs & 0xf) + (rhs & 0xf) > 0xf {
		state.cpu.cc.ac = true;
	}

	return (result & 0xff).try_into().unwrap();
}

fn addToAcc(reg: u8, state: &mut State8085) -> u8 {
	return addBytes(state.cpu.a, reg, ShouldPreserveCarry::UpdateCarry, state);
}

/**
 * ADD
 * ===
 *
 * The ADD instruction adds one byte of data to the contents of the accumulator. The result is stored in the
 * accumulator. Notice that the ADD instruction excludes the carry flag from the addition but sets the flag to
 * indicate the outcome of the operation.
 *
 * Add Register to Register
 * ------------------------
 *
 * 		Opcode	Operand
 * 		ADD		reg
 *
 * The operand must specify one of the registers A through E, H or L. The instruction adds the contents of the
 * specified register to the contents of the accumulator and stores the result in the accumulator.
 *
 *                      ---------------------
 *                      | 1 0 0 0 0 | S S S |
 *                      ---------------------
 *                      Cycles: 1
 *                      States: 4
 *                      Addressing: register
 *                      Flags: Z,S,P,CY,AC
 *
 * Add from Memory
 * ---------------
 *
 * 		Opcode	Operand
 * 		ADD		M
 *
 * This instruction adds the contents of the memory location addressed by the Hand L registers to the contents of
 * the accumulator and stores the result in the accumulator. M is a symbolic reference to the Hand L registers.
 *
 *                      -------------------
 *                      | 1 0 0 0 0 1 1 0 |
 *                      -------------------
 *                      Cycles: 2
 *                      States: 7
 *                      Addressing: register indirect
 *                      Flags: Z,S,P,CY,AC
 */
pub fn add(reg: RegM, state: &mut State8085) {
	state.cpu.a = addToAcc(utils::read_register(reg, state), state);
}

/**
 * ADI
 * ===
 *
 * ADI adds the contents of the second instruction byte of the contents of the accumulator and stores the result
 * in the accumulator.
 *
 * 		Opcode	Operand
 * 		ADD		data
 *
 * The operand specifies the actual data to be added to the accumulator. This data may be in the form of a number,
 * an ASCII constant, the label of a previously defined value, or an expression. The data may not exceed one byte.
 *
 * The assembler's relocation feature treats all external and relocatable symbols as 16-bit addresses. When one of
 * these symbols appears in the operand expression of an immediate instruction, it must be preceded by either
 * the HIGH or LOW operator to specify which byte of the address is to be used in the evaluation of the expression.
 * When neither operator is present, the assembler assumes the LOW operator and issues an error message.
 *
 *                      -------------------
 *                      | 1 1 0 0 0 1 1 0 |
 *                      -------------------
 *                      |      data       |
 *                      -------------------
 *                      Cycles: 2
 *                      States: 7
 *                      Addressing: immediate
 *                      Flags: Z,S,P,CY,AC
 */
pub fn adi(data: u8, state: &mut State8085) {
	state.cpu.a = addToAcc(data, state);
	state.cpu.pc += 1;
}

pub fn addWithCarry(
	lhs: u8,
	rhs: u8,
	should_preserve_carry: ShouldPreserveCarry,
	state: &mut State8085,
) -> u8 {
	let res: u16 = (lhs as u16) + (rhs as u16) + (if state.cpu.cc.cy { 1 } else { 0 });
	update_arithmetic_flags(res, should_preserve_carry, state);
	return (res & 0xff).try_into().unwrap();
}

fn addToAccWithCarry(data: u8, state: &mut State8085) -> u8 {
	return addWithCarry(state.cpu.a, data, ShouldPreserveCarry::UpdateCarry, state);
}

/**
 * ADD WITH CARRY
 * ==============
 *
 * The ADC instruction adds one byte of data plus the setting of the carry flag to the contents of the accumulator.
 * The result is stored in the accumulator. ADC then updates the setting of the carry flag to indicate the outcome
 * of the operation.
 *
 * The ADC instruction's use of the carry bit enables the program to add multi-byte numeric strings.
 *
 * Add Register to Accumulator with Carry
 * --------------------------------------
 *
 * 		Opcode	Operand
 * 		ADC		reg
 *
 * The operand must specify one of the registers A through E, H or L. This instruction adds the contents of the
 * specified register and the carry bit to the accumulator and stores the result in the accumulator.
 *
 *                      ---------------------
 *                      | 1 0 0 0 1 | S S S |
 *                      ---------------------
 *                      Cycles: 1
 *                      States: 4
 *                      Addressing: register
 *                      Flags: Z,S,P,CY,AC
 *
 * Add Memory to Accumulator with Carry
 * ------------------------------------
 *
 * 		Opcode	Operand
 * 		ADC		M
 *
 * This instruction adds the contents of the memory location addressed by the Hand L registers and the carry
 * bit to the accumulator and stores the result in the accumulator. M is a symbolic reference to the Hand L registers.
 *
 *                      -------------------
 *                      | 1 0 0 0 0 1 1 0 |
 *                      -------------------
 *                      Cycles: 2
 *                      States: 7
 *                      Addressing: register indirect
 *                      Flags: Z,S,P,CY,AC
 */
pub fn adc(reg: RegM, state: &mut State8085) {
	state.cpu.a = addToAccWithCarry(utils::read_register(reg, state), state);
}

/**
 * ADD IMMEDIATE WITH CARRY
 * ========================
 *
 * ACI adds the contents of the second instruction byte and the carry bit to the contents of the accumulator and
 * stores the result in the accumulator.
 *
 * 		Opcode	Operand
 * 		ACI		data
 *
 * The operand specifies the actual data to be added to the accumulator except, of course, for the carry bit. Data
 * may be in the form of a number, an ASCII constant, the label of a previously defined value, or an expression.
 * The data may not exceed one byte.
 *
 * The assembler's relocation feature treats all external and relocatable symbols as 16-bit addresses. When one of
 * these symbols appears in the operand expression of an immediate instruction, it must be preceded by either the
 * HIGH or LOW operator to specify which byte of the address is to be used in the evaluation of the expression.
 * When neither operator is present, the assembler assumes the LOW operator and issues an error message.
 *
 *                      -------------------
 *                      | 1 1 0 0 1 1 1 0 |
 *                      -------------------
 *                      |      data       |
 *                      -------------------
 *                      Cycles: 2
 *                      States: 7
 *                      Addressing: immediate
 *                      Flags: Z,S,P,CY,AC
 */
pub fn aci(data: u8, state: &mut State8085) {
	state.cpu.a = addToAccWithCarry(data, state);
	state.cpu.pc += 1;
}

pub fn subtract(lhs: u8, rhs: u8, should_preserve_carry: ShouldPreserveCarry, state: &mut State8085) -> u8 {
	let res = lhs - rhs;

	update_arithmetic_flags(res.into(), should_preserve_carry, state);

	if (lhs & 0xf) + (!rhs & 0xf) + 1 > 0xf {
		state.cpu.cc.ac = true;
	}

	return res;
}

fn _sub(data: u8, state: &mut State8085) -> u8 {
	return subtract(state.cpu.a, data, ShouldPreserveCarry::UpdateCarry, state);
}

/**
 * SUBTRACT
 * ========
 *
 * The SUB instruction subtracts one byte of data from the contents of the accumulator. The result is stored in the
 * accumulator. SUB uses two's complement representation of data as explained in Chapter 2. Notice that the SUB
 * instruction excludes the carry flag (actually a 'borrow' flag for the purposes of subtraction) but sets the flag to
 * indicate the outcome of the operation.
 *
 * Subtract Register from Accumulator
 * ----------------------------------
 *
 * 		Opcode	Operand
 * 		SUB		reg
 *
 * The operands must specify one of the registers A through E, H or L. The instruction subtracts the contents of
 * the specified register from the contents of the accumulator using two's complement data representation. The
 * result is stored in the accumulator.
 *
 *                      ---------------------
 *                      | 1 0 0 1 0 | S S S |
 *                      ---------------------
 *                      Cycles: 1
 *                      States: 4
 *                      Addressing: register
 *                      Flags: Z,S,P,CY,AC
 *
 * Subtract Memory from Accumulator
 * --------------------------------
 *
 * 		Opcode	Operand
 * 		SUB		reg
 *
 * This instruction subtracts the contents of the memory location addressed by the Hand L registers from the
 * contents of the accumulator and stores the result in the accumulator. M is a symbolic reference to the Hand L registers.
 *
 *                      -------------------
 *                      | 1 0 0 1 0 1 1 0 |
 *                      -------------------
 *                      Cycles: 2
 *                      States: 7
 *                      Addressing: register indirect
 *                      Flags: Z,S,P,CY,AC
 */
pub fn sub(reg: RegM, state: &mut State8085) {
	state.cpu.a = _sub(utils::read_register(reg, state), state);
}

/**
 * SUBTRACT IMMEDIATE
 * ==================
 *
 * SU I subtracts the contents of the second instruction byte from the contents of the accumulator and stores the
 * result in the accumulator. Notice that the SUI instruction disregards the carry ('borrow') flag during the subtraction
 * but sets the flag to indicate the outcome of the operation.
 *
 * 		Opcode	Operand
 * 		SUI		data
 *
 * The operand must specify the data to be subtracted. This data may be in the form of a number, an ASCII
 * constant, the label of some previously defined value, or an expression. The data must not exceed one byte.
 *
 * The assembler's relocation feature treats all external and relocatable symbols as 16-bit addresses. When one of
 * these symbols appears in the operand expression of an immediate instruction, it must be preceded by either the
 * HIGH or LOW operator to specify which byte of the address is to be used in the evaluation of the expression.
 * When neither operator is present, the assembler assumes the LOW operator and issues an error message.
 *
 *                      -------------------
 *                      | 1 1 0 1 0 1 1 0 |
 *                      -------------------
 *                      |      data       |
 *                      -------------------
 *                      Cycles: 2
 *                      States: 7
 *                      Addressing: immediate
 *                      Flags: Z,S,P,CY,AC
 */
pub fn sui(data: u8, state: &mut State8085) {
	state.cpu.a = _sub(data, state);
	state.cpu.pc += 1;
}

fn subtract_with_borrow(lhs: u8, rhs: u8, should_preserve_carry: ShouldPreserveCarry, state: &mut State8085) -> u8 {
	let res = lhs - rhs - (if state.cpu.cc.cy { 1 } else { 0 });
	update_arithmetic_flags(res.into(), should_preserve_carry, state);
	return res;
}

fn _sbb(data: u8, state: &mut State8085) -> u8 {
	return subtract_with_borrow(state.cpu.a, data, ShouldPreserveCarry::UpdateCarry, state);
}

pub fn sbb(reg: RegM, state: &mut State8085) {
	state.cpu.a = _sbb(utils::read_register(reg, state), state);
}

pub fn sbi(data: u8, state: &mut State8085) {
	state.cpu.a = _sbb(data, state);
	state.cpu.pc += 1;
}

fn _inx(reg_h: u8, reg_l: u8) -> (u8, u8) {
	let l = reg_l + 1;
	let h = if l == 0 { reg_h + 1 } else { reg_h };

	return (h, l);
}

pub fn inx(reg_pair: RegPair, state: &mut State8085) {
	match reg_pair {
		RegPair::B => {
			let out = _inx(state.cpu.b, state.cpu.c);
			state.cpu.c = out.1;
			state.cpu.b = out.0;
		}
		RegPair::D => {
			let out = _inx(state.cpu.d, state.cpu.e);
			state.cpu.e = out.1;
			state.cpu.d = out.0;
		}
		RegPair::H => {
			let out = _inx(state.cpu.h, state.cpu.l);
			state.cpu.l = out.1;
			state.cpu.h = out.0;
		}
		RegPair::SP => { state.cpu.sp = state.cpu.sp + 1 }
	}
}

fn _dcx(reg_h: u8, reg_l: u8) -> (u8, u8) {
	let l = reg_l - 1;
	let h = if l == 0xFF { reg_h - 1 } else { reg_h };

	return (h, l);
}

pub fn dcx(reg_pair: RegPair, state: &mut State8085) {
	match reg_pair {
		B => {
			let out = _dcx(state.cpu.b, state.cpu.c);
			state.cpu.c = out.1;
			state.cpu.b = out.0;
		}
		D => {
			let out = _dcx(state.cpu.d, state.cpu.e);
			state.cpu.e = out.1;
			state.cpu.d = out.0;
		}
		H => {
			let out = _dcx(state.cpu.h, state.cpu.l);
			state.cpu.l = out.1;
			state.cpu.h = out.0;
		}
		SP => { state.cpu.sp += 1 }
	}
}

pub fn inr(reg: RegM, state: &mut State8085) {
	match reg {
		RegM::A => state.cpu.a = addBytes(state.cpu.a, 1, ShouldPreserveCarry::PreserveCarry, state),
		RegM::B => state.cpu.b = addBytes(state.cpu.b, 1, ShouldPreserveCarry::PreserveCarry, state),
		RegM::C => state.cpu.c = addBytes(state.cpu.c, 1, ShouldPreserveCarry::PreserveCarry, state),
		RegM::D => state.cpu.d = addBytes(state.cpu.d, 1, ShouldPreserveCarry::PreserveCarry, state),
		RegM::E => state.cpu.e = addBytes(state.cpu.e, 1, ShouldPreserveCarry::PreserveCarry, state),
		RegM::H => state.cpu.h = addBytes(state.cpu.h, 1, ShouldPreserveCarry::PreserveCarry, state),
		RegM::L => state.cpu.l = addBytes(state.cpu.l, 1, ShouldPreserveCarry::PreserveCarry, state),
		RegM::M => utils::write_memory(
			state.cpu.h,
			state.cpu.l,
			addBytes(utils::read_memory(state.cpu.h, state.cpu.l, state), 1, ShouldPreserveCarry::PreserveCarry, state),
			state
		)
	}
}

pub fn dcr(reg: RegM, state: &mut State8085) {
	match reg {
		RegM::A => state.cpu.a = subtract(state.cpu.a, 1, ShouldPreserveCarry::PreserveCarry, state),
		RegM::B => state.cpu.b = subtract(state.cpu.b, 1, ShouldPreserveCarry::PreserveCarry, state),
		RegM::C => state.cpu.c = subtract(state.cpu.c, 1, ShouldPreserveCarry::PreserveCarry, state),
		RegM::D => state.cpu.d = subtract(state.cpu.d, 1, ShouldPreserveCarry::PreserveCarry, state),
		RegM::E => state.cpu.e = subtract(state.cpu.e, 1, ShouldPreserveCarry::PreserveCarry, state),
		RegM::H => state.cpu.h = subtract(state.cpu.h, 1, ShouldPreserveCarry::PreserveCarry, state),
		RegM::L => state.cpu.l = subtract(state.cpu.l, 1, ShouldPreserveCarry::PreserveCarry, state),
		RegM::M => utils::write_memory(
			state.cpu.h,
			state.cpu.l,
			subtract(utils::read_memory(state.cpu.h, state.cpu.l, state), 1, ShouldPreserveCarry::PreserveCarry, state),
			state
		)
	}
}

fn _dad(data: u16, state: &mut State8085) {
	let hl = utils::bytes_to_word(state.cpu.h, state.cpu.l);
	let res: u32 = (hl as u32) + (data as u32);
	let hl_new = res.to_be_bytes();
	state.cpu.h = hl_new[1];
	state.cpu.l = hl_new[0];
	state.cpu.cc.cy = (res & 0xffff0000) > 0;
}

pub fn dad(reg_pair: RegPair, state: &mut State8085) {
	_dad(utils::read_register_pair(reg_pair, state), state);
}