import { describe, test } from 'vitest';
import * as fc from 'fast-check';
import { runTest } from './test-utils';

describe('RRC Instruction Property-Based Tests', () => {
    test('RRC: Rotates the accumulator right and sets the carry flag', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 0x00, max: 0xFF }), // Generate 8-bit accumulator values
                async (initialAccumulator) => {
                    const code = `
                        rrc
                        hlt
                    `;

                    // Calculate the expected results
                    const carryFlag = initialAccumulator & 0x1; // Low-order bit becomes the carry flag
                    const rotatedAccumulator = ((initialAccumulator >> 1) | (initialAccumulator << 7)) & 0xFF; // Rotate right

                    const initialCpuState = {
                        accumulator: initialAccumulator,
                        registers: {
                            bc: { high: 0x00, low: 0x00 },
                            de: { high: 0x00, low: 0x00 },
                            hl: { high: 0x00, low: 0x00 },
                        },
                        flags: {
                            z: false,
                            s: false,
                            p: false,
                            c: false, // Carry flag starts undefined
                            ac: false,
                        },
                        programCounter: 0x0000,
                        memory: {},
                    };

                    const expectedCpuState = {
                        ...initialCpuState,
                        accumulator: rotatedAccumulator,
                        flags: {
                            ...initialCpuState.flags,
                            c: !!carryFlag, // Carry flag equals the original low-order bit
                        },
                        programCounter: 0x0002, // Program counter increments by 1
                    };

                    await runTest(code, initialCpuState, expectedCpuState);
                }
            ),
            { verbose: true, numRuns: 100 } // Test with 100 random accumulator values
        );
    });
});
