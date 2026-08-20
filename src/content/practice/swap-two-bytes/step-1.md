---
title: Exchange Two Neighbours
stepNumber: 1
hints:
  - "Whichever byte you write first destroys what was underneath it. Make sure that value already exists somewhere else before the write happens."
  - "You know how to step a pointer forward through memory. There is a matching instruction that steps it back again."
  - "Two reads followed by two writes is much easier to keep straight than alternating between them."
---

The two bytes are at `2000H` and `2001H`. Swap them.

> **The one thing:** One of the two values has to be outside memory when the writes happen, or the first write destroys what the second one needed.

### What is being checked

- `2000H` holds the byte that was at `2001H`
- `2001H` holds the byte that was at `2000H`
- The program reaches `HLT`

### Why a third place is unavoidable

Think about what a swap actually asks for: two writes, each of which needs a
value that the *other* write is about to destroy. So at least one of the two
values has to be living outside memory when the writes happen. On the 8085
that means a register.

You have plenty of registers. `A` is one option, `B` through `E` are others,
and for this step it genuinely does not matter which you pick — pick whichever
makes the program read clearly. It starts to matter in the next step, where
one particular register pair can only reach memory *through* `A`, so `A` is
not free to hold anything.

### One pointer, two bytes

The bytes are neighbours, so a single pointer reaches both: set `HL` once,
step it forward with `INX H`, and step it back with `DCX H`. `DCX` is the
exact mirror of `INX`, and like `INX` it touches no flags at all, so you can
move a pointer around in the middle of a calculation without disturbing
anything.
