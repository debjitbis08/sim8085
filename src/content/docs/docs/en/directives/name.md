---
title: NAME
description: NAME Directive
---

The NAME directive gives a name to the object module being assembled.

Format:

| Label | Opcode | Operand |
|-------|--------|---------|
|       | `NAME` | symbol  |

* It has no effect on the object code and produces no bytes.
* It is accepted so that source written for Intel's assembler, which
  conventionally opens with it, assembles unchanged.

```asm
        NAME    SDK85
```
