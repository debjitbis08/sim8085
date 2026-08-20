---
title: Count the 1 Bits in a Byte
description: Rotate a byte through the carry flag one bit at a time and tally the ones. The first program that looks inside a byte instead of at it.
difficulty: intermediate
order: 40
tags: [bits, rotate, loops, flags]
access: plus
status: active
---

A byte sits at `2000H`. Count how many of its eight bits are `1` and store
that count at `2001H`.

Every program so far has treated a byte as a number. This one treats it as
eight separate facts, and the 8085 gives you no way to ask about bit 5
directly. What it gives you instead is the **rotate** instructions, which
shove the whole byte sideways and catch the bit that falls off the end in the
carry flag.

That is the trick worth taking away: the carry flag is not only an overflow
indicator. It is the machine's one-bit window onto the edge of the
accumulator, and rotating is how you move each bit into that window in turn.

There are four rotate instructions and choosing between them is most of the
lesson, so the first step uses one on a single bit before the second step
loops over all eight.
