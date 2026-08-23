---
title: IF, ELSE and ENDIF
description: Conditional assembly directives
---

IF, ELSE and ENDIF assemble one part of a program and skip another, depending on
the value of an expression.

Format:

| Label | Opcode  | Operand      |
|-------|---------|--------------|
|       | `IF`    | `expression` |
|       | `ELSE`  |              |
|       | `ENDIF` |              |

* If the expression is non-zero the block up to `ELSE` or `ENDIF` is assembled;
  otherwise it is skipped.
* A skipped block produces no object code, defines no labels, and does not move
  the location counter, so the code after `ENDIF` is assembled exactly as though
  the block were not there.
* Blocks may be nested. A block inside one that is being skipped is skipped too,
  and its condition is never evaluated.
* The condition is decided while addresses are still being assigned, so it may
  only use symbols that are already defined above it.

```asm
WAITS   SET     0

        IF      1-WAITS
TIMER   EQU     197             ; assembled
        ENDIF

        IF      WAITS
TIMER   EQU     237             ; skipped
        ENDIF
```
