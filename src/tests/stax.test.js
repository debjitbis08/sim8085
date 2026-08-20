import { describe, test, expect } from "vitest";
import { runTest, runAndGetState } from './test-utils';

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

// Worked example from the Intel 8080/8085 Assembly Language Programming Manual, Chapter 3.
describe('STAX Instruction Manual Example', () => {
    // "If register B contains 3FH and register C contains 16H, the following
    // instruction stores a copy of the contents of the accumulator at memory
    // location 3F16H: STAX B"
    test('STAX B: stores the accumulator at 3F16H', async () => {
        const result = await runAndGetState('stax b\nhlt', {
            accumulator: 0x39,
            registers: { bc: { high: 0x3f, low: 0x16 } },
        });

        expect(result.memory[0x3f16]).toBe(0x39);
    });
});
