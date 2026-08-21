import { describe, expect, test } from "vitest";
import * as fc from "fast-check";
import { runAndGetState, setupSimulator } from "./test-utils.js";
import { expectedSubtraction } from "./arithmetic-reference.js";

const registerState = (operand, value) => {
    const registers = {
        bc: { high: 0x12, low: 0x34 },
        de: { high: 0x56, low: 0x78 },
        hl: { high: 0x9a, low: 0xbc },
    };

    const locations = {
        b: ["bc", "high"],
        c: ["bc", "low"],
        d: ["de", "high"],
        e: ["de", "low"],
        h: ["hl", "high"],
        l: ["hl", "low"],
    };
    const location = locations[operand];
    if (location) registers[location[0]][location[1]] = value;

    return registers;
};

const forms = [
    ["b", 0xb8],
    ["c", 0xb9],
    ["d", 0xba],
    ["e", 0xbb],
    ["h", 0xbc],
    ["l", 0xbd],
    ["m", 0xbe],
    ["a", 0xbf],
];

describe("CMP Instruction Forms", () => {
    test.each(forms)("CMP %s sets flags without changing either operand", async (operand) => {
        const accumulator = 0x42;
        const source = operand === "a" ? accumulator : 0x51;
        const registers = operand === "m" ? registerState() : registerState(operand, source);
        const memory = operand === "m" ? { 0x2000: source } : undefined;
        if (operand === "m") registers.hl = { high: 0x20, low: 0x00 };

        const result = await runAndGetState(`cmp ${operand}\nhlt`, {
            accumulator,
            registers,
            memory,
            flags: { z: true, s: false, p: true, c: false, ac: true, v: true, k: false },
        });

        expect(result.accumulator).toBe(accumulator);
        expect(result.flags).toEqual(expectedSubtraction(accumulator, source).flags);
        expect(result.registers).toEqual(registers);
        if (operand === "m") expect(result.memory[0x2000]).toBe(source);
        expect(result.programCounter).toBe(0x0002);
    });

    test("assembles register and memory forms to opcodes B8H through BFH", async () => {
        const source = `${forms.map(([operand]) => `cmp ${operand}`).join("\n")}\nhlt`;
        const { assembled } = await setupSimulator(source);
        const bytes = assembled.filter((item) => item.kind !== "label").map((item) => item.data);

        expect(bytes).toEqual([...forms.map(([, opcode]) => opcode), 0x76]);
    });
});

describe("CMP Arithmetic and Flags", () => {
    test.each([
        ["43", "43", 0x43, 0x43],
        ["10", "01", 0x10, 0x01],
        ["00", "01", 0x00, 0x01],
        ["7F", "FF", 0x7f, 0xff],
        ["80", "01", 0x80, 0x01],
        ["FF", "0F", 0xff, 0x0f],
        ["3A", "2B", 0x3a, 0x2b],
        ["42", "10", 0x42, 0x10],
        ["00", "00", 0x00, 0x00],
        ["10", "20", 0x10, 0x20],
    ])("CMP B handles edge case %sH against %sH", async (_aHex, _operandHex, accumulator, operand) => {
        const result = await runAndGetState("cmp b\nhlt", {
            accumulator,
            registers: { bc: { high: operand, low: 0x5a } },
            flags: { z: true, s: true, p: true, c: true, ac: true, v: true, k: true },
        });

        expect(result.accumulator).toBe(accumulator);
        expect(result.flags).toEqual(expectedSubtraction(accumulator, operand).flags);
        expect(result.registers.bc).toEqual({ high: operand, low: 0x5a });
    });

    test("matches the 8085 comparison model for randomized byte pairs", async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 0, max: 0xff }),
                fc.integer({ min: 0, max: 0xff }),
                fc.record({
                    z: fc.boolean(),
                    s: fc.boolean(),
                    p: fc.boolean(),
                    c: fc.boolean(),
                    ac: fc.boolean(),
                    v: fc.boolean(),
                    k: fc.boolean(),
                }),
                async (accumulator, operand, initialFlags) => {
                    const result = await runAndGetState("cmp b\nhlt", {
                        accumulator,
                        registers: { bc: { high: operand, low: 0x00 } },
                        flags: initialFlags,
                    });

                    expect(result.accumulator).toBe(accumulator);
                    expect(result.flags).toEqual(expectedSubtraction(accumulator, operand).flags);
                },
            ),
            { numRuns: 100 },
        );
    });
});
