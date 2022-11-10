use crate::types::RegM;
use crate::types::State8085;
use crate::utils;
use crate::instructions::arithmetic::{subtract, ShouldPreserveCarry};

/**
 * Logical Group
 * =============
 *
 * This group performs logical (Boolean) operations on data in registers and memory and on condition flags.
 *
 * The logical AND, OR, and Exclusive OR instructions enable you to set specific bits in the accumulator ON or OFF.
 *
 *     -----------------------------------------------------------------
 *     | ANA       | Logical AND with Accumulator                      |
 *     -----------------------------------------------------------------
 *     | ANI       | Logical AND with Accumulator Using Immediate Data |
 *     -----------------------------------------------------------------
 *     | ORA       | Logical OR with Accumulator                       |
 *     -----------------------------------------------------------------
 *     | ORI       | Logical OR with Accumulator Using I mmediate Data |
 *     -----------------------------------------------------------------
 *     | XRA       | Exclusive Logical OR with Accumulator             |
 *     -----------------------------------------------------------------
 *     | XRI       | Exclusive OR Using Immediate Data                 |
 *     -----------------------------------------------------------------
 *
 * The compare instructions compare the contents of an 8-bit value with the contents of the accumulator:
 *
 *     -----------------------------------------------------------------
 *     | CMP       | Compare                                           |
 *     -----------------------------------------------------------------
 *     | CPI       | Compare Using Immediate Data                      |
 *     -----------------------------------------------------------------
 *
 * The rotate instructions shift the contents of the accumulator one bit position to the left or right:
 *
 *     -----------------------------------------------------------------
 *     | RLC       | Rotate Accumulator Left                           |
 *     -----------------------------------------------------------------
 *     | RRC       | Rotate Accumulator Right                          |
 *     -----------------------------------------------------------------
 *     | RAL       | Rotate Left Through Carry                         |
 *     -----------------------------------------------------------------
 *     | RAR       | Rotate Right Through Carry                        |
 *     -----------------------------------------------------------------
 *
 * Complement and carry flag instructions:
 *
 *     -----------------------------------------------------------------
 *     | CMA       | Complement Accumulator                            |
 *     -----------------------------------------------------------------
 *     | CMC       | Complement Carry Flag                             |
 *     -----------------------------------------------------------------
 *     | STC       | Set Carry Flag                                    |
 *     -----------------------------------------------------------------
 */

/**
 * Summary of Logical Operations
 * -----------------------------
 *
 * AND produces a one bit in the result only when the corresponding bits in the test data and the mask data are
 * ones.
 *
 * OR produces a one bit in the result when the corresponding bits in either the test data or the mask data are
 * ones.
 *
 * Exclusive OR produces a one bit only when the corresponding bits in the test data and the mask data are
 * different; i.e., a one bit in either the test data or the mask data - but not both - produces a one bit in the
 * result.
 *          AND          EXCLUSIVE OR          OR
 *       1010 1010        1010 1010         1010 1010
 *       0000 1111        0000 1111         0000 1111
 *      -----------      -----------       -----------
 *       0000 1010        1010 1111         1010 0101
 */

fn update_logical_flags(result: u8, state: &mut State8085) {
    state.cpu.cc.cy = false; // Verify this
                         // state.cpu.cc.ac = false; // This has different behaviour for AND and OR, so this is false
    state.cpu.cc.z = result == 0;
    state.cpu.cc.s = 0x80 == (result & 0x80);
    state.cpu.cc.p = utils::parity(result);
}

fn op_acc(op: &dyn Fn(u8, u8) -> u8, data: u8, state: &mut State8085) -> u8 {
    let result = op(state.cpu.a, data);
    update_logical_flags(result, state);
    return result;
}

fn and_acc(data: u8, state: &mut State8085) -> u8 {
    return op_acc(&|x, y| x & y, data, state);
}

fn or_acc(data: u8, state: &mut State8085) -> u8 {
    return op_acc(&|x, y| x | y, data, state);
}

fn xor_acc(data: u8, state: &mut State8085) -> u8 {
    return op_acc(&|x, y| x ^ y, data, state);
}

