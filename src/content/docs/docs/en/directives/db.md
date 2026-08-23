---
title: DB
description: DB Directive
---

The DB directive stores one or more 8-bit values in memory.

Format:

| Label     | Opcode | Operand                        |
|-----------|--------|--------------------------------|
| Optional: | `DB`   | `expression` or a list of them |

* Each item occupies one byte, in the order written.
* A character string stores one byte per character.
* A label on a DB line names the first byte stored.

```asm
        DB      1, 2, 3
MSG:    DB      'READY'
MASK:   DB      0F0H
```
