---
title: Subtract, the Right Way Round
stepNumber: 1
hints:
  - "Only the accumulator can be the left-hand side of a subtraction. Whichever number is being subtracted *from* has to get there, and it has to still be there when you subtract."
  - "The other operand of `SUB` is a register — never an address — so the byte from `2001H` needs a register of its own before it can be subtracted."
  - "This time the addresses are fixed and you are allowed to name them directly: one instruction loads `A` from an address you write out, and its mirror image stores `A` back to one."
---

Load both numbers, subtract the one at `2001H` from the one at `2000H`, and
store the difference at `2002H`.

Last time you were made to reach memory through `HL`. This time do the
opposite: name the addresses directly.

> **The one thing:** `SUB` always computes accumulator minus operand, so the number being subtracted *from* has to be the one sitting in `A`.

### What is being checked

- `2002H` holds the difference
- The carry flag is set when the subtraction borrowed, and clear when it did not
- `2000H` and `2001H` still hold the original numbers
- The program reaches `HLT`
- You use `LDA` and `STA`

### Two ways to reach memory, and when each is right

`LDA 2000H` loads the accumulator from an address written into the
instruction. `STA 2002H` stores it back the same way. No pointer to set up, no
`INX H` — but the address is frozen into the program, so three different
addresses cost three different instructions.

That is the trade. **Direct addressing** (`LDA` / `STA`) is shorter when there
are a couple of fixed, unrelated addresses, which is exactly this problem.
**Pointer addressing** (`HL` and `M`) is the only thing that works when the
address has to change while the program runs, which is every loop you will
ever write. Neither one is the "real" way; knowing which question you are
answering is the skill.

### Watch the order

`SUB B` computes `A - B`, always. If you load the numbers the wrong way round
you will get the two's complement of the right answer — `DBH` where `25H` was
expected — and it will look like a strange bug rather than a swapped pair.
