import { describe, test, expect } from "vitest";
import { compareState, hex8, hex16 } from "../../lib/practice/assert.js";
import { normalizeExpect } from "../../lib/practice/spec.js";

function stateWith(overrides = {}) {
    return {
        registers: { a: 0, b: 0, c: 0, d: 0, e: 0, h: 0, l: 0, ...(overrides.registers ?? {}) },
        flags: { z: false, s: false, p: false, cy: false, ac: false, ...(overrides.flags ?? {}) },
        sp: overrides.sp ?? 0xffff,
        pc: overrides.pc ?? 0,
        memory: overrides.memory ?? new Array(65536).fill(0),
        io: overrides.io ?? new Array(256).fill(0),
        halted: overrides.halted ?? true,
        totalTstates: overrides.totalTstates ?? 0,
    };
}

describe("hex formatting", () => {
    test("pads to the width of the thing being shown", () => {
        expect(hex8(0x0a)).toBe("0AH");
        expect(hex16(0x2000)).toBe("2000H");
    });
});

describe("compareState", () => {
    test("reports nothing when everything matches", () => {
        const expected = normalizeExpect({ registers: { a: 0x3a }, flags: { z: false } });
        expect(compareState(expected, stateWith({ registers: { a: 0x3a } }))).toEqual([]);
    });

    test("only checks what the spec mentions", () => {
        const expected = normalizeExpect({ registers: { a: 0x3a } });
        const state = stateWith({ registers: { a: 0x3a, b: 0x99 }, flags: { cy: true }, pc: 0x1234 });
        expect(compareState(expected, state)).toEqual([]);
    });

    test("describes a register mismatch in hex", () => {
        const expected = normalizeExpect({ registers: { b: 0x27 } });
        const [diff] = compareState(expected, stateWith({ registers: { b: 0 } }));
        expect(diff.path).toBe("registers.b");
        expect(diff.message).toBe("Register B should be 27H, but it is 00H");
    });

    test("describes a flag mismatch by name", () => {
        const expected = normalizeExpect({ flags: { cy: true } });
        const [diff] = compareState(expected, stateWith());
        expect(diff.path).toBe("flags.cy");
        expect(diff.message).toBe("The Carry flag should be set, but it is clear");
    });

    test("describes a memory mismatch by address", () => {
        const expected = normalizeExpect({ memory: { "0x2002": 0x61 } });
        const [diff] = compareState(expected, stateWith());
        expect(diff.path).toBe("memory.8194");
        expect(diff.message).toBe("Memory at 2002H should be 61H, but it is 00H");
    });

    test("checks IO ports", () => {
        const expected = normalizeExpect({ io: { 1: 0xff } });
        const [diff] = compareState(expected, stateWith());
        expect(diff.message).toBe("IO port 01H should be FFH, but it is 00H");
    });

    test("checks the stack pointer and program counter", () => {
        const expected = normalizeExpect({ sp: 0xfff0, pc: 0x0009 });
        const diffs = compareState(expected, stateWith());
        expect(diffs.map((d) => d.path)).toEqual(["sp", "pc"]);
        expect(diffs[0].message).toBe("The stack pointer should be FFF0H, but it is FFFFH");
    });

    test("reports a program that never halts", () => {
        const expected = normalizeExpect({ halted: true });
        const [diff] = compareState(expected, stateWith({ halted: false }));
        expect(diff.message).toBe("The program should reach HLT, but it did not");
    });

    test("enforces a T-state ceiling only when exceeded", () => {
        const expected = normalizeExpect({ maxTstates: 100 });
        expect(compareState(expected, stateWith({ totalTstates: 100 }))).toEqual([]);
        const [diff] = compareState(expected, stateWith({ totalTstates: 101 }));
        expect(diff.message).toBe("The program should run in at most 100 T-states, but it took 101");
    });

    test("accumulates every mismatch rather than stopping at the first", () => {
        const expected = normalizeExpect({ registers: { a: 1, b: 2 }, flags: { z: true } });
        expect(compareState(expected, stateWith())).toHaveLength(3);
    });
});
