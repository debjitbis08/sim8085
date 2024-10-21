---
title:  ACI - Add Immediate with Carry
description: Add Immediate with Carry
---

**Add Immediate with Carry**

The ACI instruction adds the immediate operand (data) and the current carry bit to the accumulator. The result is stored back in the accumulator. The carry flag is added if it's set.

## Instruction Format

| Opcode | Operand |
|--------|---------|
| `ACI`  | `data`  |

## Operand Details

The operand specifies the actual data to be added to the accumulator, except for the carry bit. The data may be in one of the following forms:
- A number
- An ASCII constant
- The label of a previously defined value
- An expression

The data must not exceed **one byte**.

## Operation

The operation performed by `ACI` is:

```
Accumulator = Accumulator + Immediate Data + Carry
```

- **Operand**: The immediate data to be added to the accumulator. It must be a single byte (8 bits) and can be in the form of a number, an ASCII constant, or an expression.
- **Carry Bit**: This instruction includes the carry bit in its addition.


## Flags Affected

- **Z (Zero)**: Set if the result is zero.
- **S (Sign)**: Set if the result is negative.
- **P (Parity)**: Set if the result has even parity.
- **CY (Carry)**: Set if there is a carry out.
- **AC (Auxiliary Carry)**: Set if there is a carry out from the lower nibble.


## Execution Details

| **Cycles** | **States** | **Addressing Mode** | **Flags**           |
|------------|------------|---------------------|---------------------|
| 2          | 7          | Immediate           | Z, S, P, CY, AC     |

## Example

**Before Execution**:
- **Accumulator**: `24H` (00100100)
- **Immediate Data**: `36H` (00110110)
- **Carry Bit**: `1`

**After Execution**:
- **Accumulator**: `(24H + 36H + 1)` = `5BH` (01011011)

### Breakdown of Addition (Binary)

```
Accumulator = 00100100 (24H)
  Immediate = 00110110 (36H)
      Carry = 00000001
              --------
     Result = 01011011 (5BH)
```
