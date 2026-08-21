import { describe, expect, test } from "vitest";
import { runAndGetState } from "./test-utils.js";

const allPending = { trap: true, rst75: true, rst65: true, rst55: true };
const noMasks = { rst75: false, rst65: false, rst55: false };

function interruptProgram(vector, body = "hlt") {
    return `org 0100H\n${body}\norg ${vector.toString(16)}H\nhlt`;
}

describe("8085 interrupt recognition", () => {
    test("TRAP is recognized even when maskable interrupts are disabled", async () => {
        const result = await runAndGetState(interruptProgram(0x24, "nop\nhlt"), {
            programCounter: 0x0100,
            interruptsEnabled: false,
            pendingInterrupts: { ...allPending, rst75: false, rst65: false, rst55: false },
            flags: { z: true, s: true, p: true, c: true, ac: true, v: true, k: true },
        });

        expect(result.programCounter).toBe(0x0025);
        expect(result.stackPointer).toBe(0xfffd);
        expect(result.memory[0xfffd]).toBe(0x00);
        expect(result.memory[0xfffe]).toBe(0x01);
        expect(result.pendingInterrupts.trap).toBe(false);
        expect(result.interruptsEnabled).toBe(false);
        expect(result.flags).toEqual({ z: true, s: true, p: true, c: true, ac: true, v: true, k: true });
    });

    test.each([
        ["TRAP", allPending, noMasks, 0x24],
        ["RST7.5", { ...allPending, trap: false }, noMasks, 0x3c],
        ["RST6.5", { ...allPending, trap: false }, { ...noMasks, rst75: true }, 0x34],
        ["RST5.5", { ...allPending, trap: false }, { ...noMasks, rst75: true, rst65: true }, 0x2c],
    ])("%s wins at its documented priority", async (_name, pendingInterrupts, interruptMasks, vector) => {
        const result = await runAndGetState(interruptProgram(vector), {
            programCounter: 0x0100,
            interruptsEnabled: true,
            interruptMasks,
            pendingInterrupts,
        });

        expect(result.programCounter).toBe(vector + 1);
        expect(result.stackPointer).toBe(0xfffd);
        expect(result.memory[0xfffd]).toBe(0x00);
        expect(result.memory[0xfffe]).toBe(0x01);
        expect(result.interruptsEnabled).toBe(false);
    });

    test("masked requests remain pending and execution continues", async () => {
        const result = await runAndGetState("org 0100H\nhlt", {
            programCounter: 0x0100,
            interruptsEnabled: true,
            interruptMasks: { rst75: true, rst65: true, rst55: true },
            pendingInterrupts: { trap: false, rst75: true, rst65: true, rst55: true },
        });

        expect(result.programCounter).toBe(0x0101);
        expect(result.stackPointer).toBe(0xffff);
        expect(result.pendingInterrupts).toEqual({ trap: false, rst75: true, rst65: true, rst55: true });
    });

    test("accepting RST7.5 clears its edge latch", async () => {
        const result = await runAndGetState(interruptProgram(0x3c), {
            programCounter: 0x0100,
            interruptsEnabled: true,
            interruptMasks: noMasks,
            pendingInterrupts: { trap: false, rst75: true, rst65: false, rst55: false },
        });

        expect(result.pendingInterrupts.rst75).toBe(false);
    });
});

