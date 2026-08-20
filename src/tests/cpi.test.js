import { describe, test, expect } from "vitest";
import * as fc from "fast-check";
import { runTest, runAndGetState, setupSimulator } from "./test-utils";

describe("CPI Instruction Tests", () => {
    test("CPI: Compares immediate data with accumulator and sets zero and carry flags", async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 0x00, max: 0xff }), // Random 8-bit accumulator value
                fc.integer({ min: 0x00, max: 0xff }), // Random 8-bit immediate value
                fc.record({
                    z: fc.boolean(),
                    s: fc.boolean(),
                    p: fc.boolean(),
                    c: fc.boolean(),
                    ac: fc.boolean(),
                }), // Random initial flag states
                async (accumulator, immediateValue, flags) => {
                    const result = accumulator - immediateValue;

                    // Calculate expected flags
                    const zeroFlag = result === 0;
                    const carryFlag = accumulator < immediateValue;
                    // The manual lists AC among the flags CPI affects, and
                    // describes the comparison as an internal subtraction, so
                    // AC is the half-borrow that subtraction produces.
                    const auxCarryFlag =
                        (accumulator & 0x0f) + ((~immediateValue + 1) & 0x0f) > 0x0f;

                    const code = `
                      org 0x0000
                      cpi ${immediateValue}
                      hlt
                    `;

                    // Define the initial state of the CPU
                    const initialCpuState = {
                        accumulator,
                        registers: {
                            bc: { high: 0x00, low: 0x00 },
                            de: { high: 0x00, low: 0x00 },
                            hl: { high: 0x00, low: 0x00 },
                        },
                        flags, // Randomized flags from fast-check
                    };

                    // Define the expected state of the CPU after execution
                    const expectedCpuState = {
                        ...initialCpuState,
                        flags: {
                            z: zeroFlag,
                            s: (result & 0x80) !== 0, // Sign flag based on the most significant bit of the result
                            p:
                                (result & 0xff)
                                    .toString(2)
                                    .split("")
                                    .filter((bit) => bit === "1").length %
                                    2 ===
                                0, // Parity flag based on even/odd 1 bits
                            c: carryFlag, // Carry flag based on the comparison
                            ac: auxCarryFlag,
                        },
                        programCounter: 0x0003, // PC should increment by 2 after CPI (2-byte instruction)
                    };

                    await runTest(code, initialCpuState, expectedCpuState);
                },
            ),
            { verbose: true, numRuns: 100 }, // Run 100 variations for CPI instruction
        );
    });
});

// Worked example from the Intel 8080/8085 Assembly Language Programming Manual,
// Chapter 3.
describe('CPI Instruction Manual Example', () => {
    // "The instruction CPI 'C' compares the contents of the accumulator to the
    // letter C (43H)."
    test("CPI 'C': assembles to FE 43 and compares against 43H", async () => {
        const { assembled } = await setupSimulator("cpi 'C'\nhlt");
        const bytes = assembled.filter((a) => a.kind !== 'label').map((a) => a.data);
        expect(bytes.slice(0, 2)).toEqual([0xfe, 0x43]);

        // Equality is what the zero flag reports.
        const equal = await runAndGetState("cpi 'C'\nhlt", { accumulator: 0x43 });
        expect(equal.flags.z).toBe(true);

        const notEqual = await runAndGetState("cpi 'C'\nhlt", { accumulator: 0x42 });
        expect(notEqual.flags.z).toBe(false);
    });
});

describe('CPI Instruction Undocumented Flags', () => {
    // CPI had the same defect as ADI: it wrote only the five documented flags.
    // K after a comparison is the signed less-than that JX5/JNX5 test.
    test.each([
        // accumulator, immediate, V, K
        [0x7f, 0xff, true, false], // 127 - (-1) overflows; 127 is not the smaller
        [0x80, 0x01, true, true], // -128 - 1 overflows; -128 is the smaller
        [0x05, 0x03, false, false], // 5 - 3 is positive, no overflow
        [0x03, 0x05, false, true], // 3 - 5 is negative: K marks the smaller
    ])('CPI %i against %i sets V=%s K=%s', async (a, imm, v, k) => {
        const literal = `0${imm.toString(16).padStart(2, '0')}H`;
        const result = await runAndGetState(`cpi ${literal}\nhlt`, { accumulator: a });

        expect(result.flags.v).toBe(v);
        expect(result.flags.k).toBe(k);
    });

    test('CPI: K reports a signed less-than that JX5 can branch on', async () => {
        const code = `
            cpi 05H
            jx5 smaller
            mvi a, 00H
            hlt
  smaller:  mvi a, 0FFH
            hlt
        `;

        const lower = await runAndGetState(code, { accumulator: 0x03 });
        expect(lower.accumulator).toBe(0xff);

        const higher = await runAndGetState(code, { accumulator: 0x07 });
        expect(higher.accumulator).toBe(0x00);
    });
});

describe('CPI and CMP consistency', () => {
    // The manual documents both as Z,S,P,CY,AC and describes each as the same
    // internal subtraction, so comparing a value immediately and comparing it
    // out of a register must set identical flags. CPI used to force AC to
    // zero while CMP computed it, and the two disagreed.
    test('CPI and CMP set the same flags for the same operands', async () => {
        for (const [a, operand] of [
            [0x10, 0x01],
            [0x00, 0x01],
            [0x43, 0x43],
            [0x80, 0x7f],
            [0xff, 0x0f],
            [0x3a, 0x2b],
        ]) {
            const literal = `0${operand.toString(16).padStart(2, '0')}H`;
            const immediate = await runAndGetState(`cpi ${literal}\nhlt`, { accumulator: a });
            const register = await runAndGetState('cmp b\nhlt', {
                accumulator: a,
                registers: { bc: { high: operand, low: 0x00 } },
            });

            expect(immediate.flags, `CPI ${literal} against ${a.toString(16)}`).toEqual(
                register.flags,
            );
            // A comparison leaves the accumulator alone.
            expect(immediate.accumulator).toBe(a);
        }
    });
});
