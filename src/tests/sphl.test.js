import { describe, test } from 'vitest';
import * as fc from 'fast-check';
import { runTest } from './test-utils';

describe('SPHL Instruction Property-Based Tests', () => {
    test('SPHL: Sets SP to the value in HL', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate values for H and L registers
                fc.integer({ min: 0x00, max: 0xFF }),
                fc.integer({ min: 0x00, max: 0xFF }),
                async (high, low) => {
                    const code = `
                        sphl
                        hlt
                    `;

                    const initialCpuState = {
                        accumulator: 0x00,
                        registers: {
                            bc: { high: 0x00, low: 0x00 },
                            de: { high: 0x00, low: 0x00 },
                            hl: { high, low }, // Random values for H and L
                        },
                        flags: {
                            z: false,
                            s: false,
                            p: false,
                            c: false,
                            ac: false,
                        },
                        stackPointer: 0x0000, // Initial SP is 0
                        programCounter: 0x0000,
                        memory: {},
                    };

                    const expectedCpuState = {
                        ...initialCpuState,
                        stackPointer: (high << 8) | low, // SP = (H << 8) | L
                        programCounter: 0x0002,
                    };

                    await runTest(code, initialCpuState, expectedCpuState);
                }
            ),
            {
                verbose: true,
                numRuns: 100, // Test with 100 random combinations of H and L
            }
        );
    });
});
