---
title: Multiply Two 8-bit Numbers
description: The 8085 has no multiply instruction, so build one out of a counted loop, then widen it to a 16-bit product with a register pair.
difficulty: intermediate
order: 60
tags: [arithmetic, loops, 16-bit, counters]
access: plus
status: active
---

A multiplicand sits at `2000H` and a multiplier at `2001H`. Multiply them.

There is no `MUL` on the 8085. Multiplication is something you build, and the
simplest construction is the definition itself: `7 * 4` means adding 7 to
itself 4 times. That turns a multiplication into a counted loop, which you
already know how to write.

Two things make this harder than it sounds, and they are worth separating
because they fail in completely different ways:

1. **The product does not fit.** Two bytes multiplied can reach `FE01H`.
   Anything beyond `FFH` needs sixteen bits, which means the running total
   cannot live in the accumulator.
2. **A multiplier of zero.** The natural loop shape on the 8085 decrements a
   counter and jumps back while it is non-zero, which tests the counter at the
   *bottom*. Such a loop always runs at least once — and from zero it runs 256
   times, wrapping the whole way round.

So: three steps. Build the loop, widen the total to sixteen bits with the
register-pair arithmetic from the previous problem, and then go looking for
the input that breaks it.

That last step is in this order for a reason. With an 8-bit product the
zero-multiplier bug is *invisible*: 256 additions wrap to exactly zero, which
is the right answer. It only becomes a visible, wrong number once the product
is sixteen bits wide — a small lesson in how long a broken program can look
correct.
