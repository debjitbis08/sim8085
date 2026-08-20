---
title: Compare Two Bytes
stepNumber: 1
hints:
  - "You want the flags a subtraction would set, but not the difference itself — there is one instruction that does exactly that and leaves the accumulator alone."
  - "After comparing, the carry flag answers the question. The sign flag (`JM` / `JP`) answers a different question, about signed numbers, and will mislead you here."
  - "Arrange it so one of the two branches has nothing to do: assume one value is the answer, and only replace it if the comparison says otherwise."
---

Two bytes are at `2000H` and `2001H`. Store the larger of them at `2002H`.
Treat them as ordinary unsigned numbers, so `FFH` is the biggest byte there
is.

> **The one thing:** `CMP` is a subtraction you throw away. For unsigned bytes it is the carry flag, never the sign flag, that says which value was smaller.

### What is being checked

- `2002H` holds the larger of the two bytes, or either value when they are equal
- `2000H` and `2001H` still hold the original numbers
- The program reaches `HLT`

### `CMP` is a subtraction you throw away

`CMP B` computes `A - B`, sets all the flags from the result, and then
discards the result. `A` and `B` come out unchanged. That is the whole
instruction, and it is why comparing is cheap: you can compare the same
accumulator against a dozen values in a row without ever reloading it.

What the flags mean afterwards, for **unsigned** bytes:

| Flags after `CMP B` | Meaning |
| --- | --- |
| Zero set | `A` equals `B` |
| Carry set | `A` is less than `B` |
| Carry clear, zero clear | `A` is greater than `B` |

`CMP M` compares against the byte `HL` points at, which is what the next step
will want.

### The trap: carry, not sign

`JM` jumps when the sign flag is set, meaning the result of the subtraction
had its top bit set. For signed values that is the right test. For unsigned
bytes it is wrong, and wrong on real data:

`FFH` is 255, comfortably larger than `01H`. `FFH - 01H` is `FEH`, whose top
bit is set — so `JM` reports that 255 is the *smaller* number. Carry is the
flag that tracks unsigned order, because carry is the borrow: it is set
exactly when the subtraction had to go below zero.

One of the checks is that exact pair, so a sign-based answer fails here rather
than three problems from now.
