---
title: Swap Two Bytes in Memory
description: Exchange the contents of two memory locations, and discover why you always need a third place to put something down.
difficulty: beginner
order: 30
tags: [memory, pointers, registers]
access: free
status: active
---

Two bytes are in memory. Exchange them, so that each ends up where the other
was.

This is the first problem where the obvious instruction does not exist. You
cannot write `MOV M, M`, and even if you could it would not help: the moment
you copy the second byte over the first, the first is gone and there is
nothing left to copy back. Every exchange, in every language, on every
processor, is really three moves through a temporary place — the difference on
the 8085 is that the temporary place is a register you have to choose
yourself.

The second half of the problem is about *where* the two bytes are. Neighbours
are easy: one pointer reaches both. Two addresses far apart need two pointers,
and that turns out to be the pattern behind every copy, compare and sort you
will write later.
