---
title: Add Two 16-bit Numbers
description: Add numbers that do not fit in a register, first a byte at a time with the carry chain, then in one instruction with a register pair.
difficulty: intermediate
order: 50
tags: [arithmetic, 16-bit, register-pairs, flags]
access: plus
status: active
---

Two 16-bit numbers are in memory: the first at `2000H` and `2001H`, the second
at `2002H` and `2003H`. Add them and store the 16-bit sum at `2004H` and
`2005H`.

Each number occupies two bytes, **low byte first**. So the number `1234H` is
stored as `34H` then `12H`. That ordering is not an accident of this exercise —
it is what `LXI`, `LHLD`, `SHLD` and every 16-bit instruction on the 8085
expect, so following the convention means the hardware does the work for you,
and fighting it means doing everything by hand.

The interesting part is that a 16-bit addition is not two independent 8-bit
additions. Adding the low halves can produce a carry that belongs to the high
half, and passing that carry along correctly is the entire idea. Get it wrong
and the program is right for about 99% of inputs, which is the worst kind of
wrong.

You will do it twice: once byte by byte, so you can see the carry travel, and
once with the 16-bit instructions that do the same thing in a single step.
