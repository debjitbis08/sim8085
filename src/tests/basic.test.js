import { describe, expect, test } from "vitest";
import { runAndGetState, setupSimulator } from "./test-utils.js";

const initialFlags = {
    z: true,
    s: true,
    p: false,
    c: true,
    ac: true,
    v: true,
    k: false,
};

describe("NOP Instruction", () => {
    test("assembles to opcode 00H", async () => {
        const { assembled } = await setupSimulator("nop\nhlt");
        const bytes = assembled.filter((item) => item.kind !== "label").map((item) => item.data);

        expect(bytes).toEqual([0x00, 0x76]);
    });

    test("advances PC without changing CPU state", async () => {
        const result = await runAndGetState("lxi sp, 0FF00H\nnop\nhlt", {
            accumulator: 0xa5,
            registers: {
                bc: { high: 0x12, low: 0x34 },
                de: { high: 0x56, low: 0x78 },
                hl: { high: 0x9a, low: 0xbc },
            },
            flags: initialFlags,
        });

        expect(result.accumulator).toBe(0xa5);
        expect(result.registers).toEqual({
            bc: { high: 0x12, low: 0x34 },
            de: { high: 0x56, low: 0x78 },
            hl: { high: 0x9a, low: 0xbc },
        });
        expect(result.stackPointer).toBe(0xff00);
        expect(result.flags).toEqual(initialFlags);
        expect(result.programCounter).toBe(0x0005);
    });
});

describe("HLT Instruction", () => {
    test("assembles to opcode 76H", async () => {
        const { assembled } = await setupSimulator("hlt");
        const bytes = assembled.filter((item) => item.kind !== "label").map((item) => item.data);

        expect(bytes).toEqual([0x76]);
    });

    test("stops before the following instruction and preserves CPU state", async () => {
        const result = await runAndGetState("lxi sp, 0FF00H\nhlt\nmvi a, 0FFH", {
            accumulator: 0x42,
            registers: {
                bc: { high: 0x12, low: 0x34 },
                de: { high: 0x56, low: 0x78 },
                hl: { high: 0x9a, low: 0xbc },
            },
            flags: initialFlags,
        });

        expect(result.accumulator).toBe(0x42);
        expect(result.registers).toEqual({
            bc: { high: 0x12, low: 0x34 },
            de: { high: 0x56, low: 0x78 },
            hl: { high: 0x9a, low: 0xbc },
        });
        expect(result.stackPointer).toBe(0xff00);
        expect(result.flags).toEqual(initialFlags);
        expect(result.programCounter).toBe(0x0004);
    });
});
