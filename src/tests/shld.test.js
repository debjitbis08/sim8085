import { describe, test, expect } from "vitest";
import * as fc from "fast-check";
import { runTest, runAndGetState } from './test-utils';

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

// Worked example from the Intel 8080/8085 Assembly Language Programming Manual, Chapter 3.
describe('SHLD Instruction Manual Example', () => {
    // "Assume that the H and L registers contain OAEH and 29H, respectively."
    // The manual's memory table shows 10AH holding 29 and 10BH holding AE
    // after SHLD 10AH.
    test('SHLD 10AH: writes L to 010AH and H to 010BH', async () => {
        const result = await runAndGetState('shld 10AH\nhlt', {
            registers: { hl: { high: 0xae, low: 0x29 } },
        });

        expect(result.memory[0x010a]).toBe(0x29);
        expect(result.memory[0x010b]).toBe(0xae);
    });

    test('SHLD FFFFH wraps the H-byte write to 0000H', async () => {
        const result = await runAndGetState('org 0100H\nshld 0FFFFH\nhlt', {
            programCounter: 0x0100,
            registers: { hl: { high: 0xab, low: 0xcd } },
        });

        expect(result.memory[0xffff]).toBe(0xcd);
        expect(result.memory[0x0000]).toBe(0xab);
    });
});
