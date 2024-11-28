import { describe, test } from 'vitest';
import * as fc from 'fast-check';
import { runTest } from './test-utils';

describe('RNZ Instruction Property-Based Tests', () => {
    test('RNZ: Pops two bytes and updates program counter only if zero flag is not set', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Max has to be 2 less than 0xffff because there cannot be an RNZ without a call
                fc.integer({ min: 0x1000, max: 0xFFFD }), // Stack pointer range (valid memory locations)
                fc.integer({ min: 0x0005, max: 0xFFFE }), // Random return address
                fc.boolean(), // Random zero flag state
                async (stackPointer, returnAddress, zeroFlag) => {
                    const lowByte = returnAddress & 0xFF;
                    const highByte = (returnAddress >> 8) & 0xFF;

                    const code = `
                        org 0x0000
                        lxi sp, ${stackPointer}
                        rnz
                        hlt
                        org ${returnAddress}
                        hlt
                    `;

                    const initialCpuState = {
                        accumulator: 0x00,
                        registers: {
                            bc: { high: 0x00, low: 0x00 },
                            de: { high: 0x00, low: 0x00 },
                        },
                        flags: {
                            z: zeroFlag, // Randomized zero flag state
                            s: false,
                            p: false,
                            c: false,
                            ac: false,
                        },
                        programCounter: 0x0000, // Initial PC
                        memory: {
                            [stackPointer]: lowByte, // Low byte of return address
                            [stackPointer + 1]: highByte, // High byte of return address
                        },
                    };

                    const expectedCpuState = {
                        ...initialCpuState,
                        stackPointer: zeroFlag ? stackPointer : stackPointer + 2, // SP incremented only if zero flag is not set
                        programCounter: zeroFlag ? 0x0005 : returnAddress + 1, // PC set to return address if not zero; otherwise, next instruction
                    };

                    await runTest(code, initialCpuState, expectedCpuState);
                }
            ),
            { verbose: true, numRuns: 100 } // Run 100 variations of stack pointer, return address, and zero flag
        );
    });
});
