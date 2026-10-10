use std::io::{self, Error};
use substring::Substring;

pub struct InstructionInfo {
    pub label: &'static str,
    pub detail: &'static str,
    pub documentation: &'static str,
}

pub fn parse_immediate_val(literal: &String) -> io::Result<u64> {
    let lit_len = literal.len();
    literal
        .substring(0, lit_len - 1)
        .parse::<u64>()
        .map_err(|_| Error::other("Error parsing immediate_value!"))
}

pub fn get_documentation() -> Vec<InstructionInfo> {
    vec![
        InstructionInfo {
            label: "A",
            detail: "A - Accumulator (8-bit)",
            documentation: "\
**Accumulator** — 8-bit special-purpose register.\n\n\
All **arithmetic** (`ADD`, `ADC`, `SUB`, `SBB`, `ADI`, `ACI`, `SUI`, `SBI`, `DAA`) \
and **logical** (`ANA`, `ORA`, `XRA`, `CMP`, `ANI`, `ORI`, `XRI`, `CPI`, `CMA`) \
operations use A as the **implicit destination**.\n\n\
Also used by `IN`, `OUT`, `RIM`, `SIM`, `LDAX`, `LDA`, `STA`, `STAX`.\n\n\
**See also:** `PSW`, `B`, `H`",
        },
        InstructionInfo {
            label: "B",
            detail: "B - General purpose register (8-bit)",
            documentation: "\
**Register B** — 8-bit general-purpose register.\n\n\
Paired with **C** to form the **BC register pair**, used by `LDAX B`, `STAX B`, `LXI B`, `DAD B`, `INX B`, `DCX B`, `PUSH B`, `POP B`.\n\n\
Can be used as a source or destination in `MOV` and `MVI`.\n\n\
**See also:** `C`, `LXI`, `DAD`, `PUSH`, `POP`",
        },
        InstructionInfo {
            label: "C",
            detail: "C - General purpose register (8-bit)",
            documentation: "\
**Register C** — 8-bit general-purpose register.\n\n\
Paired with **B** to form the **BC register pair**.\n\n\
Can be used as a source or destination in `MOV` and `MVI`.\n\n\
**See also:** `B`, `LXI`, `DAD`, `PUSH`, `POP`",
        },
        InstructionInfo {
            label: "D",
            detail: "D - General purpose register (8-bit)",
            documentation: "\
**Register D** — 8-bit general-purpose register.\n\n\
Paired with **E** to form the **DE register pair**, used by `LDAX D`, `STAX D`, `LXI D`, `DAD D`, `INX D`, `DCX D`, `PUSH D`, `POP D`, `XCHG`.\n\n\
**See also:** `E`, `XCHG`, `LXI`, `DAD`",
        },
        InstructionInfo {
            label: "E",
            detail: "E - General purpose register (8-bit)",
            documentation: "\
**Register E** — 8-bit general-purpose register.\n\n\
Paired with **D** to form the **DE register pair**.\n\n\
**See also:** `D`, `XCHG`, `LXI`, `DAD`",
        },
        InstructionInfo {
            label: "H",
            detail: "H - High register (8-bit)",
            documentation: "\
**Register H** — 8-bit general-purpose register, holds the **high byte** of the HL pair.\n\n\
The **HL pair** is the primary **memory address pointer**: used by `MOV M,r`, `MOV r,M`, `MVI M`, `INR M`, `DCR M`, `ADD M`, `SUB M`, etc.\n\n\
Also used by `LHLD`, `SHLD`, `SPHL`, `PCHL`, `XTHL`, `DAD H`, `INX H`, `DCX H`, `PUSH H`, `POP H`.\n\n\
**See also:** `L`, `M`, `LHLD`, `SHLD`, `SPHL`, `PCHL`",
        },
        InstructionInfo {
            label: "L",
            detail: "L - Low register (8-bit)",
            documentation: "\
**Register L** — 8-bit general-purpose register, holds the **low byte** of the HL pair.\n\n\
Paired with **H** to form the **HL register pair**, the primary memory pointer.\n\n\
**See also:** `H`, `M`, `LHLD`, `SHLD`",
        },
        InstructionInfo {
            label: "M",
            detail: "M - Memory reference via HL pair",
            documentation: "\
**M (Memory)** — not a physical register; refers to the **memory byte** at the address held in the **HL register pair**.\n\n\
Valid as an operand wherever a register is accepted in: `MOV`, `MVI`, `ADD`, `ADC`, `SUB`, `SBB`, `ANA`, `ORA`, `XRA`, `CMP`, `INR`, `DCR`.\n\n\
The HL pair must be loaded with a valid address before using M.\n\n\
**See also:** `H`, `L`, `LXI H`, `MVI M`",
        },
        InstructionInfo {
            label: "SP",
            detail: "SP - Stack Pointer (16-bit)",
            documentation: "\
**Stack Pointer** — 16-bit register pointing to the **top of the stack** in RAM.\n\n\
- Decremented by **2** on `PUSH` or `CALL`.\n\
- Incremented by **2** on `POP` or `RET`.\n\
- Loaded directly by `LXI SP` or `SPHL`.\n\
- Used by `INX SP`, `DCX SP`, `DAD SP`, `XTHL`.\n\n\
**See also:** `PUSH`, `POP`, `LXI`, `SPHL`, `XTHL`",
        },
        InstructionInfo {
            label: "PSW",
            detail: "PSW - Program Status Word (A + Flags)",
            documentation: "\
**Program Status Word** — 16-bit virtual register: high byte = **Accumulator**, low byte = **Flag register**.\n\n\
Flag register bits: `S` (Sign) · `Z` (Zero) · `AC` (Auxiliary Carry) · `P` (Parity) · `CY` (Carry).\n\n\
Used exclusively with `PUSH PSW` (save state) and `POP PSW` (restore state).\n\n\
**See also:** `PUSH`, `POP`, `A`",
        },

        InstructionInfo {
            label: "MOV",
            detail: "MOV r1, r2 — Move register to register",
            documentation: "\
**Format:** `MOV dst, src`\n\n\
Copies the contents of **src** into **dst**. Neither operand is altered beyond the destination.\n\n\
`M` may be used as either src or dst, referencing the memory byte at **HL**.\n\
`MOV M, M` is **not valid**.\n\n\
**Flags affected:** None\n\n\
**See also:** `MVI`, `LDA`, `LDAX`, `LHLD`",
        },
        InstructionInfo {
            label: "MVI",
            detail: "MVI r, data8 — Move immediate",
            documentation: "\
**Format:** `MVI dst, imm8`\n\n\
Loads the **8-bit immediate** value directly into **dst** (register or `M`).\n\n\
When dst = `M`, the byte is written to memory at **HL**.\n\n\
**Flags affected:** None\n\n\
**See also:** `MOV`, `LXI`",
        },
        InstructionInfo {
            label: "LDA",
            detail: "LDA addr — Load accumulator direct",
            documentation: "\
**Format:** `LDA addr16`\n\n\
Copies the byte at the **16-bit memory address** into the **accumulator**.\n\n\
**Flags affected:** None\n\n\
**See also:** `STA`, `LDAX`, `LHLD`",
        },
        InstructionInfo {
            label: "STA",
            detail: "STA addr — Store accumulator direct",
            documentation: "\
**Format:** `STA addr16`\n\n\
Stores the contents of the **accumulator** into the **16-bit memory address**.\n\n\
**Flags affected:** None\n\n\
**See also:** `LDA`, `STAX`, `SHLD`",
        },
        InstructionInfo {
            label: "LDAX",
            detail: "LDAX rp — Load accumulator indirect",
            documentation: "\
**Format:** `LDAX B` or `LDAX D`\n\n\
Loads the **accumulator** with the byte at the memory address held in the specified **register pair** (BC or DE only; HL uses `MOV A, M`).\n\n\
**Flags affected:** None\n\n\
**See also:** `STAX`, `LDA`, `MOV`",
        },
        InstructionInfo {
            label: "STAX",
            detail: "STAX rp — Store accumulator indirect",
            documentation: "\
**Format:** `STAX B` or `STAX D`\n\n\
Stores the **accumulator** into the memory address held in the specified **register pair** (BC or DE only).\n\n\
**Flags affected:** None\n\n\
**See also:** `LDAX`, `STA`, `MOV`",
        },
        InstructionInfo {
            label: "LXI",
            detail: "LXI rp, data16 — Load register pair immediate",
            documentation: "\
**Format:** `LXI rp, imm16`\n\n\
Loads the **16-bit immediate** value into the specified register pair: `B` (BC), `D` (DE), `H` (HL), or `SP`.\n\n\
The low byte goes to the low register (C / E / L), the high byte to the high register (B / D / H).\n\n\
**Flags affected:** None\n\n\
**See also:** `MVI`, `DAD`, `INX`, `DCX`",
        },
        InstructionInfo {
            label: "LHLD",
            detail: "LHLD addr — Load H and L direct",
            documentation: "\
**Format:** `LHLD addr16`\n\n\
Loads **L** from `addr16` and **H** from `addr16 + 1`.\n\n\
**Flags affected:** None\n\n\
**See also:** `SHLD`, `LDA`, `LXI H`",
        },
        InstructionInfo {
            label: "SHLD",
            detail: "SHLD addr — Store H and L direct",
            documentation: "\
**Format:** `SHLD addr16`\n\n\
Stores **L** at `addr16` and **H** at `addr16 + 1`.\n\n\
**Flags affected:** None\n\n\
**See also:** `LHLD`, `STA`",
        },
        InstructionInfo {
            label: "XCHG",
            detail: "XCHG — Exchange DE and HL",
            documentation: "\
**Format:** `XCHG`\n\n\
Swaps the contents of **HL** and **DE** register pairs atomically.\n\n\
Commonly used to pass a computed HL address into DE, or vice versa.\n\n\
**Flags affected:** None\n\n\
**See also:** `XTHL`, `MOV`",
        },
        InstructionInfo {
            label: "XTHL",
            detail: "XTHL — Exchange HL with top of stack",
            documentation: "\
**Format:** `XTHL`\n\n\
Exchanges **L** ↔ `(SP)` and **H** ↔ `(SP+1)`.\n\n\
The SP is not altered. Used to access and modify the saved return address.\n\n\
**Flags affected:** None\n\n\
**See also:** `XCHG`, `PUSH`, `POP`, `SPHL`",
        },
        InstructionInfo {
            label: "SPHL",
            detail: "SPHL — Move HL to Stack Pointer",
            documentation: "\
**Format:** `SPHL`\n\n\
Copies the **HL** pair into the **Stack Pointer**. Used to relocate the stack.\n\n\
**Flags affected:** None\n\n\
**See also:** `PCHL`, `LXI SP`, `XTHL`",
        },
        InstructionInfo {
            label: "PCHL",
            detail: "PCHL — Jump indirect through HL",
            documentation: "\
**Format:** `PCHL`\n\n\
Loads the **Program Counter** with the contents of **HL**. Execution continues from that address. Equivalent to an indirect unconditional jump.\n\n\
**Flags affected:** None\n\n\
**See also:** `SPHL`, `JMP`",
        },

        InstructionInfo {
            label: "IN",
            detail: "IN port — Input from port to accumulator",
            documentation: "\
**Format:** `IN port8`\n\n\
Reads the byte from the **8-bit I/O port** address into the **accumulator**.\n\n\
**Flags affected:** None\n\n\
**See also:** `OUT`, `RIM`",
        },
        InstructionInfo {
            label: "OUT",
            detail: "OUT port — Output accumulator to port",
            documentation: "\
**Format:** `OUT port8`\n\n\
Writes the contents of the **accumulator** to the **8-bit I/O port** address.\n\n\
**Flags affected:** None\n\n\
**See also:** `IN`, `SIM`",
        },

        InstructionInfo {
            label: "PUSH",
            detail: "PUSH rp — Push register pair onto stack",
            documentation: "\
**Format:** `PUSH B` | `PUSH D` | `PUSH H` | `PUSH PSW`\n\n\
Decrements **SP** by 1, stores the **high byte**, decrements **SP** again, stores the **low byte**.\n\n\
`PUSH PSW` saves **A** and the **Flag register**.\n\n\
**Flags affected:** None\n\n\
**See also:** `POP`, `CALL`, `XTHL`",
        },
        InstructionInfo {
            label: "POP",
            detail: "POP rp — Pop register pair from stack",
            documentation: "\
**Format:** `POP B` | `POP D` | `POP H` | `POP PSW`\n\n\
Pops the **low byte** into the low register and increments **SP**, then pops the **high byte** into the high register and increments **SP** again.\n\n\
`POP PSW` restores **A** and all **flags**.\n\n\
**Flags affected:** None (all flags restored if `POP PSW`)\n\n\
**See also:** `PUSH`, `RET`, `XTHL`",
        },

        InstructionInfo {
            label: "ADD",
            detail: "ADD r — Add register to accumulator",
            documentation: "\
**Format:** `ADD r` (r = A B C D E H L M)\n\n\
`A ← A + r`\n\n\
**Flags affected:** S Z AC P CY\n\n\
**See also:** `ADC`, `ADI`, `ACI`, `SUB`",
        },
        InstructionInfo {
            label: "ADI",
            detail: "ADI data8 — Add immediate to accumulator",
            documentation: "\
**Format:** `ADI imm8`\n\n\
`A ← A + imm8`\n\n\
**Flags affected:** S Z AC P CY\n\n\
**See also:** `ADD`, `ACI`, `SUI`",
        },
        InstructionInfo {
            label: "ADC",
            detail: "ADC r — Add register with carry",
            documentation: "\
**Format:** `ADC r` (r = A B C D E H L M)\n\n\
`A ← A + r + CY`\n\n\
Used for **multi-byte addition** (add the carry from a lower byte into the next byte).\n\n\
**Flags affected:** S Z AC P CY\n\n\
**See also:** `ADD`, `ACI`, `SBB`",
        },
        InstructionInfo {
            label: "ACI",
            detail: "ACI data8 — Add immediate with carry",
            documentation: "\
**Format:** `ACI imm8`\n\n\
`A ← A + imm8 + CY`\n\n\
**Flags affected:** S Z AC P CY\n\n\
**See also:** `ADC`, `ADI`, `SBI`",
        },
        InstructionInfo {
            label: "SUB",
            detail: "SUB r — Subtract register from accumulator",
            documentation: "\
**Format:** `SUB r` (r = A B C D E H L M)\n\n\
`A ← A - r`\n\n\
**Flags affected:** S Z AC P CY\n\n\
**See also:** `SBB`, `SUI`, `ADD`",
        },
        InstructionInfo {
            label: "SUI",
            detail: "SUI data8 — Subtract immediate",
            documentation: "\
**Format:** `SUI imm8`\n\n\
`A ← A - imm8`\n\n\
**Flags affected:** S Z AC P CY\n\n\
**See also:** `SUB`, `SBI`, `ADI`",
        },
        InstructionInfo {
            label: "SBB",
            detail: "SBB r — Subtract register with borrow",
            documentation: "\
**Format:** `SBB r` (r = A B C D E H L M)\n\n\
`A ← A - r - CY`\n\n\
Used for **multi-byte subtraction** (propagate borrow from a lower byte).\n\n\
**Flags affected:** S Z AC P CY\n\n\
**See also:** `SUB`, `SBI`, `ADC`",
        },
        InstructionInfo {
            label: "SBI",
            detail: "SBI data8 — Subtract immediate with borrow",
            documentation: "\
**Format:** `SBI imm8`\n\n\
`A ← A - imm8 - CY`\n\n\
**Flags affected:** S Z AC P CY\n\n\
**See also:** `SBB`, `SUI`, `ACI`",
        },
        InstructionInfo {
            label: "INR",
            detail: "INR r — Increment register",
            documentation: "\
**Format:** `INR r` (r = A B C D E H L M)\n\n\
`r ← r + 1`\n\n\
**Note:** CY is **not** affected. Use `INX` to increment a 16-bit pair.\n\n\
**Flags affected:** S Z AC P (CY **not** affected)\n\n\
**See also:** `DCR`, `INX`, `ADI`",
        },
        InstructionInfo {
            label: "INX",
            detail: "INX rp — Increment register pair",
            documentation: "\
**Format:** `INX B` | `INX D` | `INX H` | `INX SP`\n\n\
`rp ← rp + 1` (16-bit increment, no carry out)\n\n\
**Flags affected:** None\n\n\
**See also:** `DCX`, `INR`, `DAD`",
        },
        InstructionInfo {
            label: "DCR",
            detail: "DCR r — Decrement register",
            documentation: "\
**Format:** `DCR r` (r = A B C D E H L M)\n\n\
`r ← r - 1`\n\n\
**Note:** CY is **not** affected.\n\n\
**Flags affected:** S Z AC P (CY **not** affected)\n\n\
**See also:** `INR`, `DCX`, `SUI`",
        },
        InstructionInfo {
            label: "DCX",
            detail: "DCX rp — Decrement register pair",
            documentation: "\
**Format:** `DCX B` | `DCX D` | `DCX H` | `DCX SP`\n\n\
`rp ← rp - 1` (16-bit decrement, no borrow)\n\n\
**Flags affected:** None\n\n\
**See also:** `INX`, `DCR`",
        },
        InstructionInfo {
            label: "DAD",
            detail: "DAD rp — Double add (16-bit addition into HL)",
            documentation: "\
**Format:** `DAD B` | `DAD D` | `DAD H` | `DAD SP`\n\n\
`HL ← HL + rp`\n\n\
Only the **CY** flag is affected; all others are unchanged. Useful for 16-bit address arithmetic.\n\n\
**Flags affected:** CY only\n\n\
**See also:** `INX`, `LXI`",
        },
        InstructionInfo {
            label: "DAA",
            detail: "DAA — Decimal adjust accumulator",
            documentation: "\
**Format:** `DAA`\n\n\
Adjusts **A** after a BCD addition (`ADD`/`ADI`/`ADC`/`ACI`) so both nibbles represent valid BCD digits (0–9).\n\n\
- If the lower nibble > 9 or **AC** = 1, adds 06H.\n\
- If the upper nibble > 9 or **CY** = 1, adds 60H.\n\n\
**Flags affected:** S Z AC P CY\n\n\
**See also:** `ADD`, `ADC`, `ADI`",
        },

        InstructionInfo {
            label: "ANA",
            detail: "ANA r — AND register with accumulator",
            documentation: "\
**Format:** `ANA r` (r = A B C D E H L M)\n\n\
`A ← A AND r`\n\n\
CY is **reset**. AC is **set**.\n\n\
**Flags affected:** S Z AC P CY\n\n\
**See also:** `ANI`, `ORA`, `XRA`",
        },
        InstructionInfo {
            label: "ANI",
            detail: "ANI data8 — AND immediate with accumulator",
            documentation: "\
**Format:** `ANI imm8`\n\n\
`A ← A AND imm8`\n\n\
Commonly used to **mask bits** (clear specific bits while leaving others).\n\n\
CY is **reset**. AC is **set**.\n\n\
**Flags affected:** S Z AC P CY\n\n\
**See also:** `ANA`, `ORI`, `XRI`",
        },
        InstructionInfo {
            label: "ORA",
            detail: "ORA r — OR register with accumulator",
            documentation: "\
**Format:** `ORA r` (r = A B C D E H L M)\n\n\
`A ← A OR r`\n\n\
CY and AC are **reset**.\n\n\
**Flags affected:** S Z AC P CY\n\n\
**See also:** `ORI`, `ANA`, `XRA`",
        },
        InstructionInfo {
            label: "ORI",
            detail: "ORI data8 — OR immediate with accumulator",
            documentation: "\
**Format:** `ORI imm8`\n\n\
`A ← A OR imm8`\n\n\
Used to **set specific bits** in A.\n\n\
CY and AC are **reset**.\n\n\
**Flags affected:** S Z AC P CY\n\n\
**See also:** `ORA`, `ANI`, `XRI`",
        },
        InstructionInfo {
            label: "XRA",
            detail: "XRA r — XOR register with accumulator",
            documentation: "\
**Format:** `XRA r` (r = A B C D E H L M)\n\n\
`A ← A XOR r`\n\n\
`XRA A` is the standard idiom to **clear A and all flags** (except CY and AC which are reset).\n\n\
CY and AC are **reset**.\n\n\
**Flags affected:** S Z AC P CY\n\n\
**See also:** `XRI`, `ANA`, `ORA`",
        },
        InstructionInfo {
            label: "XRI",
            detail: "XRI data8 — XOR immediate with accumulator",
            documentation: "\
**Format:** `XRI imm8`\n\n\
`A ← A XOR imm8`\n\n\
Used to **toggle specific bits** in A.\n\n\
CY and AC are **reset**.\n\n\
**Flags affected:** S Z AC P CY\n\n\
**See also:** `XRA`, `ANI`, `ORI`",
        },
        InstructionInfo {
            label: "CMP",
            detail: "CMP r — Compare register with accumulator",
            documentation: "\
**Format:** `CMP r` (r = A B C D E H L M)\n\n\
`A - r` (result discarded; only flags are updated)\n\n\
- **Z = 1** if A == r\n\
- **CY = 1** if A < r\n\
- **CY = 0, Z = 0** if A > r\n\n\
**Flags affected:** S Z AC P CY\n\n\
**See also:** `CPI`, `SUB`, `JZ`, `JC`",
        },
        InstructionInfo {
            label: "CPI",
            detail: "CPI data8 — Compare immediate with accumulator",
            documentation: "\
**Format:** `CPI imm8`\n\n\
`A - imm8` (result discarded)\n\n\
Same flag semantics as `CMP`. Frequently used before conditional jumps.\n\n\
**Flags affected:** S Z AC P CY\n\n\
**See also:** `CMP`, `JZ`, `JNZ`, `JC`, `JNC`",
        },
        InstructionInfo {
            label: "CMA",
            detail: "CMA — Complement accumulator",
            documentation: "\
**Format:** `CMA`\n\n\
`A ← NOT A` (bitwise complement, ones-complement)\n\n\
To get **two's complement** (negation), follow with `ADI 01H`.\n\n\
**Flags affected:** None\n\n\
**See also:** `CMC`, `XRI FFH`",
        },
        InstructionInfo {
            label: "CMC",
            detail: "CMC — Complement carry flag",
            documentation: "\
**Format:** `CMC`\n\n\
`CY ← NOT CY`\n\n\
**Flags affected:** CY only\n\n\
**See also:** `STC`, `CMA`",
        },
        InstructionInfo {
            label: "STC",
            detail: "STC — Set carry flag",
            documentation: "\
**Format:** `STC`\n\n\
`CY ← 1`\n\n\
**Flags affected:** CY only\n\n\
**See also:** `CMC`",
        },

        InstructionInfo {
            label: "RLC",
            detail: "RLC — Rotate accumulator left",
            documentation: "\
**Format:** `RLC`\n\n\
Each bit shifts left by one. **Bit 7 → CY** and **Bit 7 → Bit 0** (circular, does not go through CY).\n\n\
**Flags affected:** CY only\n\n\
**See also:** `RRC`, `RAL`, `RAR`",
        },
        InstructionInfo {
            label: "RRC",
            detail: "RRC — Rotate accumulator right",
            documentation: "\
**Format:** `RRC`\n\n\
Each bit shifts right by one. **Bit 0 → CY** and **Bit 0 → Bit 7** (circular, does not go through CY).\n\n\
**Flags affected:** CY only\n\n\
**See also:** `RLC`, `RAR`, `RAL`",
        },
        InstructionInfo {
            label: "RAL",
            detail: "RAL — Rotate accumulator left through carry",
            documentation: "\
**Format:** `RAL`\n\n\
Each bit shifts left. **Bit 7 → CY**; old **CY → Bit 0**. 9-bit rotation through carry.\n\n\
**Flags affected:** CY only\n\n\
**See also:** `RAR`, `RLC`, `RRC`",
        },
        InstructionInfo {
            label: "RAR",
            detail: "RAR — Rotate accumulator right through carry",
            documentation: "\
**Format:** `RAR`\n\n\
Each bit shifts right. **Bit 0 → CY**; old **CY → Bit 7**. 9-bit rotation through carry.\n\n\
**Flags affected:** CY only\n\n\
**See also:** `RAL`, `RRC`, `RLC`",
        },

        InstructionInfo {
            label: "JMP",
            detail: "JMP addr — Unconditional jump",
            documentation: "\
**Format:** `JMP addr16`\n\n\
Loads **PC** with `addr16`. Execution continues from there unconditionally.\n\n\
**Flags affected:** None\n\n\
**See also:** `PCHL`, `CALL`, `RET`",
        },
        InstructionInfo {
            label: "JC",
            detail: "JC addr — Jump if Carry (CY = 1)",
            documentation: "\
**Format:** `JC addr16`\n\n\
Jumps if **CY = 1**. Typically follows `CMP`, `SUB`, or `ADD` to branch on unsigned overflow or borrow.\n\n\
**Flags affected:** None\n\n\
**See also:** `JNC`, `CMP`, `SUB`",
        },
        InstructionInfo {
            label: "JNC",
            detail: "JNC addr — Jump if No Carry (CY = 0)",
            documentation: "\
**Format:** `JNC addr16`\n\n\
Jumps if **CY = 0**.\n\n\
**Flags affected:** None\n\n\
**See also:** `JC`",
        },
        InstructionInfo {
            label: "JZ",
            detail: "JZ addr — Jump if Zero (Z = 1)",
            documentation: "\
**Format:** `JZ addr16`\n\n\
Jumps if **Z = 1** (last result was zero). Commonly follows `CMP` or `DCR` for loop control.\n\n\
**Flags affected:** None\n\n\
**See also:** `JNZ`, `CMP`, `CPI`",
        },
        InstructionInfo {
            label: "JNZ",
            detail: "JNZ addr — Jump if Not Zero (Z = 0)",
            documentation: "\
**Format:** `JNZ addr16`\n\n\
Jumps if **Z = 0**. Standard loop instruction (`DCR r` then `JNZ label`).\n\n\
**Flags affected:** None\n\n\
**See also:** `JZ`, `DCR`",
        },
        InstructionInfo {
            label: "JM",
            detail: "JM addr — Jump if Minus (S = 1)",
            documentation: "\
**Format:** `JM addr16`\n\n\
Jumps if **S = 1** (result was negative, bit 7 = 1).\n\n\
**Flags affected:** None\n\n\
**See also:** `JP`",
        },
        InstructionInfo {
            label: "JP",
            detail: "JP addr — Jump if Positive (S = 0)",
            documentation: "\
**Format:** `JP addr16`\n\n\
Jumps if **S = 0** (result was positive or zero).\n\n\
**Flags affected:** None\n\n\
**See also:** `JM`",
        },
        InstructionInfo {
            label: "JPE",
            detail: "JPE addr — Jump if Parity Even (P = 1)",
            documentation: "\
**Format:** `JPE addr16`\n\n\
Jumps if **P = 1** (even number of 1-bits in the result).\n\n\
**Flags affected:** None\n\n\
**See also:** `JPO`",
        },
        InstructionInfo {
            label: "JPO",
            detail: "JPO addr — Jump if Parity Odd (P = 0)",
            documentation: "\
**Format:** `JPO addr16`\n\n\
Jumps if **P = 0** (odd number of 1-bits).\n\n\
**Flags affected:** None\n\n\
**See also:** `JPE`",
        },

        InstructionInfo {
            label: "CALL",
            detail: "CALL addr — Unconditional subroutine call",
            documentation: "\
**Format:** `CALL addr16`\n\n\
Pushes **PC** (address of the next instruction) onto the stack, then jumps to `addr16`.\n\n\
**Flags affected:** None\n\n\
**See also:** `RET`, `PUSH`, `RST`",
        },
        InstructionInfo {
            label: "CC",
            detail: "CC addr — Call if Carry (CY = 1)",
            documentation: "\
**Format:** `CC addr16`\n\n\
Calls subroutine if **CY = 1**, otherwise falls through.\n\n\
**Flags affected:** None\n\n\
**See also:** `RC`, `JC`, `CALL`",
        },
        InstructionInfo {
            label: "CNC",
            detail: "CNC addr — Call if No Carry (CY = 0)",
            documentation: "\
**Format:** `CNC addr16`\n\n\
**Flags affected:** None\n\n\
**See also:** `RNC`, `JNC`",
        },
        InstructionInfo {
            label: "CZ",
            detail: "CZ addr — Call if Zero (Z = 1)",
            documentation: "\
**Format:** `CZ addr16`\n\n\
**Flags affected:** None\n\n\
**See also:** `RZ`, `JZ`",
        },
        InstructionInfo {
            label: "CNZ",
            detail: "CNZ addr — Call if Not Zero (Z = 0)",
            documentation: "\
**Format:** `CNZ addr16`\n\n\
**Flags affected:** None\n\n\
**See also:** `RNZ`, `JNZ`",
        },
        InstructionInfo {
            label: "CM",
            detail: "CM addr — Call if Minus (S = 1)",
            documentation: "\
**Format:** `CM addr16`\n\n\
**Flags affected:** None\n\n\
**See also:** `RM`, `JM`",
        },
        InstructionInfo {
            label: "CP",
            detail: "CP addr — Call if Positive (S = 0)",
            documentation: "\
**Format:** `CP addr16`\n\n\
**Flags affected:** None\n\n\
**See also:** `RP`, `JP`",
        },
        InstructionInfo {
            label: "CPE",
            detail: "CPE addr — Call if Parity Even (P = 1)",
            documentation: "\
**Format:** `CPE addr16`\n\n\
**Flags affected:** None\n\n\
**See also:** `RPE`, `JPE`",
        },
        InstructionInfo {
            label: "CPO",
            detail: "CPO addr — Call if Parity Odd (P = 0)",
            documentation: "\
**Format:** `CPO addr16`\n\n\
**Flags affected:** None\n\n\
**See also:** `RPO`, `JPO`",
        },
        InstructionInfo {
            label: "RET",
            detail: "RET — Unconditional return from subroutine",
            documentation: "\
**Format:** `RET`\n\n\
Pops the **return address** from the stack into **PC**. SP is incremented by 2.\n\n\
**Flags affected:** None\n\n\
**See also:** `CALL`, `POP`, `RST`",
        },
        InstructionInfo {
            label: "RC",
            detail: "RC — Return if Carry (CY = 1)",
            documentation: "\
**Format:** `RC`\n\n\
Returns from subroutine if **CY = 1**, otherwise falls through.\n\n\
**Flags affected:** None\n\n\
**See also:** `CC`, `RNC`",
        },
        InstructionInfo {
            label: "RNC",
            detail: "RNC — Return if No Carry (CY = 0)",
            documentation: "\
**Format:** `RNC`\n\n\
**Flags affected:** None\n\n\
**See also:** `CNC`, `RC`",
        },
        InstructionInfo {
            label: "RZ",
            detail: "RZ — Return if Zero (Z = 1)",
            documentation: "\
**Format:** `RZ`\n\n\
**Flags affected:** None\n\n\
**See also:** `CZ`, `RNZ`",
        },
        InstructionInfo {
            label: "RNZ",
            detail: "RNZ — Return if Not Zero (Z = 0)",
            documentation: "\
**Format:** `RNZ`\n\n\
**Flags affected:** None\n\n\
**See also:** `CNZ`, `RZ`",
        },
        InstructionInfo {
            label: "RM",
            detail: "RM — Return if Minus (S = 1)",
            documentation: "\
**Format:** `RM`\n\n\
**Flags affected:** None\n\n\
**See also:** `CM`, `RP`",
        },
        InstructionInfo {
            label: "RP",
            detail: "RP — Return if Positive (S = 0)",
            documentation: "\
**Format:** `RP`\n\n\
**Flags affected:** None\n\n\
**See also:** `CP`, `RM`",
        },
        InstructionInfo {
            label: "RPE",
            detail: "RPE — Return if Parity Even (P = 1)",
            documentation: "\
**Format:** `RPE`\n\n\
**Flags affected:** None\n\n\
**See also:** `CPE`, `RPO`",
        },
        InstructionInfo {
            label: "RPO",
            detail: "RPO — Return if Parity Odd (P = 0)",
            documentation: "\
**Format:** `RPO`\n\n\
**Flags affected:** None\n\n\
**See also:** `CPO`, `RPE`",
        },
        InstructionInfo {
            label: "RST",
            detail: "RST n — Restart (software interrupt)",
            documentation: "\
**Format:** `RST 0`–`RST 7`\n\n\
Pushes **PC** onto the stack and jumps to one of 8 fixed **restart vectors**:\n\n\
| n | Address |\n\
|---|--------|\n\
| 0 | 0000H  |\n\
| 1 | 0008H  |\n\
| 2 | 0010H  |\n\
| 3 | 0018H  |\n\
| 4 | 0020H  |\n\
| 5 | 0028H  |\n\
| 6 | 0030H  |\n\
| 7 | 0038H  |\n\n\
A 1-byte `CALL` equivalent. Used for interrupt service entry points.\n\n\
**Flags affected:** None\n\n\
**See also:** `CALL`, `RET`, `EI`",
        },

        InstructionInfo {
            label: "NOP",
            detail: "NOP — No operation",
            documentation: "\
**Format:** `NOP`\n\n\
No operation is performed. PC advances by 1. Used for **timing delays** or code patching.\n\n\
**Flags affected:** None",
        },
        InstructionInfo {
            label: "HLT",
            detail: "HLT — Halt",
            documentation: "\
**Format:** `HLT`\n\n\
The processor halts and enters a **wait state**. Resumes only on an **interrupt** or **RESET**.\n\n\
**Flags affected:** None\n\n\
**See also:** `EI`, `DI`",
        },
        InstructionInfo {
            label: "EI",
            detail: "EI — Enable interrupts",
            documentation: "\
**Format:** `EI`\n\n\
Sets the **Interrupt Enable flip-flop (INTE)**. The effect takes place **after the next instruction** executes.\n\n\
Enables: **INTR**, **RST 5.5**, **RST 6.5**, **RST 7.5**. **TRAP** is always enabled.\n\n\
**Flags affected:** None\n\n\
**See also:** `DI`, `SIM`, `RIM`",
        },
        InstructionInfo {
            label: "DI",
            detail: "DI — Disable interrupts",
            documentation: "\
**Format:** `DI`\n\n\
Resets the **INTE flip-flop**, disabling all maskable interrupts immediately.\n\n\
**Flags affected:** None\n\n\
**See also:** `EI`, `SIM`",
        },
        InstructionInfo {
            label: "RIM",
            detail: "RIM — Read interrupt mask",
            documentation: "\
**Format:** `RIM`\n\n\
Loads **A** with the current interrupt mask and serial input data:\n\n\
| Bit | Meaning |\n\
|-----|---------|\n\
| 7   | Serial input data (SID) |\n\
| 6   | RST 7.5 pending |\n\
| 5   | RST 6.5 pending |\n\
| 4   | RST 5.5 pending |\n\
| 3   | INTE (interrupt enable) |\n\
| 2   | RST 7.5 mask |\n\
| 1   | RST 6.5 mask |\n\
| 0   | RST 5.5 mask |\n\n\
**Flags affected:** None\n\n\
**See also:** `SIM`, `EI`, `DI`",
        },
        InstructionInfo {
            label: "SIM",
            detail: "SIM — Set interrupt mask",
            documentation: "\
**Format:** `SIM`\n\n\
Interprets **A** as a control word to set interrupt masks and serial output:\n\n\
| Bit | Meaning |\n\
|-----|---------|\n\
| 7   | Serial output data (SOD) |\n\
| 6   | SOD enable (1 = send bit 7 to SOD pin) |\n\
| 5   | RST 7.5 reset (1 = reset pending flip-flop) |\n\
| 4   | (not used) |\n\
| 3   | Mask set enable (must be 1 to change bits 0–2) |\n\
| 2   | RST 7.5 mask |\n\
| 1   | RST 6.5 mask |\n\
| 0   | RST 5.5 mask |\n\n\
**Flags affected:** None\n\n\
**See also:** `RIM`, `EI`, `DI`",
        },
    ]
}