describe("EI and DI interrupt timing", () => {
    test("EI enables maskable interrupts only after the following instruction", async () => {
        const result = await runAndGetState(interruptProgram(0x3c, "ei\ninr b\nhlt"), {
            programCounter: 0x0100,
            pendingInterrupts: { trap: false, rst75: true, rst65: false, rst55: false },
        });

        expect(result.registers.bc.high).toBe(1);
        expect(result.programCounter).toBe(0x003d);
        expect(result.memory[0xfffd]).toBe(0x02);
        expect(result.memory[0xfffe]).toBe(0x01);
    });

    test("DI as the delayed instruction cancels a preceding EI", async () => {
        const result = await runAndGetState("org 0100H\nei\ndi\nnop\nhlt", {
            programCounter: 0x0100,
            pendingInterrupts: { trap: false, rst75: true, rst65: false, rst55: false },
        });

        expect(result.programCounter).toBe(0x0104);
        expect(result.stackPointer).toBe(0xffff);
        expect(result.interruptsEnabled).toBe(false);
        expect(result.pendingInterrupts.rst75).toBe(true);
    });

    test("TRAP cannot interrupt EI itself but is recognized before the next instruction", async () => {
        const result = await runAndGetState(interruptProgram(0x24, "ei\ninr b\nhlt"), {
            programCounter: 0x0100,
            pendingInterrupts: { trap: true, rst75: false, rst65: false, rst55: false },
        });

        expect(result.registers.bc.high).toBe(0);
        expect(result.memory[0xfffd]).toBe(0x01);
        expect(result.memory[0xfffe]).toBe(0x01);
    });

    test("a maskable interrupt push wraps at SP=0000H", async () => {
        const result = await runAndGetState(interruptProgram(0x3c, "lxi sp, 0000H\nei\nnop\nhlt"), {
            programCounter: 0x0100,
            pendingInterrupts: { trap: false, rst75: true, rst65: false, rst55: false },
        });

        expect(result.stackPointer).toBe(0xfffe);
        expect(result.memory[0xfffe]).toBe(0x05);
        expect(result.memory[0xffff]).toBe(0x01);
    });
});

describe("RIM and SIM interrupt state", () => {
    test("the first RIM after TRAP reports the pre-TRAP IE state exactly once", async () => {
        const result = await runAndGetState("org 0100H\nnop\nhlt\norg 24H\nrim\nmov b, a\nrim\nhlt", {
            programCounter: 0x0100,
            interruptsEnabled: true,
            pendingInterrupts: { trap: true, rst75: false, rst65: false, rst55: false },
        });

        expect(result.registers.bc.high).toBe(0x08);
        expect(result.accumulator).toBe(0x00);
        expect(result.interruptsEnabled).toBe(false);
    });

    test("TRAP during EI's delay discards the pending enable", async () => {
        const result = await runAndGetState("org 0100H\nei\nnop\nhlt\norg 24H\nret", {
            programCounter: 0x0100,
            pendingInterrupts: { trap: true, rst75: true, rst65: false, rst55: false },
        });

        expect(result.programCounter).toBe(0x0103);
        expect(result.stackPointer).toBe(0xffff);
        expect(result.interruptsEnabled).toBe(false);
        expect(result.pendingInterrupts.rst75).toBe(true);
    });

    test("RIM uses D6-D4 for pending requests, D3 for IE, and D2-D0 for masks", async () => {
        const result = await runAndGetState("rim\nhlt", {
            interruptsEnabled: false,
            interruptMasks: { rst75: true, rst65: false, rst55: false },
            pendingInterrupts: { trap: false, rst75: false, rst65: false, rst55: true },
        });

        // Asymmetric groups distinguish the correct 14H layout from the
        // swapped 41H layout that a symmetric all-ones fixture cannot catch.
        expect(result.accumulator).toBe(0x14);
    });

    test("RIM observes IE only after EI's delayed instruction", async () => {
        const result = await runAndGetState("ei\nnop\nrim\nhlt");
        expect(result.accumulator).toBe(0x08);
    });

    test("SIM updates masks and resets the RST7.5 latch", async () => {
        const result = await runAndGetState("mvi a, 01CH\nsim\nrim\nhlt", {
            pendingInterrupts: { trap: false, rst75: true, rst65: false, rst55: false },
        });

        expect(result.accumulator).toBe(0x04);
        expect(result.interruptMasks).toEqual({ rst75: true, rst65: false, rst55: false });
        expect(result.pendingInterrupts.rst75).toBe(false);
    });

    test("RIM mask bits round-trip through MSE and SIM without changing the masks", async () => {
        const result = await runAndGetState("mvi a, 0DH\nsim\nrim\nori 08H\nsim\nrim\nhlt");

        expect(result.accumulator).toBe(0x05);
        expect(result.interruptMasks).toEqual({ rst75: true, rst65: false, rst55: true });
    });
});
