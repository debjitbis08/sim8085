---
title: Copy the Block
stepNumber: 1
hints:
  - "The two-instruction body in the editor is complete. What is missing is everything around it: the pointers have to move, the counter has to come down, and something has to jump back."
  - "Both pointers advance on every turn, not just one of them. A copy loop that only steps the source writes every byte to the same destination."
  - "Take care where the loop label goes. The two `LXI` instructions and the reading of the count all happen once; putting the label above them restarts the copy from the beginning on every turn."
---

The count is at `2000H` and the bytes to copy follow from `2001H`. Copy them
to `3000H` onwards.

Assume the count is at least 1.

The body is already in the editor, and it is two instructions long: read
through `HL`, write through `DE`. **This step is about the loop around it**,
which is where all the difficulty in a block copy actually lives.

> **The one thing:** Both pointers have to advance. Step only the source and every byte lands on the same destination address, with a body that looks perfectly correct.

### What is being checked

- `3000H` onwards holds a copy of the block
- The source block is unchanged
- The byte just past the end of the destination is untouched
- The program reaches `HLT`

### Two pointers, one loop

The array sum needed one pointer because it had one thing to look at. A copy
needs two, and the new idea in this step is that they move **in lockstep**:
read where `HL` points, write where `DE` points, step both forward, count
down.

That is a property of the loop, not of the body. The body cannot tell you
whether the pointers are advancing together — it does the same two
instructions either way — which is why forgetting one `INX` produces a
destination full of identical bytes and a body that looks perfectly correct
under inspection.

`HL` gets the privileged treatment — `MOV A, M` reads through it directly.
`DE` has only the narrow door, `STAX D`, which writes the accumulator to the
byte `DE` points at. So the accumulator is the vehicle every byte rides in, and
because it is immediately written out again, nothing else in the loop may use
it.

You can assign the roles either way round: `HL` as source and `DE` as
destination, or the reverse with `LDAX D` doing the reading. Both are correct
and both are used in real code.

### Copying one too many

The commonest bug in a copy loop is running one iteration too far, and unlike
a sum it does not show up as a wrong number — it shows up as one extra byte
written past the end of the destination, which corrupts whatever was living
there. Nothing crashes and nine times out of ten nothing looks wrong.

One of the checks puts a marker byte immediately after the destination block
and insists it survives. That is not an artificial rule: in a real program
that byte belongs to something else.
