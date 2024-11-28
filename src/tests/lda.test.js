import { describe, test } from "vitest";
import * as fc from "fast-check";
import { runTest } from "./test-utils";

describe("LDA Instruction Tests", () => {
    test("LDA: Loads value from specified memory location into accumulator", async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 0x00, max: 0xff }), // Random 8-bit memory value
                fc.integer({ min: 0x0005, max: 0xffff }), // Random 16-bit memory address
                fc.record({
                    z: fc.boolean(),
                    s: fc.boolean(),
                    p: fc.boolean(),
                    c: fc.boolean(),
                    ac: fc.boolean(),
                }), // Random initial flag states
                async (memoryValue, memoryAddress, flags) => {
                    const code = `
                      org 0x0000
                      lda ${memoryAddress}
                      hlt
                    `;

                    // Define the initial state of the CPU
                    const initialCpuState = {
                        accumulator: 0x00, // Initial accumulator value
                        memory: {
                            [memoryAddress]: memoryValue, // Memory contains the value at the specified address
                        },
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
                        accumulator: memoryValue, // Accumulator is updated with the value from memory
                        memory: {
                            [memoryAddress]: memoryValue,
                        },
                        programCounter: 0x0004,
                    };

                    await runTest(code, initialCpuState, expectedCpuState);
                },
            ),
            { verbose: true, numRuns: 100 }, // Run 100 variations for LDA instruction
        );
    });
});
