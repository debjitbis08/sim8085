---
title: When the Multiplier is Zero
stepNumber: 3
hints:
  - "Run the program from the last step before changing it. Then work out on paper how many times that loop runs when the counter starts at `00H`."
  - "The fix is a test placed *before* the loop, jumping past it entirely. The loop body itself does not change at all."
  - "`ORA A` sets the zero flag from the accumulator without altering it. After that, take care: `LXI`, `MVI`, `MOV` and `LDA` leave the flags alone, but `XRA A` would clear the very flag you are about to branch on."
---

The program you just wrote is wrong for exactly one input, and this step is
about that input.

Your step 2 code is already in the editor. Run it before you change anything:
the checks now include a multiplier of `00H`.

Make the program produce `0000H` when the multiplier is zero, while keeping
every other answer exactly as it was.

> **The one thing:** A loop that tests its counter at the bottom always runs at least once — and starting from zero, it runs 256 times.

### What is being checked

- `2002H` and `2003H` hold the 16-bit product
- The product is `0000H` when either input is `00H`
- Both input bytes are unchanged
- The program reaches `HLT`

### A loop that tests at the bottom always runs

This is the shape you have used for every loop so far:

```
LOOP: ...body...
      DCR C
      JNZ LOOP
```

The counter is checked *after* the body, so the body always runs at least
once. With `C` holding 3 that is exactly right. With `C` holding 0, the first
`DCR C` turns it into `FFH`, the jump is taken, and the loop runs **256
times** before `C` comes back round to zero. `2AH * 0` becomes `2AH` added 256
times, which is `2A00H`.

Summing an array never exposed this, because an array always had at least one
element. A multiplier of zero is not an edge case in that sense — it is an
ordinary number with an ordinary answer, and the loop gets it spectacularly
wrong.

### It was wrong in step 1 too, and you could not see it

Go back to the 8-bit version and try a multiplier of zero by hand. The loop
runs its 256 times, the accumulator wraps round, and the answer comes out as
`00H` — which is correct. Adding any byte to itself 256 times always wraps to
exactly zero, so the bug produced the right answer by accident, and only
because the result was being truncated to eight bits.

That is worth sitting with for a moment. The program was already broken. The
test that would have caught it existed. The answer was right anyway, and
stayed right until a later change — widening the product — quietly removed the
coincidence that was hiding it.

### The two standard fixes

**Test before entering.** One `ORA A` and one conditional jump before the
loop, straight to the store. This is what most 8085 code does, and it is what
this step expects.

**Move the test to the top.** Restructure so the counter is checked before the
body runs, `while` rather than `do-while`. Correct, slightly longer here, and
the shape most high-level languages give you by default.

From now on, every counted loop deserves the same question: **can this count
be zero, and what does my loop do if it is?**

### Setting the flags without disturbing the value

`ORA A` ORs the accumulator with itself. `A` comes out exactly as it went in,
and the flags are set from the result — so the zero flag now tells you whether
`A` is zero. `ANA A` does the same job. This is the standard 8085 idiom for
"set the flags from this register".

Once the flags are set you can still finish setting the program up before you
branch, as long as every instruction in between leaves the flags alone: `LDA`,
`MOV`, `MVI` and `LXI` all qualify, which is enough to load the multiplicand
and clear `HL`. `XRA A` does not qualify — it clears the accumulator by doing
arithmetic, and rewrites every flag on the way.