/**
 * LOGICAL AND WITH ACCUMULATOR
 * ============================
 *
 * ANA performs a logical AND operation using the contents of the specified byte and the accumulator. The result
 * is placed in the accumulator.
 *
 *
 * AND Register with Accumulator
 * -----------------------------
 *
 * Opcode   Operand
 * ANA      reg
 *
 * The operand must specify one of the registers A through E, H or L. This instruction ANDs the contents of the
 * specified register with the accumulator and stores the result in the accumulator. The carry flag is reset to zero.
 *
 *                      ---------------------
 *                      | 1 0 1 0 0 | S S S |
 *                      ---------------------
 *                      Cycles: 1
 *                      States: 4
 *                      Addressing: register
 *                      Flags: Z,S,P,CY,AC
 *
 * AND Memory with Accumulator
 * ---------------------------
 *
 * Opcode   Operand
 * ANA      M
 *
 * This instruction ANDs the contents of the specified memory location with the accumulator and stores the result
 * in the accumulator. The carry flag is reset to zero.
 *
 *                      ---------------------
 *                      | 1 0 1 0 0 | S S S |
 *                      ---------------------
 *                      Cycles: 1
 *                      States: 4
 *                      Addressing: register indirect
 *                      Flags: Z,S,P,CY,AC
 *
 * NOTE: The 8085 logical AND instructions always set the auxiliary flag (AC) ON
 */
pub fn ana(reg: RegM, state: &mut State8085) {
    state.cpu.a = and_acc(utils::read_register(reg, state), state);
    state.cpu.cc.ac = true;
}

/**
 * AND IMMEDIATE WITH ACCUMULATOR
 * ==============================
 *
 * ANI performs a logical AND operation using the contents of the second byte of the instruction and the accumulator.
 * The result is placed in the accumulator. ANI also resets the carry flag to zero.
 *
 *    Op code   Operand
 *    ANI       data
 *
 * The operand must specify the data to be used in the AND operation. This data may be in the form of a number,
 * an ASCII constant, the label of some previously defined value, or an expression. The data may not exceed one byte.
 *
 * The assembler's relocation feature treats all external and relocatable symbols as 16-bit addresses. When one of
 * these symbols appears in the operand expression of an immediate instruction, it must be preceded by either the
 * HIGH or LOW operator to specify which byte of the address is to be used in the evaluation of the expression.
 * When neither operator is present, the assembler assumes the LOW operator and issues an error message.
 *
 *                      -------------------
 *                      | 1 1 1 0 0 1 1 0 |
 *                      -------------------
 *                      |      data       |
 *                      -------------------
 *                      Cycles: 2
 *                      States: 7
 *                      Addressing: immediate
 *                      Flags: Z,S,P,CY,AC
 */
pub fn ani(data: u8, state: &mut State8085) {
    state.cpu.a = and_acc(data, state);
    state.cpu.cc.ac = true;
    state.cpu.pc += 1;
}

/**
 * INCLUSIVE OR WITH ACCUMULATOR
 * =============================
 *
 * ORA performs an inclusive OR logical operation using the contents of the specified byte and the accumulator. The
 * result is placed in the accumulator.
 *
 * OR Register with Accumulator
 * ----------------------------
 *
 *      Opcode   Operand
 *      ORA      reg
 *
 * The operand must specify one of the registers A through E, H or L. This instruction ORs the contents of the
 * specified register and the accumulator and stores the result in the accumulator. The carry and auxiliary carry
 * flags are reset to zero.
 *
 *                      ---------------------
 *                      | 1 0 1 1 0 | S S S |
 *                      ---------------------
 *                      Cycles: 1
 *                      States: 4
 *                      Addressing: register
 *                      Flags: Z,S,P,CY,AC
 *
 * OR Memory with Accumulator
 * --------------------------
 *
 *      Opcode   Operand
 *      ORA      M
 *
 * The contents of the memory location specified by the Hand L registers are inciusive-ORed with the contents of
 * the accumulator. The result is stored in the accumulator. The carry and auxiliary carry flags are reset to zero.
 *
 *                      -------------------
 *                      | 1 0 1 1 0 1 1 0 |
 *                      -------------------
 *                      Cycles: 2
 *                      States: 7
 *                      Addressing: register indirect
 *                      Flags: Z,S,P,CY,AC
 */
pub fn ora(reg: RegM, state: &mut State8085) {
    state.cpu.a = or_acc(utils::read_register(reg, state), state);
    state.cpu.cc.ac = false;
}

