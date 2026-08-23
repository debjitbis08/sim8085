---
title: MACRO and ENDM
description: MACRO and ENDM Directives
---

A macro gives a name to a block of source lines. Wherever the name is used, the
block is assembled in its place with its parameters substituted.

Format:

| Label  | Opcode  | Operand              |
|--------|---------|----------------------|
| Name:  | `MACRO` | parameter list       |
|        | `ENDM`  |                      |

* The definition itself produces no object code. Only the places the macro is
  used do.
* Parameters are substituted by whole name, so a parameter called `X` does not
  rewrite a symbol called `XY`.
* A label on the line that uses a macro is placed on the first line of the
  expansion.
* A macro may use another macro. A macro that uses itself is an error rather
  than a program that never finishes assembling.

```asm
TRUE    MACRO   WHERE           ; branch if the last test succeeded
        JC      WHERE
        ENDM

        CALL    SEARCH
        TRUE    FOUND           ; assembles as JC FOUND
```

`LOCAL`, `REPT`, `IRP`, `IRPC` and `EXITM` are not supported.
