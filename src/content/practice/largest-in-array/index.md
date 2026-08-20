---
title: Largest Number in an Array
description: Compare bytes without destroying them, and carry a running best through a loop. The pattern behind searching, sorting and every minimum or maximum.
difficulty: intermediate
order: 30
tags: [arrays, loops, comparison, flags]
access: plus
status: active
---

A count sits at `2000H`, and that many bytes follow from `2001H`. Find the
largest one.

You can already walk an array and accumulate a total. This problem changes
what happens inside the loop: instead of combining every element into the
answer, you *choose* between them. That needs a comparison, and the 8085 has
no instruction that says "is this bigger". What it has is subtraction — and
the observation that once you have subtracted, the flags already contain the
answer, so the difference itself can be thrown away.

Two things go wrong for almost everybody the first time:

- Comparing with the **wrong flag**. The sign flag looks like it should mean
  "smaller", and for the data most people test by hand it appears to work.
- Starting the running best at **zero**. It works here, by luck, and stops
  working the moment the same program is asked for the smallest element.

The first step is a comparison with no loop at all. The second puts it inside
one. The third asks for the smallest element as well, in the same single pass
— which is where starting from zero stops being a matter of taste and starts
being a wrong answer.
