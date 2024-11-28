import { describe, test } from "vitest";
import * as fc from "fast-check";
import { runTest } from "./test-utils";

describe("SHLD Instruction Tests", () => {
    test("SHLD: Stores L and H register values into specified memory locations", async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 0x0005, max: 0xfffe }), // Random 16-bit memory address
                fc.integer({ min: 0x00, max: 0xff }), // Random 8-bit L register value
                fc.integer({ min: 0x00, max: 0xff }), // Random 8-bit H register value
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
                      shld ${memoryAddress}
                      hlt
                    `;

                    // Define the initial state of the CPU
                    const initialCpuState = {
                        accumulator: 0x00, // Initial accumulator value
                        memory: {}, // Empty memory
                        registers: {
                            bc: { high: 0x00, low: 0x00 },
                            de: { high: 0x00, low: 0x00 },
                            hl: { high: hValue, low: lValue }, // HL register pair values
                        },
                        flags, // Randomized flags from fast-check
                    };

                    // Define the expected state of the CPU after execution
                    const expectedCpuState = {
                        ...initialCpuState,
                        memory: {
                            ...initialCpuState.memory,
                            [memoryAddress]: lValue, // L register value at specified memory address
                            [memoryAddress + 1]: hValue, // H register value at next memory address
                        },
                        programCounter: 0x0004, // PC should increment by 3 after SHLD (3-byte instruction)
                    };

                    await runTest(code, initialCpuState, expectedCpuState);
                },
            ),
            { verbose: true, numRuns: 100 }, // Run 100 variations for SHLD instruction
        );
    });
});
