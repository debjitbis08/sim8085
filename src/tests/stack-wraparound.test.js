import { describe, expect, test } from "vitest";
import { runAndGetState } from "./test-utils.js";

// SP is a 16-bit register. Every stack memory access must wrap at FFFFH just
// as SP itself does; JavaScript/Wasm array bounds must not leak into CPU rules.
describe("16-bit stack-address wraparound", () => {
    test("PUSH wraps the high byte to 0000H and the low byte to FFFFH", async () => {
        const result = await runAndGetState("org 0100H\nlxi sp, 0001H\npush b\nhlt", {
            programCounter: 0x0100,
            registers: { bc: { high: 0x12, low: 0x34 } },
        });

        expect(result.stackPointer).toBe(0xffff);
        expect(result.memory[0x0000]).toBe(0x12);
        expect(result.memory[0xffff]).toBe(0x34);
    });

    test("POP reads its high byte from 0000H when SP is FFFFH", async () => {
        const result = await runAndGetState("org 0100H\nlxi sp, 0FFFFH\npop d\nhlt", {
            programCounter: 0x0100,
            memory: { 0xffff: 0x78, 0x0000: 0x56 },
        });

        expect(result.registers.de).toEqual({ high: 0x56, low: 0x78 });
        expect(result.stackPointer).toBe(0x0001);
    });

    test("PUSH PSW wraps its accumulator byte to 0000H", async () => {
        const result = await runAndGetState("org 0100H\nlxi sp, 0001H\npush psw\nhlt", {
            programCounter: 0x0100,
            accumulator: 0x5a,
            flags: { s: true, z: true, k: true, ac: true, p: true, v: true, c: true },
        });

        expect(result.stackPointer).toBe(0xffff);
        expect(result.memory[0xffff]).toBe(0xf7);
        expect(result.memory[0x0000]).toBe(0x5a);
    });

    test("POP PSW reads its accumulator byte from 0000H", async () => {
        const result = await runAndGetState("org 0100H\nlxi sp, 0FFFFH\npop psw\nhlt", {
            programCounter: 0x0100,
            memory: { 0xffff: 0xf7, 0x0000: 0x5a },
        });

        expect(result.accumulator).toBe(0x5a);
        expect(result.flags).toEqual({ z: true, s: true, p: true, c: true, ac: true, v: true, k: true });
        expect(result.stackPointer).toBe(0x0001);
    });

    test("CALL wraps its return address across FFFFH/0000H", async () => {
        const result = await runAndGetState(
            "org 0100H\nlxi sp, 0001H\ncall target\nhlt\ntarget: hlt",
            { programCounter: 0x0100 },
        );

        expect(result.stackPointer).toBe(0xffff);
        expect(result.memory[0xffff]).toBe(0x06);
        expect(result.memory[0x0000]).toBe(0x01);
        expect(result.programCounter).toBe(0x0108);
    });

    test("RET reads a wrapped return address and wraps SP to 0001H", async () => {
        const result = await runAndGetState("org 0100H\nlxi sp, 0FFFFH\nret\norg 0200H\nhlt", {
            programCounter: 0x0100,
            memory: { 0xffff: 0x00, 0x0000: 0x02 },
        });

        expect(result.stackPointer).toBe(0x0001);
        expect(result.programCounter).toBe(0x0201);
    });

    test("XTHL exchanges H with 0000H when SP is FFFFH", async () => {
        const result = await runAndGetState("org 0100H\nlxi sp, 0FFFFH\nxthl\nhlt", {
            programCounter: 0x0100,
            registers: { hl: { high: 0xab, low: 0xcd } },
            memory: { 0xffff: 0x34, 0x0000: 0x12 },
        });

        expect(result.registers.hl).toEqual({ high: 0x12, low: 0x34 });
        expect(result.memory[0xffff]).toBe(0xcd);
        expect(result.memory[0x0000]).toBe(0xab);
        expect(result.stackPointer).toBe(0xffff);
    });

    test.each([0, 1, 2, 3, 4, 5, 6, 7])("RST %i wraps its return address at SP=0000H", async (vector) => {
        const result = await runAndGetState(
            `org 0100H\nlxi sp, 0000H\nrst ${vector}\nhlt\norg ${vector * 8}\nhlt`,
            { programCounter: 0x0100 },
        );

        expect(result.stackPointer).toBe(0xfffe);
        expect(result.memory[0xfffe]).toBe(0x04);
        expect(result.memory[0xffff]).toBe(0x01);
        expect(result.programCounter).toBe(vector * 8 + 1);
    });
});
