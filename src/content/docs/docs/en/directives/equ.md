---
title: EQU
description: EQU Directive
---

The EQU directive gives a name to a value.

Format:

| Label | Opcode | Operand      |
|-------|--------|--------------|
| Name  | `EQU`  | `expression` |

* The name may be used anywhere the value could have been written.
* A name defined with EQU cannot be redefined. Use `SET` for a name whose value
  changes as the program is assembled.
* The value is worked out where the directive appears, so the expression may
  only use names already defined above it.

```asm
COUNT   EQU     16
LAST    EQU     COUNT-1
        MVI     B, COUNT
```
