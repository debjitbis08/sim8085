import { describe, test } from "vitest";
import * as fc from "fast-check";
import { runTest } from "./test-utils";

describe("LHLD Instruction Tests", () => {
    test("LHLD: Loads L and H register values from specified memory locations", async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 0x0005, max: 0xfffe }), // Random 16-bit memory address
                fc.integer({ min: 0x00, max: 0xff }), // Random 8-bit memory value for L
                fc.integer({ min: 0x00, max: 0xff }), // Random 8-bit memory value for H
                fc.record({
                    z: fc.boolean(),
                    s: fc.boolean(),
                    p: fc.boolean(),
                    c: fc.boolean(),
                    ac: fc.boolean(),
                }), // Random initial flag states
                async (memoryAddress, lValue, hValue, flags) => {
                    const code = `
                      org 0x0000
                      lhld ${memoryAddress}
                      hlt
                    `;

                    // Define the initial state of the CPU
                    const initialCpuState = {
                        accumulator: 0x00, // Initial accumulator value
                        memory: {
                            [memoryAddress]: lValue, // L value stored at specified memory address
                            [memoryAddress + 1]: hValue, // H value stored at the next memory address
                        },
                        registers: {
                            bc: { high: 0x00, low: 0x00 },
                            de: { high: 0x00, low: 0x00 },
                            hl: { high: 0x00, low: 0x00 }, // HL initially zero
                        },
                        flags, // Randomized flags from fast-check
                    };

                    // Define the expected state of the CPU after execution
                    const expectedCpuState = {
                        ...initialCpuState,
                        registers: {
                            ...initialCpuState.registers,
                            hl: { high: hValue, low: lValue }, // HL registers updated with memory values
                        },
                        programCounter: 0x0004, // PC should increment by 3 after LHLD (3-byte instruction)
                    };

                    await runTest(code, initialCpuState, expectedCpuState);
                },
            ),
            { verbose: true, numRuns: 100 }, // Run 100 variations for LHLD instruction
        );
    });
});
