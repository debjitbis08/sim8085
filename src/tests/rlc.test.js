import { describe, test } from 'vitest';
import * as fc from 'fast-check';
import { runTest } from './test-utils';

describe('RLC Instruction Property-Based Tests', () => {
    test('RLC: Rotates accumulator and modifies only carry flag', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate an 8-bit value for the accumulator and random flag states
                fc.integer({ min: 0x00, max: 0xFF }),
                fc.record({
                    z: fc.boolean(),
                    s: fc.boolean(),
                    p: fc.boolean(),
                    ac: fc.boolean(),
                }),
                async (initialAccumulator, initialFlags) => {
                    const code = `
                        rlc
                        hlt
                    `;

                    // Calculate the expected results
                    const carryFlag = (initialAccumulator >> 7) & 0x1; // High-order bit becomes the carry flag
                    const rotatedAccumulator = ((initialAccumulator << 1) | carryFlag) & 0xFF; // Rotate left

                    const initialCpuState = {
                        accumulator: initialAccumulator,
                        registers: {
                            bc: { high: 0x00, low: 0x00 },
                            de: { high: 0x00, low: 0x00 },
                            hl: { high: 0x00, low: 0x00 },
                        },
                        flags: {
                            ...initialFlags,
                            c: false, // Carry flag starts undefined
                        },
                        programCounter: 0x0000,
                        memory: {},
                    };

                    const expectedCpuState = {
                        ...initialCpuState,
                        accumulator: rotatedAccumulator,
                        flags: {
                            ...initialFlags, // Other flags should remain unchanged
                            c: !!carryFlag,    // Carry flag equals the original high-order bit
                        },
                        programCounter: 0x0002,
                    };

                    await runTest(code, initialCpuState, expectedCpuState);
                }
            ),
            {
                verbose: true,
                numRuns: 100, // Test with 100 random accumulator and flag states
            }
        );
    });
});
