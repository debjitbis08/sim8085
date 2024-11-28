import { describe, test } from 'vitest';
import * as fc from 'fast-check';
import { runTest } from './test-utils';

describe('INR Instruction Property-Based Tests', () => {
    test('INR: Increment all registers and memory with correct flags', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.constantFrom('a', 'b', 'c', 'd', 'e', 'h', 'l', 'm'), // Test all registers and memory
                fc.integer({ min: 0x00, max: 0xFF }), // Generate 8-bit values for the target
                fc.record({
                    z: fc.boolean(),
                    s: fc.boolean(),
                    p: fc.boolean(),
                    c: fc.boolean(),
                    ac: fc.boolean(),
                }), // Generate random initial flags
                async (target, initialValue, initialFlags) => {
                    const code = `
            inr ${target}
            hlt
          `;

                    // Calculate the expected results
                    const incrementedValue = (initialValue + 1) & 0xFF; // Increment and wrap to 8 bits
                    const zeroFlag = incrementedValue === 0;
                    const signFlag = (incrementedValue & 0x80) !== 0; // Check MSB for sign
                    const parityFlag =
                        incrementedValue
                            .toString(2)
                            .split('')
                            .filter((bit) => bit === '1').length %
                        2 ===
                        0; // Even parity
                    const auxCarryFlag = (initialValue & 0x0F) + 1 > 0x0F; // Carry from bit 3 to 4

                    // Initial CPU state setup
                    const initialCpuState = {
                        accumulator: target === 'a' ? initialValue : 0x00,
                        registers: {
                            bc: {
                                high: target === 'b' ? initialValue : 0x00,
                                low: target === 'c' ? initialValue : 0x00,
                            },
                            de: {
                                high: target === 'd' ? initialValue : 0x00,
                                low: target === 'e' ? initialValue : 0x00,
                            },
                            hl: {
                                high: target === 'h' ? initialValue : 0x12,
                                low: target === 'l' ? initialValue : 0x34,
                            },
                        },
                        flags: initialFlags, // Randomized initial flags
                        stackPointer: 0xFFFF,
                        programCounter: 0x0000,
                        memory: {
                            0x1234: target === 'm' ? initialValue : 0x00, // Memory at HL contains initial value if target is M
                        },
                    };

                    // Expected CPU state after INR
                    const expectedCpuState = {
                        ...initialCpuState,
                        accumulator: target === 'a' ? incrementedValue : initialCpuState.accumulator,
                        registers: {
                            bc: {
                                high: target === 'b' ? incrementedValue : initialCpuState.registers.bc.high,
                                low: target === 'c' ? incrementedValue : initialCpuState.registers.bc.low,
                            },
                            de: {
                                high: target === 'd' ? incrementedValue : initialCpuState.registers.de.high,
                                low: target === 'e' ? incrementedValue : initialCpuState.registers.de.low,
                            },
                            hl: {
                                high: target === 'h' ? incrementedValue : initialCpuState.registers.hl.high,
                                low: target === 'l' ? incrementedValue : initialCpuState.registers.hl.low,
                            },
                        },
                        memory: {
                            ...initialCpuState.memory,
                            0x1234: target === 'm' ? incrementedValue : initialCpuState.memory[0x1234],
                        },
                        flags: {
                            ...initialFlags,
                            z: zeroFlag,
                            s: signFlag,
                            p: parityFlag,
                            ac: auxCarryFlag,
                        },
                        programCounter: 0x0002, // PC advances to the next instruction
                    };

                    await runTest(code, initialCpuState, expectedCpuState);
                }
            ),
            { verbose: true, numRuns: 100 }
        );
    });
});