/**
 * INCLUSIVE OR IMMEDIATE
 * ======================
 *
 * ORI performs an inclusive OR logical operation using the contents of the second byte of the instruction and the
 * contents of the accumulator. The result is placed in the accumulator. ORI also resets the carry and auxiliary
 * carry flags to zero.
 *
 *    Op code   Operand
 *    ORI       data
 *
 * The operand must specify the data to be used in the inclusive OR operation. This data may be in the form of a
 * number, an ASCII constant, the label of some previously defined value, or an expression. The data may not
 * exceed one byte.
 *
 * The assembler's relocation feature treats all external and relocatable symbols as 16-bit addresses. When one of
 * these symbols appears in the operand expression of an immediate instruction, it must be preceded by either the
 * HIGH or LOW operator to specify which byte of the address is to be used in the evaluation of the expression.
 * When neither operator is present, the assembler assume the LOW operator and issues an error message.
 *
 *                      -------------------
 *                      | 1 1 1 1 0 1 1 0 |
 *                      -------------------
 *                      |      data       |
 *                      -------------------
 *                      Cycles: 2
 *                      States: 7
 *                      Addressing: immediate
 *                      Flags: Z,S,P,CY,AC
 */
pub fn ori(data: u8, state: &mut State8085) {
    state.cpu.a = or_acc(data, state);
    state.cpu.cc.ac = false;
    state.cpu.pc += 1;
}

/**
 * EXCLUSIVE OR WITH ACCUMULATOR
 * =============================
 *
 * XRA performs an excl usive OR logical operation using the contents of the specified byte and the accumulator.
 * The result is placed in the accumulator.
 *
 * XRA Register with Accumulator
 * ----------------------------
 *
 *      Opcode   Operand
 *      XRA      reg
 *
 * The operand must specify one of the registers A through E, H or L. This instruction performs an exclusive OR
 * using the contents of the specified register and the accumulator and stores the result in the accumulator. The
 * carry and auxil iary carry flags are reset to zero.
 *
 *                      ---------------------
 *                      | 1 0 1 0 1 | S S S |
 *                      ---------------------
 *                      Cycles: 1
 *                      States: 4
 *                      Addressing: register
 *                      Flags: Z,S,P,CY,AC
 *
 * XOR Memory with Accumulator
 * --------------------------
 *
 *      Opcode   Operand
 *      XRA      M
 *
 * The contents of the memory location specified by the Hand L registers is exclusive-ORed with the contents of
 * the accumulator. The result is stored in the accumulator. The carry and auxiliary carry flags are reset to zero.
 *
 *                      -------------------
 *                      | 1 0 1 0 1 1 1 0 |
 *                      -------------------
 *                      Cycles: 2
 *                      States: 7
 *                      Addressing: register indirect
 *                      Flags: Z,S,P,CY,AC
 */
pub fn xra(reg: RegM, state: &mut State8085) {
    state.cpu.a = xor_acc(utils::read_register(reg, state), state);
    state.cpu.cc.ac = false;
}

/**
 * EXCLUSIVE OR IMMEDIATE WITH ACCUMULATOR
 * =======================================
 *
 * XRI performs an exclusive OR operation using the contents of the second instruction byte and the contents of
 * the accumulator. The result is placed in the accumulator. XRI also resets the carry and auxiliary carry flags to
 * zero.
 *
 *    Op code   Operand
 *    XRI       data
 *
 * The operand must specify the data to be used in the OR operation. This data may be in the form of a number,
 * an ASCII constant, the label of some previously defined value, or an expression. The data may not exceed one byte.
 *
 * The assembler's relocation feature treats all external and relocatable symbols as 16-bit addresses. When one of
 * these symbols appears in the operand expression of an immediate instruction, it must be preceded by either the
 * HIGH or LOW operator to specify which byte of the address is to be used in the evaluation of the expression.
 * When neither operator is present, the assembler assumes the LOW operator and issues an error message.
 *
 *                      -------------------
 *                      | 1 1 1 0 1 1 1 0 |
 *                      -------------------
 *                      |      data       |
 *                      -------------------
 *                      Cycles: 2
 *                      States: 7
 *                      Addressing: immediate
 *                      Flags: Z,S,P,CY,AC
 */
pub fn xri(data: u8, state: &mut State8085) {
    state.cpu.a = xor_acc(data, state);
    state.cpu.cc.ac = false;
    state.cpu.pc += 1;
}

