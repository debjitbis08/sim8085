---
title: Load the Operands
stepNumber: 1
hints:
  - "The two bytes sit next to each other in memory. If you can point at the first one, the second is one step away, so you only need one address to start from."
  - "`M` is not a register you load. It is whatever `HL` points at right now, so reading a byte is an ordinary register copy, and reaching the next byte means changing `HL` rather than writing another address."
  - "The shape is: set the pointer once, copy a byte, move the pointer forward by one, copy again."
---

Before the 8085 can add anything, both numbers have to be inside the CPU.

Load the byte at `2000H` into the accumulator `A`, and the byte at `2001H`
into register `B`. Do not add them yet. This step is only about getting the
values where the next step can use them.

### What is being checked

- `A` holds the byte from `2000H`
- `B` holds the byte from `2001H`
- The program reaches `HLT`
- You use `LXI` to set up the pointer, and **not** `LDA`

### A note on M

`M` is not a register. It is notation meaning "the memory byte that `HL`
currently points at", so `MOV A, M` is a memory read, not a register copy.
Setting up `HL` once and stepping it forward with `INX H` is the pattern you
will use for every array in this course.
