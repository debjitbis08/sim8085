---
title: ADC — Add with Carry
---

The `ADC` instruction adds the contents of a register or memory location, along
with the carry flag, to the accumulator. The result is stored back in the
accumulator. This instruction also updates the carry flag and other condition
flags based on the result of the operation.

The `ADC` instruction enables multi-byte addition by utilizing the carry flag,
allowing you to chain multiple additions together.

## Instruction Format

| Opcode | Operand     |
|--------|-------------|
| `ADC`  | `register`  |
| `ADC`  | `M`  |

**Operand**: The operand can be one of the registers `A` through `E`, `H`, or `L`, or the
memory location (`M`) addressed by the contents of the `H` and `L` registers.

## Operation

```
Accumulator = Accumulator + Register/Memory + Carry
```

**Carry Bit**: If the carry bit is set (CY=1), it is added to the result along with
the contents of the specified register or memory.

## Flags Affected

- **Z (Zero)**: Set if the result is zero.
- **S (Sign)**: Set if the result is negative (most significant bit is 1).
- **P (Parity)**: Set if the result has even parity.
- **CY (Carry)**: Set if there is a carry out of the most significant bit.
- **AC (Auxiliary Carry)**: Set if there is a carry from bit 3 to bit 4.

## Execution Details

### Add Register to Accumulator with Carry

This adds the contents of the specified register and the carry bit to the
accumulator, and stores the result in the accumulator.

| **Cycles** | **States** | **Addressing Mode** | **Flags**           |
|------------|------------|---------------------|---------------------|
| 1          | 4          | Register            | Z, S, P, CY, AC     |

### Add Memory to Accumulator with Carry

This adds the contents of the memory location addressed by the `H` and `L`
registers, along with the carry bit, to the accumulator. `M` refers to the memory
location (`H` and `L` registers).

| **Cycles** | **States** | **Addressing Mode** | **Flags**           |
|------------|------------|---------------------|---------------------|
| 2          | 7          | Register Indirect   | Z, S, P, CY, AC     |

## Example 1: (Carry = 0)

**Initial State**
- Register C: 3DH (00111101)
- Accumulator: 42H (01000010)
- Carry Bit: 0

**After Execution (ADC C)**

Result:

```
Accumulator = 42H + 3DH + 0 = 7FH (01111111)
```

The condition flags are set as follows:

- Carry: `0`
- Sign: `0`
- Zero: `0`
- Parity: `0` (odd parity)
- Auxiliary Carry: `0`

## Example 2: (Carry = 1)

**Initial State**
- Register C: 3DH (00111101)
- Accumulator: 42H (01000010)
- Carry Bit: 1

**After Execution (ADC C)**

Result:

```
Accumulator = 42H + 3DH + 1 = 80H (10000000)
```

The condition flags are set as follows:

- Carry: `0`
- Sign: `1` (most significant bit is 1)
- Zero: `0`
- Parity: `0` (odd parity)
- Auxiliary Carry: `1` (carry from bit 3 to bit 4)
