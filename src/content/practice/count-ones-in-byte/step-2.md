---
title: Make It Run Over All Eight Bits
stepNumber: 2
hints:
  - "The body in the editor already deals with one bit. What is missing is something that says how many bits there are, and something that brings it down to zero."
  - "This loop count does not come from memory and does not depend on the data. It is eight, every time, so it is a number you put in a register yourself before the loop starts."
  - "Pick a register for the turn counter that the body does not already use. `A` holds the byte being rotated and `C` holds the tally, so both are taken."
---

Count the `1` bits in the byte at `2000H` and store the total at `2001H`. The
answer is somewhere between `00H` and `08H`.

Your rotate-and-test from step 1 is already in the editor, with a tally added
to it. It examines one bit. **This step is only about making it happen eight
times.**

> **The one thing:** This loop's count comes from the width of a byte, not from memory. You put the eight there yourself, and nothing else will stop the rotation.

### What is being checked

- `2001H` holds the number of `1` bits in the byte
- `2000H` still holds the original byte
- The program reaches `HLT`
- No register is assumed to start at zero

### A loop that counts turns, not data

Every loop you have written so far ran once per array element, so the number
of turns came out of memory — it was the count byte. This one is different.
There is no count in memory, because a byte always has eight bits. The loop
count is a constant that you put in a register yourself, and it is the only
thing keeping the loop finite: the data does not shrink as you go, and the
accumulator will happily rotate forever.

That makes three registers doing three clearly separate jobs:

- `A` holds the byte, and is consumed a little more with each rotation
- one register holds the running tally of ones
- one register counts the eight turns down to zero

The tally cannot be `A`, and neither can the turn counter. Worth saying
plainly, because the instinct on this processor is to reach for the
accumulator first and it is already busy.

### Nothing starts at zero

The tally in the editor is cleared with `MVI C, 00H` for a reason. The
simulator hands you a machine with every register at `00H`, so a program that
forgets that line works perfectly right up until it does not. One of the
checks starts every register at a non-zero value, and it will find any counter
or tally you leave uninitialised.

### Where the loop label goes

`LDA 2000H` and the clearing of the tally happen once. The rotation, the test
and the tally happen eight times. The label divides one from the other, and
putting it one line too high means the byte is re-read from memory on every
turn, so the same bit is examined eight times over.

### Which rotate, and why it barely matters here

`RRC` eight times returns the byte to its original value, so `A` still holds
the input when the loop ends. `RAR` eight times does not: it drags the carry
flag through the byte, and what is left is a mixture. Both count correctly,
because either way each of the eight original bits passes through the carry
flag exactly once. If you later want the byte as well as the count, `RRC` is
the one that hands it back for free.

Take care with what sits between the rotation and the test of the carry flag.
`INR` and `DCR` set the zero flag but leave carry alone, which is precisely
why they can do the loop's bookkeeping without disturbing the bit you are
inspecting. `ADD`, `SUB` and `XRA` would destroy it.
