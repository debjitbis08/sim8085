import { describe, test } from 'vitest';
import * as fc from 'fast-check';
import { runTest } from './test-utils';

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