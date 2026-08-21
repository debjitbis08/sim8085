import { describe, expect, test } from "vitest";
import * as fc from "fast-check";
import { runAndGetState, setupSimulator } from "./test-utils.js";
import { evenParity } from "./arithmetic-reference.js";

const expectedAdd = (left, right) => {
    const wideResult = left + right;
    const result = wideResult & 0xff;
    const carryIntoSign = ((left & 0x7f) + (right & 0x7f)) > 0x7f;
    const carryOut = wideResult > 0xff;
    const overflow = carryIntoSign !== carryOut;

    return {
        result,
        flags: {
            z: result === 0,
            s: (result & 0x80) !== 0,
            p: evenParity(result),
            c: carryOut,
            ac: (left & 0x0f) + (right & 0x0f) > 0x0f,
            v: overflow,
            k: overflow !== ((result & 0x80) !== 0),
        },
    };
};

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
    ["b", 0x80],
    ["c", 0x81],
    ["d", 0x82],
    ["e", 0x83],
    ["h", 0x84],
    ["l", 0x85],
    ["m", 0x86],
    ["a", 0x87],
];

describe("ADD Instruction Forms", () => {
    test.each(forms)("ADD %s adds the selected operand and preserves its source", async (operand) => {
        const accumulator = 0x22;
        const source = operand === "a" ? accumulator : 0x11;
        const registers = operand === "m" ? registerState() : registerState(operand, source);
        const memory = operand === "m" ? { 0x2000: source } : undefined;
        if (operand === "m") registers.hl = { high: 0x20, low: 0x00 };

        const result = await runAndGetState(`add ${operand}\nhlt`, {
            accumulator,
            registers,
            memory,
            // ADD must use only its explicit operand, not the incoming carry.
            flags: { z: true, s: true, p: false, c: true, ac: true, v: true, k: true },
        });
        const expected = expectedAdd(accumulator, source);

        expect(result.accumulator).toBe(expected.result);
        expect(result.flags).toEqual(expected.flags);
        expect(result.registers).toEqual(registers);
        if (operand === "m") expect(result.memory[0x2000]).toBe(source);
        expect(result.programCounter).toBe(0x0002);
    });

    test("assembles register and memory forms to opcodes 80H through 87H", async () => {
        const source = `${forms.map(([operand]) => `add ${operand}`).join("\n")}\nhlt`;
        const { assembled } = await setupSimulator(source);
        const bytes = assembled.filter((item) => item.kind !== "label").map((item) => item.data);

        expect(bytes).toEqual([...forms.map(([, opcode]) => opcode), 0x76]);
    });
});

describe("ADD Arithmetic and Flags", () => {
    test.each([
        ["00", "00", 0x00, 0x00],
        ["0F", "01", 0x0f, 0x01],
        ["FF", "01", 0xff, 0x01],
        ["7F", "01", 0x7f, 0x01],
        ["80", "80", 0x80, 0x80],
        ["80", "00", 0x80, 0x00],
        ["55", "AA", 0x55, 0xaa],
    ])("ADD B handles edge case %sH + %sH", async (_leftHex, _rightHex, left, right) => {
        const result = await runAndGetState("add b\nhlt", {
            accumulator: left,
            registers: { bc: { high: right, low: 0x5a } },
            flags: { z: true, s: true, p: true, c: true, ac: true, v: true, k: true },
        });
        const expected = expectedAdd(left, right);

        expect(result.accumulator).toBe(expected.result);
        expect(result.flags).toEqual(expected.flags);
        expect(result.registers.bc).toEqual({ high: right, low: 0x5a });
    });

    test("matches the 8085 addition model for randomized byte pairs", async () => {
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
                async (left, right, initialFlags) => {
                    const result = await runAndGetState("add b\nhlt", {
                        accumulator: left,
                        registers: { bc: { high: right, low: 0x00 } },
                        flags: initialFlags,
                    });
                    const expected = expectedAdd(left, right);

                    expect(result.accumulator).toBe(expected.result);
                    expect(result.flags).toEqual(expected.flags);
                },
            ),
            { numRuns: 100 },
        );
    });
});
