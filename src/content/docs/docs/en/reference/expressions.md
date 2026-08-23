---
title: Expressions
description: Operands, operators and precedence in Sim8085's assembler
---

Wherever an instruction or directive takes a number, it will take an expression.

## Operands

| Form              | Example        | Notes                                    |
|-------------------|----------------|------------------------------------------|
| Decimal           | `197`, `197D`  |                                          |
| Hexadecimal       | `0FFH`, `0x1F` | Must begin with a digit, hence the `0`   |
| Binary            | `10110000B`    |                                          |
| Octal             | `27O`, `27Q`   |                                          |
| Character         | `'A'`          |                                          |
| Label             | `START`        | See *Labels in expressions* below         |
| Location counter  | `$`            | The address of the current instruction    |

`$` is the address the assembler has reached, which makes it the usual way to
measure a block that has just been laid down:

```asm
TABLE:  DB      1, 2, 3, 4
COUNT   EQU     $-TABLE         ; 4
```

An instruction with no operand, written in parentheses, stands for its opcode
byte. It is occasionally useful for examining code as data:

```asm
        CPI     (DI)            ; compare against 0F3H, the opcode for DI
```

## Operators

Loosest binding first. Everything on the same row binds equally, and every row
groups left to right, so `10-3-2` is `5` and `20/2/5` is `2`.

| Operators              | Meaning                                     |
|------------------------|---------------------------------------------|
| `OR`, `XOR`            | Bitwise or, exclusive or                    |
| `AND`                  | Bitwise and                                 |
| `NOT`                  | Bitwise complement, sixteen bits            |
| `+`, `-`               | Add, subtract                               |
| `*`, `/`, `MOD`, `SHL`, `SHR` | Multiply, divide, remainder, shift    |
| `HIGH`, `LOW`          | The high or low byte of a 16-bit value      |
| `( )`                  | Grouping                                    |

Division truncates: `5/2` is `2`.

The word operators need whitespace on both sides, which is what allows a symbol
whose name merely starts with one — `ANDY`, `NOTE`, `ORG1`, `HIGHER` — to remain
an ordinary label.

```asm
        MVI     A, 0F0H AND 3FH         ; 30H
        MVI     A, HIGH 1234H           ; 12H
        MVI     A, (TIMER SHR 8) OR 40H
```

Relational operators — `EQ`, `NE`, `LT`, `LE`, `GT`, `GE` — are not supported.

## Labels in expressions

A label used on its own means different things in different places, and the
difference is worth knowing:

| Written                | Yields                                    |
|------------------------|-------------------------------------------|
| `MVI A, TABLE`         | The **byte stored at** `TABLE`             |
| `LXI H, TABLE`         | The **address** of `TABLE`                 |
| `MVI A, TABLE+0`       | The **address** of `TABLE`                 |

An operand that is nothing but a label, in an instruction that takes 8-bit
immediate data, gives the value stored there. Anywhere else — a 16-bit operand,
or a label used inside a larger expression — a label means its address.

If you want the address in 8-bit immediate data, write `LOW TABLE`. If you want
the byte stored there, load it: `LDA TABLE`.
