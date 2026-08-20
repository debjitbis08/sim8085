---
title: Swap Bytes That Are Far Apart
stepNumber: 2
hints:
  - "`HL` is not the only register pair that can hold an address. `DE` can too — but it cannot read or write memory the way `M` does."
  - "Two instructions exist for exactly this: one loads `A` from the byte `DE` points at, the other stores `A` back to it. Their names end in `X`, for indirect."
  - "Because every byte going in or out of `DE`'s address has to pass through `A`, the value you displace has nowhere to wait except another register."
---

Now the two bytes are nowhere near each other: one at `2000H` and one at
`3000H`. Swap them, using a pointer for each.

> **The one thing:** `DE` can hold an address, but every byte going in or out of it has to pass through `A`.

### What is being checked

- `2000H` holds the byte that was at `3000H`
- `3000H` holds the byte that was at `2000H`
- The program reaches `HLT`
- You reach memory through the pointers, and **not** with `LDA` or `STA`

### Why `LDA` and `STA` are ruled out here

They would work. Both addresses are fixed, so `LDA 3000H` / `STA 2000H` is a
perfectly good three-line answer, and by the rule of thumb from the previous
problem it is even the right tool for two fixed addresses.

The reason this step insists on pointers anyway is that these two addresses
are about to start moving. In the block-copy and sorting problems the source
and destination advance on every pass of a loop, and at that moment `LDA` and
`STA` become useless — the address is baked into the instruction and there is
no way to change it. Getting the two-pointer shape into your fingers now, on a
problem simple enough to check by eye, is the whole point.

### `DE` is a pointer with one narrow door

`HL` is privileged. It has `M`, which lets any `MOV` read or write the byte it
points at: `MOV B, M`, `MOV M, C`, and so on.

`BC` and `DE` have no such thing. They can hold an address, but the only way
through is the accumulator:

- `LDAX D` — load `A` from the byte `DE` points at
- `STAX D` — store `A` into the byte `DE` points at

That single narrow door is what shapes the program. `A` is permanently busy
ferrying bytes to and from `DE`, so the byte you lift out of `HL`'s location
has to wait in some other register while `A` does its work.
