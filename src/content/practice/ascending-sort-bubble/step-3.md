---
title: Sort the Whole Array
stepNumber: 3
hints:
  - "Everything the pass consumes has to be built again at the top of every pass: the pointer has walked to the end of the array, and the inner counter has run down to zero."
  - "The outer counter must live in a register the pass never touches. Check which registers your pass uses before you pick one."
  - "`count - 1` passes are always enough, because each pass parks at least one more element permanently at the end."
---

Now sort the array properly. Repeat the pass until the array is in ascending
order, in place.

Your pass from step 2 is already in the editor and does not need to change.
**This step adds a loop around a loop**, and nothing else.

Assume the count is at least 2.

> **The one thing:** Everything the pass consumes — the pointer and the inner counter — has to be rebuilt at the top of every pass. Neither repairs itself.

### What is being checked

- The array is in ascending order
- It is a permutation of the original — no value invented, none lost
- The count at `2000H` is unchanged
- The program reaches `HLT`

### Why `count - 1` passes is enough

Each pass drives the largest remaining element to the end of the region it
covers. So after one pass the last element is final; after two, the last two
are final; after `n - 1` passes, `n - 1` elements are in their final places,
and the one left over has nowhere else to be. That is the proof, and it means
a fixed outer count works — no cleverness required.

You will notice the outer loop doing more work than it needs to: an array that
arrived already sorted still gets `n - 1` full passes over it. Leave that
alone for now — the checks here care only about what comes out, and the next
step is entirely about making the program stop as soon as it can.

There is a second saving available that the next step does *not* cover: each
pass could be one comparison shorter than the last, since the tail of the
array is already final. Worth trying once everything else works.

### Two passes, traced

Three elements, `03 01 02`, so the outer loop runs `3 - 1 = 2` times. Follow
what happens to the pointer and to each counter:

```
pass 1    outer counter = 2
  set up  HL -> 2001    inner counter = 2
  pair 1  03 > 01  swap     01 03 02    inner = 1
  pair 2  03 > 02  swap     01 02 03    inner = 0   inner loop ends
                                        outer = 1

pass 2    outer counter = 1
  set up  HL -> 2001    inner counter = 2      <- both rebuilt
  pair 1  01 < 02  leave    01 02 03    inner = 1
  pair 2  02 < 03  leave    01 02 03    inner = 0   inner loop ends
                                        outer = 0   outer loop ends
```

The two `set up` lines are the point of the whole step. At the end of pass 1
the pointer is sitting at `2003H` and the inner counter is `0` — neither is
usable, and neither repairs itself. Pass 2 works only because both are built
again from scratch.

Notice also that the array was already sorted at the end of pass 1, and pass 2
did nothing but confirm it. That wasted pass is the subject of the next step.

### The thing that actually goes wrong

It is almost never the sorting logic. It is state left over from the previous
pass:

- `HL` is sitting at the far end of the array, not at the start
- the inner counter is zero, so the next pass makes no comparisons at all
- the outer counter got clobbered by a register the pass was using

Build the pass's setup — pointer, inner counter — *inside* the outer loop, at
the top, so that every pass starts from identical conditions. Then the only
thing that survives from one pass to the next is the outer counter and the
array itself.

Take a moment to write down which register does what before you start. Five
registers, five jobs, and this is the first program where losing track of one
of them is easy.