/**
 * COMPARE WITH ACCUMULATOR
 * ========================
 *
 * CMP compares the specified byte with the contents of the accumulator and indicates the result by setting the
 * carry and zero flags. The values being compared remain unchanged.
 *
 * The zero flag indicates equality. No carry indicates that the accumulator is greater than or equal to the specified
 * byte; a carry indicates that the accumulator is less than the byte. However, the meaning of the carry flag is reversed
 * when the values have different signs or one of the values is complemented.
 *
 * Functional Description
 * ----------------------
 * Comparisons are performed by subtracting the specified byte from the contents of the accumulator, which
 * is why the zero and carry flags indicate the result. This subtraction uses the processor's internal registers
 * so that source data is preserved. Because subtraction uses two's complement addition, the CMP instruction
 * recomplements the carry flag generated by the subtraction.
 *
 * Compare Register with Accumulator
 * ---------------------------------
 *
 *    Op code   Operand
 *    CMP       reg
 *
 * The operand must name one of the registers A through E, H or L.
 *
 *                      ---------------------
 *                      | 1 0 1 1 1 | S S S |
 *                      ---------------------
 *                      Cycles: 1
 *                      States: 4
 *                      Addressing: register
 *                      Flags: Z,S,P,CY,AC
 *
 * Compare Memory with Accumulator
 * ---------------------------------
 *
 *    Op code   Operand
 *    CMP       M
 *
 * This instruction compares the contents of the memory location addressed by the Hand L registers with the
 * contents of the accumulator. M is a symbolic reference to the Hand L register pair.
 *
 *                      -------------------
 *                      | 1 0 1 1 1 1 1 0 |
 *                      -------------------
 *                      Cycles: 2
 *                      States: 7
 *                      Addressing: register indirect
 *                      Flags: Z,S,P,CY,AC
 */
pub fn cmp(reg: RegM, state: &mut State8085) {
    subtract(state.cpu.a, utils::read_register(reg, state), ShouldPreserveCarry::UpdateCarry, state);
}

/**
 * COMPARE IMMEDIATE
 * =================
 *
 * CPI compares the contents of the second instruction byte with the contents of the accumulator and sets the zero
 * and carry flags to indicate the result. The values being compared remain unchanged.
 *
 * The zero flag indicates equality. No carry indicates that the contents of the accumulator are greater than the
 * immediate data; a carry indicates that the accumulator is less than the immediate data. However, the meaning
 * of the carry flag is reversed when the values have different signs or one of the values is complemented.
 *
 *    Op code   Operand
 *    CPI       data
 *
 * The operand must specify the data to be compared. This data may be in the form of a number, an ASCII
 * constant, the label of a previously defined value, or an expression. The data may not exceed one byte
 *
 * The assembler's relocation feature treats all external and relocatable symbols as 16-bit addresses. When one of
 * these symbols appears in the operand expression of an immediate instruction, it must be preceded by either
 * the HIGH or LOW operator to specify which byte of the address is to be used in the evaluation of the
 * expression. When neither operator is present, the assembler assumes the LOW operator and issues an error message.
 *
 *                      -------------------
 *                      | 1 1 1 1 1 1 1 0 |
 *                      -------------------
 *                      |      data       |
 *                      -------------------
 *                      Cycles: 2
 *                      States: 7
 *                      Addressing: register indirect
 *                      Flags: Z,S,P,CY,AC
 */
pub fn cpi(data: u8, state: &mut State8085) {
    subtract(state.cpu.a, data, ShouldPreserveCarry::UpdateCarry, state);
}

/**
 * ROTATE ACCUMULATOR LEFT
 * =======================
 *
 * RLC sets the carry flag equal to the high-order bit of the accumulator, thus overwriting its previous setting. RLC
 * then rotates the contents of the accumulator one bit position to the left with the high-order bit transferring to
 * the low-order position of the accumulator.
 *
 * Operands are not allowed with the RLC instruction.
 *
 *                      -------------------
 *                      | 0 0 0 0 0 1 1 1 |
 *                      -------------------
 *                      Cycles: 1
 *                      States: 4
 *                      Flags: CY only
 */
pub fn rlc(state: &mut State8085) {
    let a = state.cpu.a;
    state.cpu.a = ((a & 0x80) >> 7) | (a << 1);
    state.cpu.cc.cy = 1 == ((a & 0x80) >> 7);
}

