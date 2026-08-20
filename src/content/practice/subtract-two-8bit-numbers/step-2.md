---
title: Record the Borrow
stepNumber: 2
hints:
  - "The flag you need is already set — the subtraction set it. What is missing is an instruction that makes the program take a different path depending on it."
  - "Conditional jumps come in pairs, one for the flag set and one for the flag clear. Either one can be made to work; pick the one that lets the shorter path fall straight through."
  - "Store the difference before you start building the indicator, because putting `00H` or `01H` into `A` will overwrite it."
---

A flag that nobody reads changes nothing. Extend the program so that it also
*reacts* to the borrow.

Keep storing the difference at `2002H`, and additionally store `01H` at
`2003H` if the subtraction borrowed, or `00H` if it did not.

> **The one thing:** The carry flag is the shortest-lived thing in the machine. Branch on it immediately, or turn it into a byte, before anything else overwrites it.

### What is being checked

- `2002H` still holds the difference
- `2003H` holds `01H` after a borrow and `00H` otherwise
- `2000H` and `2001H` still hold the original numbers
- The program reaches `HLT`

### Flags are the most perishable thing in the machine

The carry flag is one bit, and almost every arithmetic or logical instruction
rewrites it. `SUB`, `ADD`, `ANA`, `XRA`, `RLC` — all of them. So the moment
after a subtraction is the only moment you can trust the borrow, and if you
need it later than that you must turn it into something more durable, which is
exactly what this step is doing.

Some instructions are deliberately harmless to the flags, and they are worth
memorising because they are what lets you do bookkeeping between a test and
its branch:

- `MOV`, `MVI`, `LDA`, `STA`, `LXI` — no flags touched at all
- `INX` and `DCX` — no flags touched, unlike their 8-bit cousins
- `INR` and `DCR` — set the zero, sign and parity flags, but leave **carry** alone

`XRA A` is the usual way to clear the accumulator, and it is the one to avoid
here: it clears the carry flag along with `A`.
