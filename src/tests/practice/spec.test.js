import { describe, test, expect } from "vitest";
import { normalizeCase, normalizeCases, normalizeSetup, parseNumber, SpecError } from "../../lib/practice/spec.js";

describe("parseNumber", () => {
    test("accepts YAML integers, hex literals and 8085-style hex", () => {
        expect(parseNumber(8192, "x")).toBe(8192);
        expect(parseNumber("0x2000", "x")).toBe(8192);
        expect(parseNumber("2000H", "x")).toBe(8192);
        expect(parseNumber("2000h", "x")).toBe(8192);
        expect(parseNumber("42", "x")).toBe(42);
    });

    test("rejects values it cannot parse", () => {
        expect(() => parseNumber("banana", "x")).toThrow(SpecError);
        expect(() => parseNumber(1.5, "x")).toThrow(SpecError);
    });
});

describe("normalizeSetup", () => {
    test("normalizes registers, flags and byte maps", () => {
        const setup = normalizeSetup({
            registers: { A: 0x10, b: "0FFH" },
            flags: { c: true, z: false },
            memory: { "0x2000": 0x3a, 8193: 0x27 },
            io: { 1: 0x0f },
            sp: "0xFFF0",
        });

        expect(setup.registers).toEqual({ a: 0x10, b: 0xff });
        // "c" is accepted as an alias for the carry flag.
        expect(setup.flags).toEqual({ cy: true, z: false });
        expect(setup.memory.get(0x2000)).toBe(0x3a);
        expect(setup.memory.get(0x2001)).toBe(0x27);
        expect(setup.io.get(1)).toBe(0x0f);
        expect(setup.sp).toBe(0xfff0);
    });

    test("expands memoryRange into individual addresses", () => {
        const setup = normalizeSetup({ memoryRange: { start: "0x2050", bytes: [1, 2, 3] } });
        expect([...setup.memory.entries()]).toEqual([
            [0x2050, 1],
            [0x2051, 2],
            [0x2052, 3],
        ]);
    });

    test("memory and memoryRange merge, with memoryRange winning", () => {
        const setup = normalizeSetup({
            memory: { "0x2050": 0xff },
            memoryRange: { start: "0x2050", bytes: [1] },
        });
        expect(setup.memory.get(0x2050)).toBe(1);
    });

    test("refuses to normalize an already-normalized spec", () => {
        // Normalizing twice used to silently drop every byte of memory setup,
        // so a check would run against a blank machine and still look green.
        const once = normalizeSetup({ memory: { "0x2000": 0x3a } });
        expect(() => normalizeSetup(once)).toThrow(/already-normalized/);
    });

    test("rejects authoring mistakes loudly", () => {
        expect(() => normalizeSetup({ registeres: {} })).toThrow(/unknown key/);
        expect(() => normalizeSetup({ registers: { x: 1 } })).toThrow(/unknown register/);
        expect(() => normalizeSetup({ flags: { q: true } })).toThrow(/unknown flag/);
        expect(() => normalizeSetup({ flags: { z: 1 } })).toThrow(/expected true or false/);
        expect(() => normalizeSetup({ memory: { "0x2000": 300 } })).toThrow(/out of range/);
        expect(() => normalizeSetup({ io: { "0x200": 1 } })).toThrow(/out of range/);
    });
});

describe("normalizeCase", () => {
    test("defaults expect.halted to true", () => {
        const testCase = normalizeCase({ name: "x", expect: { registers: { a: 1 } } });
        expect(testCase.expect.halted).toBe(true);
    });

    test("keeps an explicit expect.halted of false", () => {
        const testCase = normalizeCase({ name: "x", expect: { halted: false } });
        expect(testCase.expect.halted).toBe(false);
    });

    test("requires a name", () => {
        expect(() => normalizeCase({ expect: {} })).toThrow(/name/);
        expect(() => normalizeCase({ name: "  ", expect: {} })).toThrow(/name/);
    });

    test("rejects an empty cases array", () => {
        expect(() => normalizeCases([])).toThrow(/non-empty/);
    });
});
