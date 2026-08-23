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

## Labels

A label's value is its address — the location the assembler had reached when it
was defined. That is true whether it labels an instruction, a `DB`, a `DW` or a
`DS`.

```asm
        ORG     2000H
TABLE:  DB      42H             ; TABLE is 2000H, not 42H
        LXI     H, TABLE        ; loads 2000H
        MVI     A, LOW TABLE    ; loads 00H, the low half of the address
        LDA     TABLE           ; loads 42H, the byte stored there
```

A name defined with `EQU` or `SET` has whatever value you gave it, so those are
what you use for constants:

```asm
COUNT   EQU     16
        MVI     B, COUNT        ; loads 16
```

### Addresses in 8-bit operands

An instruction that takes 8-bit data will not accept a 16-bit address. Writing
one is an error, because there is no way for the assembler to guess which half
you meant:

```asm
        ORG     2000H
TABLE:  DB      42H
        MVI     A, TABLE        ; error: value 8192 does not fit in one byte
        MVI     A, LOW TABLE    ; 00H, the low half
        MVI     A, HIGH TABLE   ; 20H, the high half
        LDA     TABLE           ; or load what is stored there
```

The same limit applies to `DB`, whose values must be in the range -256 to 255.
Use `DW` to store a whole address.
