---
title: Stop When It Is Already Sorted
stepNumber: 4
hints:
  - "The array itself tells you when to stop. A pass that swaps nothing has found every pair already in order, and that can only mean the whole array is in order."
  - "One register, set to zero at the top of each pass and set to one wherever the swap happens, is enough to record it. `MVI` sets no flags, so it is safe to put right next to the comparison."
  - "Read the flag after the inner loop, before the outer counter comes down. `ORA A` sets the zero flag from a value in `A` without changing it."
---

Your sort works, and it does the same amount of work whatever the data. An
array that arrived perfectly sorted still gets `n - 1` full passes, comparing
every pair and changing nothing.

Make the program stop as soon as the array is in order.

> **The one thing:** Only the *absence* of swaps proves the array is sorted. A pass that did swap something tells you nothing at all.

### What is being checked

- Everything from the previous step: the array comes out sorted, and is still
  a permutation of what went in
- The count at `2000H` is unchanged
- The program reaches `HLT`
- **Two time limits.** One check hands you a 16-element array that is already
  sorted and requires the program to finish within 3000 T-states; the previous
  step's answer takes about 10400 and fails it. A second hands you a
  16-element array that is sorted apart from its first two elements, and
  allows 4000 — enough for one swapping pass and one confirming pass, and not
  enough for anything that keeps going afterwards.

### A check on time, not just on the answer

This is the first step that measures *how* your program gets to the answer.
The panel shows a T-state count for every run: T-states are clock cycles, the
processor's own unit of time, and each instruction costs a fixed, documented
number of them. `MOV A, M` costs 7, `JNZ` costs 10 when it jumps and 7 when it
does not, and so on down the instruction set.

A budget expressed in T-states is how real 8085 work is specified, because it
is the only measure of speed that does not depend on which machine you run on.
The limit here is loose — roughly four times what a straightforward early-exit
solution needs — so it is checking that you stopped early, not how elegantly.

### What tells you the array is sorted

A pass that performs **no swaps** found every adjacent pair already in order.
That is the definition of a sorted array, so there is nothing left to do and
any further passes are guaranteed to change nothing.

The reverse is not true, and it is worth being precise about it: a pass that
*does* swap something has not told you anything about whether more work is
needed. Only the absence of swaps is informative.

So the loop becomes: run a pass, and if it swapped nothing, stop. Keep the
`n - 1` outer counter as well — not because it is needed for correctness once
you have the flag, but because it costs one instruction and guarantees
termination even if you get the flag logic wrong.

### Recording the fact

Pick a register that nothing else in the pass uses, and use it as a flag:

- set it to `00H` at the top of every pass, alongside the pointer and the
  inner counter
- set it to `01H` at the point in your code where a swap actually happens
- after the inner loop finishes, test it and stop if it is still `00H`

Where you clear the flag is the whole difficulty, and getting it wrong fails
in two opposite directions:

- **Cleared once, before the outer loop.** The first pass to swap anything
  sets it, and nothing ever clears it again, so the test never fires. The
  array still comes out sorted — this bug costs no correctness at all — and
  the only thing that notices is the time limit.
- **Cleared inside the inner loop.** Now the flag describes the *last pair
  compared* rather than the whole pass. A pass that swapped early on but left
  its final pair alone reports "no swaps", and the program stops with the
  array still unsorted.

Clearing it once at the top of each pass, alongside the pointer and the inner
counter, is what makes it mean "did this pass swap anything". Both of the
mistakes above have a check waiting for them.

`MVI` touches no flags, so you can set the marker immediately after the
comparison without disturbing anything. To test it afterwards, move it to `A`
and use `ORA A`, the same idiom that guarded the multiplication loop.

### What this buys

The best case drops from `n - 1` passes to one, which is the difference
between a sort that is slow on all input and one that is fast on data that is
nearly in order. That distinction matters in practice: nearly-sorted input is
extremely common, which is exactly why this version of bubble sort is the one
worth keeping.
