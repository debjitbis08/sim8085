---
title: One Pass Over the Array
stepNumber: 2
hints:
  - "The loop visits pairs, not elements. Four elements make three adjacent pairs, so the counter is one less than the count."
  - "The pair code from the last step already leaves the pointer on the right-hand byte, which is the left-hand byte of the next pair. That is the whole reason the loop needs nothing extra to advance."
  - "The one place that needs care is the branch that skips the swap: it has to land where the counter is decremented, not past it, or the loop will never end."
---

Now run that comparison across the whole array.

The count is at `2000H` and that many unsigned bytes follow from `2001H`. Make
**one** pass: take each adjacent pair in turn, starting from the first, and
order it exactly as you did in step 1. Then stop.

The array is not sorted after this, and it is not supposed to be. Do not add
an outer loop yet.

> **The one thing:** `n` elements make `n - 1` pairs, and the branch that skips the swap must land on the counter — not past it, or a sorted array loops forever.

### What is being checked

- The array holds exactly the result of one left-to-right pass
- The count at `2000H` and the byte just past the array are unchanged
- The program reaches `HLT`

### What a pass does

Take `05H 03H 08H`:

```
05 03 08   compare 05 and 03  ->  05 is greater, swap
03 05 08   compare 05 and 08  ->  in order, leave it
03 05 08   done: two comparisons for three elements
```

Two things always come out of a pass, whatever the data:

1. The **largest element ends up last**. Once the pass picks it up it keeps
   comparing bigger-than-everything and keeps moving right, all the way to the
   end. That is where "bubble" comes from.
2. Everything else has drifted at most one place left. Nothing else is
   guaranteed.

Fact 1 is what makes the whole algorithm terminate, and the next step is built
on it. Fact 2 is why the array below is still visibly unsorted and why this
step checks for the exact result of one pass rather than for a sorted array.

### Counting pairs, not elements

`n` elements have `n - 1` adjacent pairs, so a pass makes `n - 1` comparisons.
Setting the counter to the count itself makes the loop reach past the end of
the array and compare the last element against whatever happens to live there
— which is neither yours to read nor yours to overwrite. One of the checks
puts a marker byte immediately after the array to catch exactly that.

### Where the skip branch lands

This is the one genuinely new thing in the step. Your pair code jumps over the
swap when the two bytes are already in order. Inside a loop that jump must
land on the loop's bookkeeping — the `DCR` and the `JNZ` — and not past it.
Jumping past the counter means an array that is already sorted never
decrements anything, and the program runs forever.
