---
title: Multiply by Adding
stepNumber: 1
hints:
  - "Multiplying is a counted loop: add one of the numbers into a running total, as many times as the other number says."
  - "Three jobs, three homes: the number being added, the count of how many additions are left, and the running total. The total belongs in `A`, because `ADD` puts it there whether you like it or not."
  - "The total has to start at zero, and it will not do that on its own. `XRA A` is the usual way to clear the accumulator."
---

Multiply the byte at `2000H` by the byte at `2001H` and store the product at
`2002H`.

For this step you may assume the multiplier at `2001H` is **at least 1**, and
that the product fits in eight bits. Both assumptions get removed later.

> **The one thing:** There is no `MUL`. Multiplication is a counted loop, and the total has to live in `A`, because `ADD` puts it there whether you like it or not.

### What is being checked

- `2002H` holds the product
- Both input bytes are unchanged
- The program reaches `HLT`
- No register is assumed to start at zero

### Multiplication is a loop

`7 * 4` is `7 + 7 + 7 + 7`. That is not a trick or an approximation — it is
the definition, and with no `MUL` instruction on the 8085 it is also the
implementation. The loop you need is the one you have already written twice:
something to add, a counter coming down to zero, `DCR` and `JNZ`.

The only decision is which register does what. `A` has to hold the running
total, because `ADD B` computes `A + B` and leaves the answer in `A` — there
is no way to accumulate anywhere else. So the multiplicand needs a register of
its own, and so does the counter.

### Clear the total yourself

The accumulator holds whatever the last program left there. Adding into it
without clearing it first gives an answer that is too large by exactly that
leftover, which is invisible on a fresh machine and wrong everywhere else. One
of the checks starts every register at a non-zero value.

`XRA A` exclusive-ORs the accumulator with itself, which always gives zero. It
is one byte long and is the conventional way to say "clear `A`" on this
processor. `MVI A, 00H` does the same thing in two bytes. There is a reason to
prefer one over the other, and it shows up in the very next step.
