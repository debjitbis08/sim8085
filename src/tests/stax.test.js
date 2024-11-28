import { describe, test } from "vitest";
import { runTest } from "./test-utils";

describe("STAX Instruction Tests", () => {
    test("STAX B: Stores value from A register into memory using BC pair", async () => {
        const code = `
      mvi a, 9h
      mvi b, 3fh
      mvi c, 16h
      stax b
      hlt
    `;
        const expectedCpuState = {
            accumulator: 0x09,
            flags: {
                z: false,
                s: false,
                p: false,
                c: false,
                ac: false,
            },
            programCounter: 0x0008,
            memory: {
                0x3f16: 0x09,
            },
        };
        await runTest(code, {}, expectedCpuState);
    });

    test("STAX D: Stores value from A register into memory using DE pair", async () => {
        const code = `
      mvi a, 12h
      mvi d, 4fh
      mvi e, 22h
      stax d
      hlt
    `;
        const expectedCpuState = {
            accumulator: 0x12,
            flags: {
                z: false,
                s: false,
                p: false,
                c: false,
                ac: false,
            },
            programCounter: 0x0008,
            memory: {
                0x4f22: 0x12,
            },
        };
        await runTest(code, {}, expectedCpuState);
    });
});