import { describe, expect, test } from "vitest";
import { runAndGetState } from "./test-utils.js";

describe("Subtraction Auxiliary Carry Regressions", () => {
    test.each([
        ["SUB B", "sub b\nhlt", { registers: { bc: { high: 0x10, low: 0x00 } } }],
        ["CMP B", "cmp b\nhlt", { registers: { bc: { high: 0x10, low: 0x00 } } }],
        ["SUI", "sui 10H\nhlt", {}],
        ["CPI", "cpi 10H\nhlt", {}],
    ])("%s keeps the +1 in A + ~operand + 1 when the operand low nibble is zero", async (_name, code, state) => {
        const result = await runAndGetState(code, { accumulator: 0x42, ...state });

        expect(result.flags.ac).toBe(true);
    });

    test.each([
        ["SBB B", "sbb b\nhlt", { registers: { bc: { high: 0x0f, low: 0x00 } } }],
        ["SBI", "sbi 0FH\nhlt", {}],
    ])("%s uses A + ~operand + (1 - borrow) for AC", async (_name, code, state) => {
        const result = await runAndGetState(code, {
            accumulator: 0x42,
            flags: { c: true },
            ...state,
        });

        // 42H - 0FH - 1 = 32H. The low-nibble carry chain is
        // 2 + ~FH + 0 = 2, so no carry leaves bit 3.
        expect(result.accumulator).toBe(0x32);
        expect(result.flags.ac).toBe(false);
    });

    test.each([
        ["SBB B", "sbb b\nhlt", { registers: { bc: { high: 0xff, low: 0x00 } } }],
        ["SBI", "sbi 0FFH\nhlt", {}],
    ])("%s handles operand FFH plus borrow without wrapping the borrow decision", async (_name, code, state) => {
        const result = await runAndGetState(code, {
            accumulator: 0x00,
            flags: { c: true },
            ...state,
        });

        expect(result.accumulator).toBe(0x00);
        expect(result.flags.c).toBe(true);
        expect(result.flags.ac).toBe(false);
    });
});
