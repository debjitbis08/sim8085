import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import { runTest, runAndGetState } from './test-utils';

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

// Worked example from the Intel 8080/8085 Assembly Language Programming Manual, Chapter 3.
describe('XTHL Instruction Manual Example', () => {
    // "Assume that the stack pointer register contains 10ADH; register H
    // contains OBH and L contains 3CH; and memory locations 10ADH and 10AEH
    // contain FOH and ODH, respectively." The manual's table shows H and L
    // becoming 0DH and F0H, memory becoming 3CH and 0BH, and notes that "the
    // stack pointer register remains unchanged".
    test('XTHL: exchanges HL with the two bytes on top of the stack', async () => {
        const result = await runAndGetState('lxi sp, 10ADH\nxthl\nhlt', {
            registers: { hl: { high: 0x0b, low: 0x3c } },
            memory: { 0x10ad: 0xf0, 0x10ae: 0x0d },
        });

        expect(result.registers.hl.high).toBe(0x0d);
        expect(result.registers.hl.low).toBe(0xf0);
        expect(result.memory[0x10ad]).toBe(0x3c);
        expect(result.memory[0x10ae]).toBe(0x0b);
        expect(result.stackPointer).toBe(0x10ad);
    });
});
