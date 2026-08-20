---
title: Keep the Whole Product
stepNumber: 2
hints:
  - "The total no longer fits in `A`, but there is a register pair built for arithmetic, and an instruction that adds another pair into it."
  - "The number being added is only eight bits wide. Put it in the low half of a pair and clear the high half, so that adding it as a 16-bit value adds the right amount."
  - "`DAD` sets the carry flag and nothing else, so it can never end your loop. The counter and `DCR` still do that job, exactly as before."
---

Multiply the byte at `2000H` by the byte at `2001H` and store the full 16-bit
product at `2002H` (low byte) and `2003H` (high byte).

`FFH * FFH` is `FE01H`, so the product genuinely needs both bytes. The
multiplier is still at least 1; that assumption goes in the next step.

Your loop from step 1 is in the editor. This is the opposite of the last two
problems: here the **repetition is already right** and stays exactly as it is
— same counter, same test, same jump. Only the body changes, because only the
body knows how wide the total is.

> **The one thing:** The repetition is already correct and stays exactly as it is. All that changes is where the running total lives and how it is added to.

### What is being checked

- `2002H` and `2003H` hold the 16-bit product, low byte first
- Both input bytes are unchanged
- The program reaches `HLT`
- You use `DAD`
- No register is assumed to start at zero

### Move the total into `HL`

Everything about the loop stays the same; only where the total lives changes.
`HL` holds the running product, and each turn of the loop adds the
multiplicand into it with `DAD`.

`DAD` adds a whole register pair, so the multiplicand has to be presented as a
16-bit value: put it in `E` and clear `D`, giving `DE` a value between `0000H`
and `00FFH`. Forgetting to clear `D` is the classic bug — the program then
adds some multiple of 256 too much, and every answer is wrong by a
suspiciously round amount.

The pay-off is that the carry between the low and high halves, which you
chained by hand with `ADC` in the previous problem, now happens inside a
single instruction. Nothing in the loop has to know that the total is wider
than a byte.

### `SHLD` writes both bytes

`SHLD 2002H` stores `L` at `2002H` and `H` at `2003H` — the low-byte-first
layout the problem asked for, in one instruction. You could store the two
halves separately, and it would be four instructions doing the same thing.

### Two instructions, two flags, one loop

`DAD` sets the carry flag and leaves every other flag alone. `DCR` sets the
zero flag and leaves carry alone. That neat division of labour is why they sit
happily in the same loop body: the addition cannot disturb the counter's
verdict, and the counter cannot disturb the addition's.

It also means `HL` reaching zero does **not** set the zero flag. If you ever
want to test a register pair for zero, you have to do it yourself, a byte at a
time.
