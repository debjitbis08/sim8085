---
title:  END
description: END Directive
---

The END directive marks the conclusion of the source program and signals the assembler to terminate each pass.

Format:

| Label     | Opcode | Operand (Optional) |
|-----------|--------|--------------------|
| Optional: | `END`  | `expression`       |

* Only one END statement is allowed in a source program, and it must be the final statement.
* If an optional expression is provided, its value determines the starting address for program execution.
* If no expression is specified, the assembler defaults the starting address to zero.
