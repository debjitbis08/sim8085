import { describe, test } from "vitest";
import * as fc from "fast-check";
import { runTest } from "./test-utils";

describe("ORI Instruction Tests", () => {
    test("ORI: Performs logical OR between accumulator and immediate data, resets carry and auxiliary carry flags", async () => {
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
                    const result = accumulator | immediateValue;

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
                      ori ${immediateValue}
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
                        accumulator: result, // Result of the OR operation
                        flags: {
                            z: zeroFlag,
                            s: signFlag,
                            p: parityFlag,
                            c: false, // Carry flag is always reset to 0 by ORI
                            ac: false, // Auxiliary carry flag is always reset to 0 by ORI
                        },
                        programCounter: 0x0003,
                    };

                    await runTest(code, initialCpuState, expectedCpuState);
                },
            ),
            { verbose: true, numRuns: 100 }, // Run 100 variations for ORI instruction
        );
    });
});
