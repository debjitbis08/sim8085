import { describe, test } from 'vitest';
import * as fc from 'fast-check';
import { runTest } from './test-utils';

describe('PCHL Instruction Property-Based Tests', () => {
    test('PCHL: Sets PC to the value in HL', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate values for H and L registers
                fc.integer({ min: 0x01, max: 0xFE }),
                fc.integer({ min: 0x01, max: 0xFE }),
                async (high, low) => {
                    const code = `
                    pchl
                    org ${(high<<8)|low}
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
                        programCounter: 0x0000, // Initial PC is 0
                        memory: {},
                    };

                    const expectedCpuState = {
                        ...initialCpuState,
                        programCounter: ((high << 8) | low) + 1, // PC = (H << 8) | L
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
