---
title: Look at One Bit
stepNumber: 1
hints:
  - "Rotating right moves bit 0 off the bottom of the accumulator, and the bit that falls off lands in the carry flag."
  - "Once the bit is in the carry flag, deciding what to store is the same conditional-jump shape you used for the borrow."
  - "`MVI` does not disturb the flags, so you can load `A` with the value you are about to store without losing the bit you just tested."
---

Is the byte at `2000H` odd or even? Store `01H` at `2001H` if it is odd, and
`00H` if it is even.

Do it by rotating the byte, not by masking it. `ANI` is not allowed here, for
a reason given below.

> **The one thing:** A right rotate drops bit 0 into the carry flag. A left rotate drops bit 7, which answers a different question entirely.

### What is being checked

- `2001H` holds `01H` for an odd byte and `00H` for an even one
- `2000H` still holds the original byte
- The program reaches `HLT`
- You do not use `ANI`

### The four rotates

| Instruction | Direction | What lands in carry | What comes in the other end |
| --- | --- | --- | --- |
| `RLC` | left | old bit 7 | old bit 7 |
| `RRC` | right | old bit 0 | old bit 0 |
| `RAL` | left | old bit 7 | the old carry flag |
| `RAR` | right | old bit 0 | the old carry flag |

`RLC` and `RRC` rotate the eight bits of `A` around a circle, and copy the bit
that wrapped into the carry as well — so eight of them return `A` to exactly
where it started. `RAL` and `RAR` treat carry as a ninth bit in the circle, so
they need *nine* to come back around, and whatever was in the carry beforehand
gets pushed into the byte.

The direction is not a free choice. Bit 0 is the one that decides odd or even,
and only a **right** rotate moves it into the carry flag. `RLC` and `RAL`
rotate the other way and put bit 7 there instead, which answers a completely
different question: whether the byte is `80H` or above.

That mistake is easy to make and easy to miss, because for plenty of bytes the
two answers happen to agree. One of the checks is `80H` exactly — an even
number whose top bit is set — and a left rotate reports it as odd.

### Why masking is ruled out

`ANI 01H` clears every bit except the lowest and sets the zero flag if what
remains is zero. It is a perfectly good test for oddness, it is one
instruction, and in real code it is what you would write.

It is ruled out here because it answers this exact question and no other. Ask
for bit 5 and the mask changes; ask about all eight bits and you need eight
different masks. Rotation answers the same question with the same instruction
every time, which is what makes the next step a four-line loop instead of a
list. Learn the general tool on the small problem.
