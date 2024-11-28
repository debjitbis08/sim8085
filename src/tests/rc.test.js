import { describe, test } from 'vitest';
import * as fc from 'fast-check';
import { runTest } from './test-utils';

describe('RC Instruction Property-Based Tests', () => {
    test('RC: Pops two bytes and updates program counter only if carry flag is set', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Max has to be 2 less than 0xffff because there cannot be an RC without a call
                fc.integer({ min: 0x1000, max: 0xFFFD }), // Stack pointer range (valid memory locations)
                fc.integer({ min: 0x0005, max: 0xFFFE }), // Random return address
                fc.boolean(), // Random carry flag state
                async (stackPointer, returnAddress, carryFlag) => {
                    const lowByte = returnAddress & 0xFF;
                    const highByte = (returnAddress >> 8) & 0xFF;

                    const code = `
                        org 0x0000
                        lxi sp, ${stackPointer}
                        rc
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
                        stackPointer: carryFlag ? stackPointer + 2 : stackPointer, // SP incremented only if carry flag is set
                        programCounter: carryFlag ? returnAddress + 1 : 0x0005, // PC set to return address if carry; otherwise, next instruction
                    };

                    await runTest(code, initialCpuState, expectedCpuState);
                }
            ),
            { verbose: true, numRuns: 100 } // Run 100 variations of stack pointer, return address, and carry flag
        );
    });
});
