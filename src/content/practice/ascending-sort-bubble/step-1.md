---
title: Order One Pair
stepNumber: 1
hints:
  - "You already know both halves of this: comparing two bytes without destroying them, and exchanging two neighbouring bytes through a spare register. This is those two things joined by a conditional jump."
  - "`CMP M` compares the accumulator against the byte `HL` points at. Neither value changes, so after the comparison you still hold the left byte in `A` and the pointer is on the right one."
  - "Arrange it so that being already in order means jumping straight to the end and doing nothing at all."
---

Two bytes sit at `2001H` and `2002H`. If the left one is greater than the
right one, swap them. If it is not, change nothing.

That is the entire operation a bubble sort is built from, and the rest of this
problem is repetition. Get it exactly right here, on two bytes you can check
by eye, and the loops that follow are only bookkeeping.

> **The one thing:** Swap only when the left byte is greater, and it is the carry flag, not the sign flag, that tells you which it is.

### What is being checked

- After the program runs, the byte at `2001H` is not greater than the byte at `2002H`
- The two values are the same two you started with — one swap, not an overwrite
- The bytes on either side, at `2000H` and `2003H`, are untouched
- The program reaches `HLT`

### Comparing through the pointer

`CMP M` subtracts the byte `HL` points at from the accumulator, sets the
flags, and throws the difference away. Both values survive. So the natural
shape is:

```
MOV A, M    ; A = the left byte, pointer on the left
INX H       ; pointer on the right byte
CMP M       ; flags now describe left - right
```

and afterwards you are holding the left byte in `A`, with the pointer sitting
on the right byte — which is precisely what a swap needs.

Carry set means the left byte is smaller: already in order, nothing to do.
Carry clear means it is greater or equal. Swapping two equal bytes changes
nothing, so one conditional jump can cover "smaller" and leave everything else
to the swap. Remember it is carry, not sign — `FFH` is the largest byte there
is, and `JM` will tell you otherwise.

### The swap, again

You wrote this in the swap problem: the left byte is already safe in `A`, so
read the right byte into a spare register, write `A` over the right byte, step
the pointer back, and write the spare register over the left byte.

Where the pointer ends up matters more than it looks. In the next step this
same code runs in a loop, and the right-hand byte of one pair is the left-hand
byte of the next — so ending on the right byte is exactly where the following
comparison wants to begin.
