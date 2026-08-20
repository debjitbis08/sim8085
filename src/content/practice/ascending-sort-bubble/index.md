---
title: Sort an Array in Ascending Order
description: Bubble sort, built one pass at a time. A loop inside a loop, a swap inside a comparison, and the first program with real structure.
difficulty: intermediate
order: 70
tags: [arrays, sorting, loops, comparison]
access: plus
status: active
---

A count sits at `2000H`, and that many unsigned bytes follow from `2001H`.
Sort them into ascending order, in place.

This is the first problem that is genuinely a *program* rather than a
procedure. Everything in it you have already written:

- comparing two bytes with `CMP` and branching on the carry flag
- swapping two neighbouring bytes through a temporary register
- walking an array with a pointer and a counter

What is new is that these are nested inside each other. A swap sits inside a
comparison, the comparison sits inside a pass over the array, and the pass
sits inside a loop that repeats it. Four levels, and every one of them needs
its own counter, initialised in the right place.

That last detail is what makes nested loops hard, and it is worth naming
before you start: **anything the inner loop consumes must be set up again at
the top of every outer turn.** The pointer has walked to the end of the array;
the inner counter has been decremented to zero. Neither resets itself.

This one gets four steps, because there are four separable things to get
right and cramming them together is how people end up staring at a program
that sorts *almost* correctly with no idea which layer is at fault:

1. Order a single pair — the primitive, on two bytes you can check by eye
2. Run that across the array once, and check the exact result of one pass
3. Repeat passes until the array is sorted
4. Stop as soon as it is sorted, rather than always making `n - 1` passes

The last one is checked against a clock as well as an answer, which is a first
for this course.

Assume the count is at least 2.
