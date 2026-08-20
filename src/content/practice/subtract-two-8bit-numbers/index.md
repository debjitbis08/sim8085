---
title: Subtract Two 8-bit Numbers
description: Subtract one byte from another, learn why the carry flag doubles as a borrow, and meet the other way of reaching memory.
difficulty: beginner
order: 20
tags: [arithmetic, memory, flags]
access: free
status: active
---

A number sits at `2000H` and another at `2001H`. Subtract the second from the
first and leave the difference at `2002H`.

Addition was symmetric: `a + b` and `b + a` give the same answer, so getting
the operands the wrong way round did not matter. Subtraction is not symmetric,
and that changes three things:

1. **Order matters.** `SUB` always computes *accumulator minus operand*. The
   number you are subtracting *from* has to be the one in `A`.
2. **The carry flag means something different.** In an addition, carry set
   means the answer was too big. In a subtraction it means the answer went
   below zero — a **borrow**. There is no separate borrow flag; the 8085
   reuses carry for both jobs.
3. **The result wraps.** `25H - 4AH` is negative, and eight bits cannot hold a
   sign. The accumulator keeps the low eight bits of the true answer, and the
   borrow is the only record that anything was lost.

You will do the subtraction first, then make the program react to the borrow
instead of merely producing it.
