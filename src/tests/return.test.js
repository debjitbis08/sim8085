import { describe, test } from "vitest";
import * as fc from "fast-check";
import { runTest } from "./test-utils.js";

// Define the condition functions for each instruction
const conditions = {
    RET: () => true, // Always true
    RC: (flags) => flags.c, // Carry flag set
    RNC: (flags) => !flags.c, // Carry flag not set
    RZ: (flags) => flags.z, // Zero flag set
    RNZ: (flags) => !flags.z, // Zero flag not set
    RP: (flags) => !flags.s, // Sign flag not set (positive)
    RM: (flags) => flags.s, // Sign flag set (negative)
    RPE: (flags) => flags.p, // Parity flag set (even parity)
    RPO: (flags) => !flags.p, // Parity flag not set (odd parity)
};

describe("Generalized Conditional Return Instruction Tests", () => {
    Object.entries(conditions).forEach(([instruction, condition]) => {
        test(`${instruction}: Conditional return based on flags`, async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 0x1000, max: 0xfffd }).chain((sp) =>
                        fc
                            .integer({ min: 0x0005, max: 0xfffe })
                            .filter((ra) => ra !== sp && ra !== sp + 1)
                            .map((ra) => [sp, ra]),
                    ),
                    fc.record({
                        z: fc.boolean(),
                        s: fc.boolean(),
                        p: fc.boolean(),
                        c: fc.boolean(),
                        ac: fc.boolean(),
                    }), // Random flag states
                    async ([stackPointer, returnAddress], flags) => {
                        const lowByte = returnAddress & 0xff;
                        const highByte = (returnAddress >> 8) & 0xff;

                        const code = `
                          org 0x0000
                          lxi sp, ${stackPointer}
                          ${instruction.toLowerCase()}
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
                            flags, // Randomized flags
                            programCounter: 0x0000, // Initial PC
                            memory: {
                                [stackPointer]: lowByte, // Low byte of return address
                                [stackPointer + 1]: highByte, // High byte of return address
                            },
                        };

                        const shouldReturn = condition(flags);
                        const expectedCpuState = {
                            ...initialCpuState,
                            stackPointer: shouldReturn ? stackPointer + 2 : stackPointer, // SP incremented if condition is true
                            programCounter: shouldReturn ? returnAddress + 1 : 0x0005, // PC updated if condition is true; otherwise, next instruction
                        };

                        await runTest(code, initialCpuState, expectedCpuState);
                    },
                ),
                { verbose: true, numRuns: 100 }, // Run 100 variations for each instruction
            );
        });
    });
});
