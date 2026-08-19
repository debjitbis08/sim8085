---
title: Sum an Array of Bytes
description: Walk a block of memory with a counter and accumulate a total. This is the loop every array algorithm is built from.
difficulty: intermediate
order: 10
tags: [arrays, loops, counters, flags]
access: plus
status: active
---

A count sits at `2000H`, and that many bytes follow it from `2001H` onwards.
Add them up.

Adding two numbers needed no loop. Adding *n* numbers needs three things
working together, and getting any one of them wrong gives a plausible-looking
answer that is quietly incorrect:

1. A **pointer** that advances through memory
2. A **counter** that says how many are left
3. An **accumulator** holding the running total

The counter is where beginners lose. `DCR` sets the zero flag when it reaches
zero, so the natural shape is "decrement, jump back if not zero". That runs
the body *n* times only if you set the counter up correctly and test it in the
right place.

You will build the loop first, then make it accumulate.