/**
 * ROTATE ACCUMULATOR RIGHT
 * ========================
 *
 * RRC sets the carry flag equal to the low-order bit of the accumulator, thus overwriting its previous setting. RRC
 * then rotates the contents of the accumulator one bit position to the right with the low-order bit transferring to
 * the high order position of the accumulator.
 *
 * Operands are not permitted with the RRC instruction.
 *
 *                      -------------------
 *                      | 0 0 0 0 1 1 1 1 |
 *                      -------------------
 *                      Cycles: 1
 *                      States: 4
 *                      Flags: CY only
 */
pub fn rrc(state: &mut State8085) {
    let a = state.cpu.a;
    state.cpu.a = ((a & 1) << 7) | (a >> 1);
    state.cpu.cc.cy = 1 == (a & 1);
}

/**
 * ROTATE LEFT THROUGH CARRY
 * =========================
 *
 * RAL rotates the contents of the accumulator and the carry flag one bit position to the left. The carry flag, which
 * is treated as though it were part of the accumulator, transfers to the low-order bit of the accumulator. The
 * high-order bit of the accumulator transfers into the carry flag.
 *
 * Operands are not perrmitted with the RAL instruction.
 *
 *                      -------------------
 *                      | 0 0 0 1 0 1 1 1 |
 *                      -------------------
 *                      Cycles: 1
 *                      States: 4
 *                      Flags: CY only
 */
pub fn ral(state: &mut State8085) {
    let a = state.cpu.a;
    state.cpu.a = (if state.cpu.cc.cy { 1 } else { 0 }) | (a << 1);
    state.cpu.cc.cy = 1 == ((a & 0x80) >> 7);
}

/**
 * ROTATE RIGHT THROUGH CARRY
 * ==========================
 *
 * RAR rotates the contents of the accumulator and the carry flag one bit position to the right. The carry flag,
 * which is treated as though it were part of the accumulator, transfers to the high-order Qjt of the accumulator.
 * The low-order bit of the accumulator transfers into the carry flag.
 *
 * Operands are not permitted with the RAR instruction.
 *
 *                      -------------------
 *                      | 0 0 0 1 1 1 1 1 |
 *                      -------------------
 *                      Cycles: 1
 *                      States: 4
 *                      Flags: CY only
 */
pub fn rar(state: &mut State8085) {
    let a = state.cpu.a;
    state.cpu.a = (a >> 1) | ((if state.cpu.cc.cy { 1 } else { 0 }) << 7); /* Form a number with higest bit as carry value */
    state.cpu.cc.cy = 1 == (a & 1);
}

/**
 * COMPLEMENT ACCUMULATOR
 * ======================
 *
 * CMA complements each bit of the accumulator to produce the one's complement. All condition flags remain unchanged.
 *
 * Operands are not permitted with the CMA instruction.
 *
 *                      -------------------
 *                      | 0 0 1 0 1 1 1 1 |
 *                      -------------------
 *                      Cycles: 1
 *                      States: 4
 *                      Flags: None
 */
pub fn cma(state: &mut State8085) {
    state.cpu.a ^= 0xFF;
}

/**
 * COMPLEMENT CARRY
 * ================
 *
 * If the carry flag equals zero, CMC sets it to one. If the carry flag is one, CMC resets it to zero. All other flags remain unchanged.
 *
 * Operands are not permitted with the CMC instruction.
 *
 *                      -------------------
 *                      | 0 0 1 1 1 1 1 1 |
 *                      -------------------
 *                      Cycles: 1
 *                      States: 4
 *                      Flags: CY only
 */
pub fn cmc(state: &mut State8085) {
    if state.cpu.cc.cy {
        state.cpu.cc.cy = true;
    } else {
        state.cpu.cc.cy = false;
    }
}

/**
 * SET CARRY
 * =========
 *
 * STC sets the carry flag to one. No other flags are affected.
 *
 * Operands are not permitted with the STC instruction.
 *
 *                      -------------------
 *                      | 0 0 1 1 0 1 1 1 |
 *                      -------------------
 *                      Cycles: 1
 *                      States: 4
 *                      Flags: CY only
 */
pub fn stc(state: &mut State8085) {
    state.cpu.cc.cy = true;
}
