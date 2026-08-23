---
title: DS
description: DS Directive
---

The DS directive reserves a block of memory without storing anything in it.

Format:

| Label     | Opcode | Operand      |
|-----------|--------|--------------|
| Optional: | `DS`   | `expression` |

* The location counter advances by the number of bytes requested, so whatever
  follows is assembled after the reserved block.
* No object code is produced for the block itself; the bytes hold whatever the
  memory already contained.
* A label on a DS line names the first reserved byte, which is the usual way to
  name a buffer.

```asm
BUFFER: DS      16              ; sixteen bytes, named BUFFER
COUNT:  DS      1
```
