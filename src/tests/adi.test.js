import { describe, test, expect } from "vitest";
import { runTest, runAndGetState } from './test-utils';

describe("ADI Instruction Tests", () => {
    test("ADI: Sets AC flag", async () => {
        const code = `
      mvi a, 8h
      adi 8h
      hlt
    `;
        const expectedCpuState = {
            accumulator: 0x10,
            flags: {
                z: false,
                s: false,
                p: false,
                c: false,
                ac: true,
            },
            programCounter: 0x0005,
        };
        await runTest(code, {}, expectedCpuState);
    });

    test("ADI: Resets AC flag", async () => {
        const code = `
      mvi a, 14h
      adi 42h
      hlt
    `;
        const expectedCpuState = {
            accumulator: 0x56,
            flags: {
                z: false,
                s: false,
                p: true,
                c: false,
                ac: false,
            },
            programCounter: 0x0005,
        };
        await runTest(code, {}, expectedCpuState);
    });
});

// Worked example from the Intel 8080/8085 Assembly Language Programming Manual, Chapter 3.
describe('ADI Instruction Manual Example', () => {
    // "Assume that the accumulator contains the value 14H. The instruction
    // ADI 66 has the following effect: ... 01010110 = 56H"
    test('ADI: 14H + 42H = 56H', async () => {
        const result = await runAndGetState('adi 42H\nhlt', { accumulator: 0x14 });

        expect(result.accumulator).toBe(0x56);
    });
});
