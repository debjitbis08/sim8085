---
title: Add It a Byte at a Time
stepNumber: 1
hints:
  - "The two halves cannot be added independently. Adding the low bytes may produce a carry, and that carry belongs to the high half."
  - "There is a second form of `ADD` that also adds in the carry flag. Use the plain one for the low bytes and that one for the high bytes."
  - "Between the two additions you have to move a byte and step a pointer, and neither may disturb the carry flag. `MOV`, `MVI` and `INX` are all safe; `ADD`, `INR` and `XRA` are not all safe, so check the table in the brief."
---

Add the two 16-bit numbers using 8-bit arithmetic only. Store the low byte of
the sum at `2004H` and the high byte at `2005H`.

> **The one thing:** Between the two additions, the carry flag holds the only copy of something you cannot recompute. Touch nothing that writes to it.

### What is being checked

- `2004H` and `2005H` hold the 16-bit sum, low byte first
- The carry flag is set when the sum does not fit in 16 bits
- The four input bytes are unchanged
- The program reaches `HLT`
- You use `ADC`, and not `DAD`

### The carry chain

This is how addition works on paper in base 10, and it is the same in base
256:

```
      12 FF        <- 12FFH
    + 00 01        <- 0001H
    -------
         00        FFH + 01H = 100H: write 00, carry 1
      13           12H + 00H + 1 = 13H
```

`ADD` adds two bytes. `ADC` adds two bytes **plus the carry flag**. So the low
bytes go through `ADD` — there is no carry coming in yet — and the high bytes
go through `ADC`, which folds in whatever the low addition produced. If the
low addition did not carry, the carry flag is clear and `ADC` behaves exactly
like `ADD`, which is why one instruction covers both cases with no branch.

The carry left over at the end is the seventeenth bit of the answer: a sum
larger than `FFFFH` wrapped, and the flag is the only record of it.

### The fragile moment

Between the `ADD` and the `ADC`, the carry flag is carrying the only copy of
information you cannot recompute. Anything that writes to the flags in that
window destroys the answer.

| Safe between the two additions | Destroys the carry |
| --- | --- |
| `MOV`, `MVI`, `LDA`, `STA` | `ADD`, `ADC`, `SUB`, `SBB` |
| `LXI`, `INX`, `DCX` | `ANA`, `ORA`, `XRA`, `CMP` |
| `INR`, `DCR` (these set Z, S, P but not carry) | `RLC`, `RRC`, `RAL`, `RAR` |

`INX H` being flag-free is not a curiosity — it is the reason you can walk a
pointer through a multi-byte number in the middle of a carry chain, which is
how addition of arbitrarily long numbers is written.
