---
title: SET
description: SET Directive
---

The SET directive gives a name to a value, and unlike `EQU` allows that name to
be given a new value later.

Format:

| Label | Opcode | Operand      |
|-------|--------|--------------|
| Name  | `SET`  | `expression` |

* Each use of the name takes whichever value was most recently assigned above it.
* This is what makes a name usable as a switch for conditional assembly.

```asm
WAITS   SET     0
        IF      1-WAITS
TIMER   EQU     197
        ENDIF
```
