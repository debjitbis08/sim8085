import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import { runTest, runAndGetState } from './test-utils';

describe('LDAX Instruction Property-Based Tests', () => {
    test('LDAX B: Property-based memory loading preserves flags', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate initial flag state
                fc.record({
                    z: fc.boolean(),
                    s: fc.boolean(),
                    p: fc.boolean(),
                    c: fc.boolean(),
                    ac: fc.boolean()
                }),
                // Memory value to load
                fc.integer({ min: 0x00, max: 0xFF }),
                // Address bytes
                fc.integer({ min: 0x20, max: 0xFF }),   // B register (high address byte)
                fc.integer({ min: 0x00, max: 0xFF }),   // C register (low address byte)
                async (initialFlags, memoryValue, highByte, lowByte) => {
                    const code = `
                      ; Set up BC with memory address
                      mvi b, ${highByte}
                      mvi c, ${lowByte}
                      
                      ; Load value from memory address pointed by BC
                      ldax b
                      hlt
                    `;

                    const expectedCpuState = {
                        accumulator: memoryValue,
                        registers: {
                            bc: { high: highByte, low: lowByte },
                        },
                        flags: initialFlags,  // LDAX should NOT modify flags
                        programCounter: 0x0006,
                        memory: {
                            [(highByte<<8) | lowByte]: memoryValue
                        }
                    };

                    await runTest(code, {
                        flags: initialFlags,
                        memory: {
                            [(highByte<<8) | lowByte]: memoryValue
                        }
                    }, expectedCpuState);
                }
            ),
            {
                verbose: true,
                numRuns: 1,
            }
        );
    });

    test('LDAX D: Property-based memory loading preserves flags', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate initial flag state
                fc.record({
                    z: fc.boolean(),
                    s: fc.boolean(),
                    p: fc.boolean(),
                    c: fc.boolean(),
                    ac: fc.boolean()
                }),
                // Memory value to load
                fc.integer({ min: 0x00, max: 0xFF }),
                // Address bytes
                fc.integer({ min: 0x20, max: 0xFF }),   // D register (high address byte)
                fc.integer({ min: 0x00, max: 0xFF }),   // E register (low address byte)
                async (initialFlags, memoryValue, highByte, lowByte) => {
                    const code = `
                      ; Set up DE with memory address
                      mvi d, ${highByte}
                      mvi e, ${lowByte}
                      
                      ; Load value from memory address pointed by DE
                      ldax d
                      hlt
                    `;
                    const expectedCpuState = {
                        accumulator: memoryValue,
                        registers: {
                            de: { high: highByte, low: lowByte },
                        },
                        flags: initialFlags,  // LDAX should NOT modify flags
                        programCounter: 0x0006,
                        memory: {
                            [(highByte<<8) | lowByte]: memoryValue
                        }
                    };

                    await runTest(code, {
                        flags: initialFlags,
                        memory: {
                            [(highByte<<8) | lowByte]: memoryValue
                        }
                    }, expectedCpuState);
                }
            ),
            {
                verbose: true,
                numRuns: 100
            }
        );
    });
});

// Worked example from the Intel 8080/8085 Assembly Language Programming Manual, Chapter 3.
describe('LDAX Instruction Manual Example', () => {
    // "Assume that register D contains 93H and register E contains BBH. The
    // following instruction loads the accumulator with the contents of memory
    // location 93BBH: LDAX D"
    test('LDAX D: loads the accumulator from 93BBH', async () => {
        const result = await runAndGetState('ldax d\nhlt', {
            registers: { de: { high: 0x93, low: 0xbb } },
            memory: { 0x93bb: 0x7e },
        });

        expect(result.accumulator).toBe(0x7e);
    });
});
