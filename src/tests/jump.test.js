import { describe, test } from 'vitest';
import * as fc from 'fast-check';
import { runTest } from './test-utils';

// Define the condition functions for each jump instruction
const conditions = {
    JMP: () => true, // Always jump
    JC: (flags) => flags.c, // Jump if carry flag set
    JNC: (flags) => !flags.c, // Jump if carry flag not set
    JZ: (flags) => flags.z, // Jump if zero flag set
    JNZ: (flags) => !flags.z, // Jump if zero flag not set
    JM: (flags) => flags.s, // Jump if minus (sign flag set)
    JP: (flags) => !flags.s, // Jump if positive (sign flag not set)
    JPE: (flags) => flags.p, // Jump if parity even
    JPO: (flags) => !flags.p, // Jump if parity odd
};

describe('Generalized Jump Instruction Tests', () => {
    Object.entries(conditions).forEach(([instruction, condition]) => {
        test(`${instruction}: Conditional jump based on flags`, async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 0x1000, max: 0xFFFD }), // Program counter range (valid memory locations)
                    fc.integer({ min: 0x0005, max: 0xFFFE }), // Random target address
                    fc.record({
                        z: fc.boolean(),
                        s: fc.boolean(),
                        p: fc.boolean(),
                        c: fc.boolean(),
                        ac: fc.boolean(),
                    }), // Random flag states
                    async (programCounter, targetAddress, flags) => {
                        const lowByte = targetAddress & 0xFF;
                        const highByte = (targetAddress >> 8) & 0xFF;

                        const code = `
                          org 0x0000
                          ${instruction.toLowerCase()} ${targetAddress}
                          hlt
                          org ${targetAddress}
                          hlt
                        `;

                        console.log(code);

                        const initialCpuState = {
                            accumulator: 0x00,
                            registers: {
                                bc: { high: 0x00, low: 0x00 },
                                de: { high: 0x00, low: 0x00 },
                            },
                            flags, // Randomized flags
                            programCounter: 0x0000, // Initial PC
                        };

                        const shouldJump = condition(flags);
                        const expectedCpuState = {
                            ...initialCpuState,
                            programCounter: shouldJump ? targetAddress + 1 : 4, // Jump if condition is true, otherwise increment PC by 3
                        };

                        await runTest(code, initialCpuState, expectedCpuState);
                    }
                ),
                { verbose: true, numRuns: 100 } // Run 100 variations for each instruction
            );
        });
    });

    Object.entries(conditions).forEach(([instruction, condition]) => {
        test(`${instruction}: Conditional jump with dynamically generated labels`, async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 0x1000, max: 0xFFFD }), // Program counter range (valid memory locations)
                    fc.record({
                        z: fc.boolean(),
                        s: fc.boolean(),
                        p: fc.boolean(),
                        c: fc.boolean(),
                        ac: fc.boolean(),
                    }), // Random flag states
                    fc.stringMatching(/^[a-zA-Z?@][a-zA-Z0-9]{0,5}$/),
                    async (targetAddress, flags, labelName) => {
                        const code = `
                          org 0x0000
                          ${instruction.toLowerCase()} ${labelName}
                          hlt
                          org ${targetAddress}
                          ${labelName}:
                          hlt
                        `;

                        const initialCpuState = {
                            accumulator: 0x00,
                            registers: {
                                bc: { high: 0x00, low: 0x00 },
                                de: { high: 0x00, low: 0x00 },
                            },
                            flags, // Randomized flags
                            programCounter: 0x0000, // Initial PC
                        };

                        const shouldJump = condition(flags);
                        const expectedCpuState = {
                            ...initialCpuState,
                            programCounter: shouldJump ? targetAddress + 1 : 4, // Jump if condition is true, otherwise increment PC by 3
                        };

                        await runTest(code, initialCpuState, expectedCpuState);
                    }
                ),
                { verbose: true, numRuns: 100 } // Run 100 variations for each instruction
            );
        });
    });
});
