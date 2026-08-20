---
title: Copy a Block of Memory
description: Move N bytes from one place to another with two pointers, then find out why the same loop destroys the data when the two blocks overlap.
difficulty: intermediate
order: 20
tags: [memory, pointers, loops, arrays]
access: plus
status: active
---

A count sits at `2000H`, and that many bytes follow from `2001H`. Copy them
somewhere else.

Every part of this is something you have already done: `LDAX`/`STAX` gave you
a second pointer when you swapped two distant bytes, and the array sum gave
you a pointer-and-counter loop. Putting them together is the whole first step,
and it is worth doing because block copying is one of the two or three things
real 8085 programs spend most of their time on.

The second step is where it gets interesting. Copying a block *onto itself*,
shifted by one byte, uses the identical loop — and destroys the data. Not
because the loop is wrong, but because the direction is. This is the first
problem in the course where correct-looking code produces correct-looking
output that is quietly, completely wrong, and the fix is a single instruction.
