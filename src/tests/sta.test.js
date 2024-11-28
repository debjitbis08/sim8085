import { describe, test } from "vitest";
import * as fc from "fast-check";
import { runTest } from "./test-utils";

describe("STA Instruction Tests", () => {
    test("STA: Stores accumulator value in specified memory location", async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 0x00, max: 0xff }), // Random 8-bit accumulator value
                fc.integer({ min: 0x0005, max: 0xffff }), // Random 16-bit memory address
                fc.record({
                    z: fc.boolean(),
                    s: fc.boolean(),
                    p: fc.boolean(),
                    c: fc.boolean(),
                    ac: fc.boolean(),
                }), // Random initial flag states
                async (accumulator, memoryAddress, flags) => {
                    const code = `
                      org 0x0000
                      sta ${memoryAddress}
                      hlt
                    `;

                    // Define the initial state of the CPU
                    const initialCpuState = {
                        accumulator,
                        memory: {}, // Empty memory
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
                        memory: {
                            ...initialCpuState.memory,
                            [memoryAddress]: accumulator, // Memory at the address is updated with the accumulator value
                        },
                        programCounter: 0x0004, // PC should increment by 3 after STA (3-byte instruction)
                    };

                    await runTest(code, initialCpuState, expectedCpuState);
                },
            ),
            { verbose: true, numRuns: 100 }, // Run 100 variations for STA instruction
        );
    });
});