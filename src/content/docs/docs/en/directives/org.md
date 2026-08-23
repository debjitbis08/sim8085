---
title: ORG
description: ORG Directive
---

The ORG directive sets the address at which the following code or data is
assembled.

Format:

| Label     | Opcode | Operand      |
|-----------|--------|--------------|
| Optional: | `ORG`  | `expression` |

* Everything after it is placed from that address onwards, until the next ORG.
* A label on an ORG line names the address as it stood *before* the directive.
* The address is worked out where the directive appears, so the expression may
  only use names already defined above it.

```asm
        ORG     2000H
START:  MVI     A, 0
```
