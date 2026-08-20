import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import { runTest, runAndGetState } from './test-utils';

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

// Worked example from the Intel 8080/8085 Assembly Language Programming Manual, Chapter 3.
describe('XCHG Instruction Manual Example', () => {
    // "Assume that the H and L registers contain 1234H, and the D and E
    // registers contain OABCDH. Following execution of the XCHG instruction,
    // H and L contain OABCDH, and D and E contain 1234H."
    test('XCHG: swaps HL and DE', async () => {
        const result = await runAndGetState('xchg\nhlt', {
            registers: { hl: { high: 0x12, low: 0x34 }, de: { high: 0xab, low: 0xcd } },
        });

        expect(result.registers.hl.high).toBe(0xab);
        expect(result.registers.hl.low).toBe(0xcd);
        expect(result.registers.de.high).toBe(0x12);
        expect(result.registers.de.low).toBe(0x34);
    });
});
