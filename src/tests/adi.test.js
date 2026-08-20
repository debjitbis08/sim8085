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

describe('ADI Instruction Undocumented Flags', () => {
    // ADI once hand-rolled its flags and never wrote V or K, so RSTV and
    // JX5/JNX5 could branch on state left behind by an earlier instruction.
    // V is the carry into the top bit exclusive-ored with the carry out of it,
    // and K is V exclusive-ored with the sign of the result.
    test.each([
        // accumulator, immediate, V, K
        [0x7f, 0x01, true, false], // 127 + 1 overflows into -128
        [0x80, 0xff, true, true], // -128 + -1 overflows the other way
        [0x01, 0x01, false, false], // 1 + 1 needs no overflow
        [0x00, 0xff, false, true], // 0 + -1 is -1: no overflow, negative
    ])('ADI %i + %i sets V=%s K=%s', async (a, imm, v, k) => {
        const literal = `0${imm.toString(16).padStart(2, '0')}H`;
        const result = await runAndGetState(`adi ${literal}\nhlt`, { accumulator: a });

        expect(result.flags.v).toBe(v);
        expect(result.flags.k).toBe(k);
    });

    test('ADI: does not leave V and K stale from a previous instruction', async () => {
        // 1 + 1 cannot overflow, so V must be cleared however it started.
        const result = await runAndGetState('adi 01H\nhlt', {
            accumulator: 0x01,
            flags: { v: true, k: true },
        });

        expect(result.flags.v).toBe(false);
        expect(result.flags.k).toBe(false);
    });
});
