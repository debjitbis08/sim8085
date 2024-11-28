import { describe, test } from 'vitest';
import * as fc from 'fast-check';
import { runTest } from './test-utils';

describe('XCHG Instruction Property-Based Tests', () => {
    test('XCHG: Exchanges contents of H/L with D/E without modifying flags', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate 8-bit values for H, L, D, and E
                fc.integer({ min: 0x00, max: 0xFF }), // High byte of HL
                fc.integer({ min: 0x00, max: 0xFF }), // Low byte of HL
                fc.integer({ min: 0x00, max: 0xFF }), // High byte of DE
                fc.integer({ min: 0x00, max: 0xFF }), // Low byte of DE
                fc.record({
                    z: fc.boolean(),
                    s: fc.boolean(),
                    p: fc.boolean(),
                    c: fc.boolean(),
                    ac: fc.boolean(),
                }), // Randomized initial flags
                async (h, l, d, e, initialFlags) => {
                    const code = `
                        xchg
                        hlt
                    `;

                    const initialCpuState = {
                        accumulator: 0x00,
                        registers: {
                            bc: { high: 0x00, low: 0x00 },
                            de: { high: d, low: e },
                            hl: { high: h, low: l },
                        },
                        flags: initialFlags, // Randomized initial flags
                        programCounter: 0x0000,
                        memory: {},
                    };

                    const expectedCpuState = {
                        ...initialCpuState,
                        registers: {
                            ...initialCpuState.registers,
                            de: { high: h, low: l }, // D = H, E = L
                            hl: { high: d, low: e }, // H = D, L = E
                        },
                        flags: initialFlags, // Flags should remain unchanged
                        programCounter: 0x0002, // PC advances to the next instruction
                    };

                    await runTest(code, initialCpuState, expectedCpuState);
                }
            ),
            { verbose: true, numRuns: 100 }
        );
    });
});
