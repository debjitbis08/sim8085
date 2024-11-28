import { describe, test } from 'vitest';
import * as fc from 'fast-check';
import { runTest } from './test-utils';

describe('CMA Instruction Property-Based Tests', () => {
    test('CMA: Complements the accumulator without modifying flags', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate an initial accumulator value and flags
                fc.integer({ min: 0x00, max: 0xFF }), // Accumulator can hold 8-bit values
                fc.record({
                    z: fc.boolean(),
                    s: fc.boolean(),
                    p: fc.boolean(),
                    c: fc.boolean(),
                    ac: fc.boolean(),
                }),
                async (initialAccumulator, initialFlags) => {
                    const code = `
            cma
            hlt
          `;

                    const initialCpuState = {
                        accumulator: initialAccumulator,
                        registers: {
                            bc: { high: 0x00, low: 0x00 },
                            de: { high: 0x00, low: 0x00 },
                            hl: { high: 0x00, low: 0x00 },
                        },
                        flags: initialFlags,
                        programCounter: 0x0000,
                        memory: {},
                    };

                    const expectedCpuState = {
                        ...initialCpuState,
                        accumulator: ~initialAccumulator & 0xFF, // Compute one's complement (ensure 8-bit wrap)
                        programCounter: 0x0002,
                    };

                    await runTest(code, initialCpuState, expectedCpuState);
                }
            ),
            {
                verbose: true,
                numRuns: 100, // Test with 100 random variations
            }
        );
    });
});
