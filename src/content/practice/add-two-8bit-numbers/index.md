---
title: Add Two 8-bit Numbers
description: Read two bytes from memory, add them, and store the result. The smallest complete program that touches memory, registers and flags.
difficulty: beginner
order: 10
tags: [arithmetic, memory, flags]
access: free
status: active
---

Two numbers are waiting in memory at `2000H` and `2001H`. Your job is to add
them and leave the answer at `2002H`.

That sounds like one instruction, and on a modern processor it nearly would
be. On the 8085 it is four ideas stacked on top of each other:

1. Memory is not registers. You cannot add two memory locations directly, so
   values have to be brought into the CPU first.
2. The accumulator is special. Arithmetic always involves `A`.
3. `HL` can be used as a pointer into memory, and `M` means "the byte `HL`
   points at".
4. Addition can overflow. Eight bits hold `00H` to `FFH`; anything larger sets
   the carry flag.

You will build the program in two steps: first get the operands into
registers, then do the arithmetic and store the answer.
