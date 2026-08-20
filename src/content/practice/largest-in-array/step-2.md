---
title: Make It Run Over the Whole Array
stepNumber: 2
hints:
  - "The body in the editor already handles one element and leaves the pointer on the next one. The only thing missing is something that says how many more times to do it."
  - "The count is already sitting in `C`. Bringing it down by one each turn and jumping back while it is not zero is the same loop shape you have written before."
  - "Think carefully about where the label goes. It marks the first instruction that should repeat — and the setup above it must not be part of that, or the best-so-far is thrown away at the start of every turn."
---

The count is at `2000H` and that many unsigned bytes follow from `2001H`.
Store the largest of them at `2050H`.

Assume the count is at least 1.

Your comparison from step 1 is already in the editor, rewritten to keep the
better of `B` and the byte `HL` points at. It handles one element. **This step
is only about making it happen once per element**, and then storing the
answer.

> **The one thing:** The body and the loop fail differently. A wrong body is wrong on every input; wrong repetition is wrong only at the ends, and only on some sizes.

### What is being checked

- `2050H` holds the largest byte in the array
- The array itself is unchanged
- The program reaches `HLT`

### The body and the loop are two different problems

It is worth naming what just happened, because the rest of this course leans
on it. Step 1 asked what to do with *one* element. This step asks how many
times to do it. Those are separate questions, they fail in different ways, and
debugging them together is what makes array programs feel impossible:

- A broken body gives a wrong answer on every input, including a
  two-element array you can check by hand.
- Broken repetition gives the right answer on some sizes and not others, and
  typically an answer that is *nearly* right — off by one element at one end.

When an array program misbehaves, deciding which of the two it is, before
touching anything, is most of the fix.

### What has to sit outside the loop

Three instructions in the editor come before the body, and none of them may be
repeated:

- `LXI H, 2000H` — the pointer is set once, then walks
- `MOV C, M` — the count is read once
- `MOV B, M` — the best-so-far starts as the first element

Putting the loop label above any of them resets that state on every turn. With
`MOV B, M` inside the loop, for example, the best-so-far is re-read from
memory each time and the program answers with the last element rather than the
largest — on some arrays that is the correct answer, which is exactly what
makes the bug hard to see.

### Why the best starts at the first element

Starting the running best at `00H` also works, because no unsigned byte is
below zero. It is a habit that breaks immediately:

- Ask for the **smallest** and the equivalent trick is `FFH` — a different
  magic constant, and one people reliably get the wrong way round
- Move to **signed** bytes and `00H` is not the bottom of the range at all

The first element needs no constant and no reasoning: an array of one element
is already its own answer. That is why the checks include a single-element
array, and the next step is where starting from a constant stops working
altogether.
