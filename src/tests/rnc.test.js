import { describe, test } from 'vitest';
import * as fc from 'fast-check';
import { runTest } from './test-utils';

describe('RNC Instruction Property-Based Tests', () => {
    test('RNC: Pops two bytes and updates program counter only if carry flag is not set', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Max has to be 2 less than 0xffff because there cannot be an RNC without a call
                fc.integer({ min: 0x1000, max: 0xFFFD }), // Stack pointer range (valid memory locations)
                fc.integer({ min: 0x0005, max: 0xFFFE }), // Random return address
                fc.boolean(), // Random carry flag state
                async (stackPointer, returnAddress, carryFlag) => {
                    const lowByte = returnAddress & 0xFF;
                    const highByte = (returnAddress >> 8) & 0xFF;

                    const code = `
                        org 0x0000
                        lxi sp, ${stackPointer}
                        rnc
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
                            z: false,
                            s: false,
                            p: false,
                            c: carryFlag, // Randomized carry flag state
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
                        stackPointer: carryFlag ? stackPointer : stackPointer + 2, // SP incremented only if carry flag is not set
                        programCounter: carryFlag ? 0x0005 : returnAddress + 1, // PC set to return address if no carry; otherwise, next instruction
                    };

                    await runTest(code, initialCpuState, expectedCpuState);
                }
            ),
            { verbose: true, numRuns: 100 } // Run 100 variations of stack pointer, return address, and carry flag
        );
    });
});
