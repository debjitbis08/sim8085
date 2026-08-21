import { describe, test, expect } from "vitest";
import * as fc from "fast-check";
import { runTest, runAndGetState, setupSimulator } from "./test-utils";

describe("ANI Instruction Tests", () => {
    test("ANI: Performs logical AND between accumulator and immediate data, resets carry and sets auxiliary carry", async () => {
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
                    const result = accumulator & immediateValue;

                    // Calculate expected flags
                    const zeroFlag = result === 0;
                    const signFlag = (result & 0x80) !== 0;
                    const parityFlag =
                        result
                            .toString(2)
                            .split("")
                            .filter((bit) => bit === "1").length %
                            2 ===
                        0;

                    const code = `
                      org 0x0000
                      ani ${immediateValue}
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
                        flags,
                    };

                    // Define the expected state of the CPU after execution
                    const expectedCpuState = {
                        ...initialCpuState,
                        accumulator: result, // Result of the AND operation
                        flags: {
                            z: zeroFlag,
                            s: signFlag,
                            p: parityFlag,
                            c: false, // Carry flag is always reset to 0 by ANI
                            // The 8085 logical AND instructions always set the auxiliary
                            // carry, per the Intel 8080/8085 Assembly Language Programming
                            // Manual. (The 8080 instead reports the logical OR of bit 3 of
                            // the two operands -- see the 8080 compatibility switch used by
                            // the CP/M exercisers in src/tests/exerciser.)
                            ac: true,
                        },
                        programCounter: 0x0003,
                    };

                    await runTest(code, initialCpuState, expectedCpuState);
                },
            ),
            { verbose: true, numRuns: 100 }, // Run 100 variations for ANI instruction
        );
    });
});

// Worked example from the Intel 8080/8085 Assembly Language Programming Manual, Chapter 3.
describe('ANI Instruction Manual Example', () => {
    // "The following instruction is used to reset OFF bit six of the byte in
    // the accumulator: ANI 10111111B"
    test('ANI 10111111B: assembles to E6 BF and clears only bit 6', async () => {
        const { assembled } = await setupSimulator('ani 10111111B\nhlt');
        const bytes = assembled.filter((a) => a.kind !== 'label').map((a) => a.data);
        expect(bytes.slice(0, 2)).toEqual([0xe6, 0xbf]);

        const result = await runAndGetState('ani 10111111B\nhlt', { accumulator: 0xff });
        expect(result.accumulator).toBe(0xbf);
    });
});
