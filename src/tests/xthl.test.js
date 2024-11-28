import { describe, test } from 'vitest';
import * as fc from 'fast-check';
import { runTest } from './test-utils';

describe('XTHL Instruction Property-Based Tests', () => {
    test('XTHL: Exchanges contents of H/L with top of stack without modifying flags', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate 8-bit values for H, L, SP contents, and flags
                fc.integer({ min: 0x00, max: 0xFF }), // High byte of HL (H)
                fc.integer({ min: 0x00, max: 0xFF }), // Low byte of HL (L)
                fc.integer({ min: 0x00, max: 0xFF }), // Top of stack (SP)
                fc.integer({ min: 0x00, max: 0xFF }), // Top of stack + 1 (SP + 1)
                fc.record({
                    z: fc.boolean(),
                    s: fc.boolean(),
                    p: fc.boolean(),
                    c: fc.boolean(),
                    ac: fc.boolean(),
                }), // Randomized initial flags
                fc.integer({ min: 0x1000, max: 0xFFFF - 1 }), // Stack pointer (SP)
                async (h, l, spLow, spHigh, initialFlags, stackPointer) => {
                    const code = `
                        lxi sp, ${stackPointer}
                        xthl
                        hlt
                    `;

                    const initialCpuState = {
                        accumulator: 0x00,
                        registers: {
                            bc: { high: 0x00, low: 0x00 },
                            de: { high: 0x00, low: 0x00 },
                            hl: { high: h, low: l }, // HL register contents
                        },
                        flags: initialFlags, // Randomized initial flags
                        stackPointer,
                        programCounter: 0x0000,
                        memory: {
                            [stackPointer]: spLow,      // Top of stack (low byte)
                            [stackPointer + 1]: spHigh, // Top of stack + 1 (high byte)
                        },
                    };

                    const expectedCpuState = {
                        ...initialCpuState,
                        registers: {
                            ...initialCpuState.registers,
                            hl: { high: spHigh, low: spLow }, // HL gets the stack's top values
                        },
                        memory: {
                            ...initialCpuState.memory,
                            [stackPointer]: l,      // Stack top gets L (low byte of HL)
                            [stackPointer + 1]: h,  // Stack top + 1 gets H (high byte of HL)
                        },
                        flags: initialFlags, // Flags should remain unchanged
                        programCounter: 0x0005, // PC advances to the next instruction
                    };

                    await runTest(code, initialCpuState, expectedCpuState);
                }
            ),
            { verbose: true, numRuns: 100 }
        );
    });
});
