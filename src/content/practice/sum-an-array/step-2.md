---
title: Accumulate the Total
stepNumber: 2
hints:
  - "The accumulator does not start at zero just because it usually looks that way. Clear it yourself before the first addition, or a leftover value is counted into the total."
  - "You already know how to add one register into `A`. There is a form of the same instruction that adds the byte `HL` points at instead, which is what lets one line serve every element."
  - "Do the addition before you move on. If you advance the pointer or decrement the counter first, you will miss a byte at one end of the array."
---

Now make the loop do some work. Add every byte in the array, leave the total
in `A`, and store it at `2050H`.

> **The one thing:** `A` does not start at zero just because it usually looks that way. Clear it yourself.

### What is being checked

- `A` holds the total
- `2050H` holds the same total
- The array itself is unchanged
- The program reaches `HLT`

### Two mistakes the checks are looking for

**Assuming `A` starts at zero.** It usually does, so a program that never
clears it looks correct every time you run it by hand. One of the checks
starts with `A` set to `FFH`, and that program fails immediately.

**Ignoring the overflow.** Three bytes of `FFH`, `FFH`, `03H` total `201H`,
which does not fit in eight bits. The accumulator keeps `01H`, and that is
what should be stored. You are not asked to handle the carry here, only to
not be surprised by it.
