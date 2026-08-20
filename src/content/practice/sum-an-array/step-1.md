---
title: Walk the Array
stepNumber: 1
hints:
  - "The first byte is the count, not data. Read it before you start walking, then move the pointer on to the first number."
  - "A loop needs something that ends it. Decrementing a register sets the zero flag, and a conditional jump can test that flag to decide whether to go round again."
  - "Order matters: advance the pointer first, then decrement and test. Testing first runs the body one time too few."
---

Before adding anything, get the loop right on its own.

The count is at `2000H`, and that many bytes follow from `2001H`. Walk across
them without touching the values, and stop when the array is exhausted.

> **The one thing:** Advance the pointer first, then decrement and test. Testing first runs the body one time too few, and on a one-element array that means not at all.

### What is being checked

- `HL` finishes **just past** the last byte, at `2001H + count`
- `C` has counted down to zero
- The array itself is unchanged
- The program reaches `HLT`

### Why the ending position matters

If `HL` ends on the last byte rather than past it, your loop ran one time too
few. With three bytes that is easy to miss, because the pointer is only one
address out and nothing crashes. The checks include a one-byte array, where running
one time too few means not running at all, and the mistake becomes obvious.

Assume the count is at least 1. A zero count is its own kind of trap, and it
gets a problem of its own later.
