---
title: Copy Onto Itself
stepNumber: 2
hints:
  - "Run the copy already in the editor before you change anything, and look at what it leaves in memory. Then do the same three bytes on paper, writing down what is there after each write, and look at the byte you are about to read next."
  - "Nothing is wrong with the loop except the direction it runs in. `DCX` is the mirror of `INX`, and the counter does not care which way the pointers move."
  - "To start at the end, the source pointer needs to reach `2001H + count - 1`. Adding the count to the low byte of the pointer through the accumulator is one way; walking there is another."
---

Now shift the block one byte higher in memory: copy the `count` bytes at
`2001H` onwards to `2002H` onwards, so that every byte moves up by one.

Assume the count is at least 1.

> **The one thing:** The body is right and the loop is wrong. When the destination sits above the source, copy from the end backwards.

### What is being checked

- Each byte ends up one address higher than it started
- The count at `2000H` is unchanged
- The program reaches `HLT`

### Why the loop from step 1 destroys the data

Take three bytes, `11H 22H 33H`, at `2001H`, `2002H`, `2003H`, and run the
forward copy:

```
        2001 2002 2003 2004
start     11   22   33   --
copy 1    11   11   33   --   2001 -> 2002
copy 2    11   11   11   --   2002 -> 2003
copy 3    11   11   11   11   2003 -> 2004
```

The second read is of `2002H`, which the first write has already overwritten.
The original `22H` no longer exists anywhere, so the loop faithfully copies
`11H` across the entire block. This is **aliasing**: two names for the same
storage, and a program that assumed they were different places.

There is nothing wrong with the counter, the pointers or the instructions. The
program is destroying its own input because it reads a location *after* it has
written to it.

### The loop is wrong, the body is not

Notice which half of the program is at fault. The two instructions that move
the byte are exactly right and are not touched by the fix. What is wrong is
the order the loop visits things in — the same body, driven backwards, is
correct. Direction is a property of the repetition.

### Run it backwards

Start at the last byte and work down. The last source byte is copied to a
place beyond the block, which no one has read yet. The second-to-last is
copied over the last, which has already been read. At every step, the byte
being read is one that no earlier write has touched.

That gives the general rule, worth remembering long after the 8085:

- Destination **above** the source: copy from the **end** backwards
- Destination **below** the source: copy from the **start** forwards
- No overlap: either direction works

You already have every instruction you need. `DCX H` and `DCX D` step the
pointers back, and like `INX` they touch no flags at all.

### Getting to the end

The last byte of the source block is at `2001H + count - 1`, which is
`2000H + count`. You can walk a pointer there in a small loop, or you can do
arithmetic on the pointer: `MOV A, L`, add the count, `MOV L, A` puts the sum
back. The second is shorter, and it is a reminder that a register pair is just
two ordinary registers when you need it to be.
