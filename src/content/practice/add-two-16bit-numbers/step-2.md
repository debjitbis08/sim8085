---
title: Add It in One Instruction
stepNumber: 2
hints:
  - "There is an instruction that loads `HL` from two consecutive bytes of memory, and one that stores it back. Both use the same low-byte-first convention the numbers are already stored in."
  - "`DAD` can only ever add into `HL`, so both numbers cannot be sitting there. One of them has to be moved aside, and a single instruction exchanges `DE` and `HL`."
  - "Nothing needs saving between the two halves this time, because there are no halves — the instruction does all sixteen bits at once."
---

Now compute the same sum using the 8085's 16-bit instructions. Store the
result at `2004H` and `2005H` as before.

> **The one thing:** `DAD` sets the carry flag and nothing else — which is why the overflow test still works and why the zero flag never will.

### What is being checked

- `2004H` and `2005H` hold the 16-bit sum, low byte first
- The carry flag is set when the sum does not fit in 16 bits
- The four input bytes are unchanged
- The program reaches `HLT`
- You use `DAD`, and neither `ADD` nor `ADC`

### `HL` is the 16-bit accumulator

`A` is the 8-bit accumulator: arithmetic happens there and nowhere else. `HL`
plays the same role for 16-bit arithmetic, and the instruction set is built
around that assumption:

- `LHLD 2000H` loads `L` from `2000H` and `H` from `2001H` — one instruction,
  the whole 16-bit number, and it matches the low-byte-first layout exactly
- `SHLD 2004H` writes `HL` back out the same way
- `DAD D` adds `DE` into `HL`; `DAD B` adds `BC`; `DAD H` adds `HL` to itself,
  which is a 16-bit doubling and the cheapest shift-left the processor has
- `XCHG` exchanges `DE` and `HL` in one instruction

The awkwardness is that `DAD` has only one possible destination. Both numbers
want to be in `HL` and only one can be, so the usual shape is: load the first
into `HL`, push it aside with `XCHG`, load the second into `HL`, and add.

### `DAD` and the flags

`DAD` is the odd one out in the instruction set: it affects the **carry flag
and nothing else**. No zero flag, no sign, no parity. A 16-bit sum of zero
does not set the zero flag, which surprises people the first time they try to
loop on it.

For this problem that quirk is pure benefit. The carry flag ends up meaning
exactly what it meant in step 1 — the sum overflowed 16 bits — without you
having to protect it from anything.

### Which version is better

The `DAD` version is shorter and faster, and it is what you would write. The
`ADC` version is the one that generalises: three-byte numbers, six-byte
numbers, a hundred-byte numbers all use the same carry chain, and there is no
`DAD` for those. Knowing both is the difference between using the processor
and understanding it.
