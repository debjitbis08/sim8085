---
title: Add and Store the Result
stepNumber: 2
hints:
  - "Arithmetic on the 8085 always goes through the accumulator. Whatever you add, the total ends up in `A`, so the question is only what you add to it."
  - "The starting code leaves `HL` pointing at the second number. The answer belongs one byte further along, so you do not need a new address here either."
  - "Reading a byte through `M` has a mirror image for writing it: the same instruction, with the operands the other way round."
---

Now finish the program. Add the two numbers and store the answer at `2002H`.

The loading code from the previous step is already in the editor, so you only
need the arithmetic and the store.

> **The one thing:** Arithmetic always goes through `A`, and the carry flag is not an error — it is the ninth bit of an answer that outgrew the register.

### What is being checked

- `2002H` holds the sum
- The carry flag reflects whether the addition overflowed
- `2000H` and `2001H` still hold the original numbers
- The program reaches `HLT`
- You reach memory through `HL`, and **not** with `LDA` or `STA`

### About the carry

`FFH + 02H` is `101H`, which does not fit in eight bits. The accumulator keeps
the low byte, `01H`, and the carry flag records that a ninth bit was produced.
The carry is not an error. It is the processor telling you the true answer was
larger than one register can hold, and it is what makes multi-byte arithmetic
possible later on.

You are not asked to do anything about the carry here. Just do not clear it:
some instructions leave the flags alone and others do not, and the check will
notice.
