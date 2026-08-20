---
title: The Smallest as Well
stepNumber: 3
hints:
  - "Nothing about the walk changes. What changes is that each element is now compared twice, against two different running answers held in two different registers."
  - "`CMP` leaves the accumulator untouched, so the element you loaded can be compared a second time without reloading it."
  - "Both running answers start as the first element. Here that is not a style preference — starting the smallest at `00H` means no element is ever smaller, and the answer is always `00H`."
---

Same array: the count is at `2000H` and that many unsigned bytes follow from
`2001H`. Store the largest at `2050H` **and** the smallest at `2051H`, in a
single pass over the array.

Your program from step 2 is in the editor. The loop around the body is already
correct and does not change — same pointer, same counter, same jump. **Only
the body changes**, by answering a second question about each element it
already has in hand.

Assume the count is at least 1.

> **The one thing:** The loop is finished and does not change. Only the body changes, by answering a second question about an element it already has in hand.

### What is being checked

- `2050H` holds the largest byte and `2051H` the smallest
- With one element, both answers are that element
- The array itself is unchanged
- The program reaches `HLT`

### Why one pass rather than two

You could run the previous step's loop twice, once for each answer, and it
would be correct. It would also read the whole array twice, and walking memory
is the expensive part of a program like this — the comparison is one
instruction, the walk around it is five.

The rule generalises well beyond this problem: when two questions can be
answered from the same journey through the data, answer them on the same
journey. The loop body grows by a couple of instructions; the loop itself does
not run again.

### Now zero really is wrong

The last step warned that starting the running best at `00H` works only by
luck. Here is the bill.

For the largest, `00H` is a safe start because nothing is below it. For the
smallest it is a catastrophe: no unsigned byte is less than zero, so the
running smallest never gets replaced and every answer comes out as `00H`. The
mirror-image constant `FFH` works for the smallest and breaks the largest.

Two constants, each correct for one answer and wrong for the other, is exactly
the kind of thing that gets mixed up. Starting both from the **first element**
needs no constants and no thinking: one element is trivially both the largest
and the smallest of itself, and every element after it is an ordinary
comparison.

### Register bookkeeping

This is the first loop where you are close to running out of registers. `A`
holds the current element, `HL` is the pointer, and one register is the
counter — that leaves two answers needing two more. Write down which register
holds what before you start; the bug in a program like this is almost never
the comparison, it is using `B` for two different things.

There is an optimisation available: an element that is larger than the running
largest cannot possibly be smaller than the running smallest, so that branch
can skip the second comparison. It is correct, it is worth understanding, and
it is not required here — get the plain version passing first.
