---
title: DW
description: DW Directive
---

The DW directive stores one or more 16-bit values in memory, low-order byte first.

Format:

| Label     | Opcode | Operand                         |
|-----------|--------|---------------------------------|
| Optional: | `DW`   | `expression` or a list of them  |

* Each value occupies two bytes, so the location counter advances by two for every
  item in the list.
* The low-order byte is stored first, which is the order the 8085 expects when the
  pair is later loaded with `LHLD` or used as an address.
* An operand may be a label defined later in the program, which is what makes DW
  useful for tables of routine addresses.

```asm
        DW      2050H           ; stores 50H then 20H
        DW      1, 2            ; four bytes in all
TABLE:  DW      HANDLER         ; the address of a label defined further down
```
