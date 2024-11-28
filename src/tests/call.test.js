import { describe, test } from "vitest";
import * as fc from "fast-check";
import { runTest } from "./test-utils";

// Define the condition functions for each CALL instruction
const callConditions = {
    CALL: () => true, // Always call
    CC: (flags) => flags.c, // Call if carry flag set
    CNC: (flags) => !flags.c, // Call if carry flag not set
    CZ: (flags) => flags.z, // Call if zero flag set
    CNZ: (flags) => !flags.z, // Call if zero flag not set
    CM: (flags) => flags.s, // Call if minus (sign flag set)
    CP: (flags) => !flags.s, // Call if positive (sign flag not set)
    CPE: (flags) => flags.p, // Call if parity even
    CPO: (flags) => !flags.p, // Call if parity odd
};

describe("CALL and RET Instructions with Dynamically Generated Labels Tests", () => {
    Object.entries(callConditions).forEach(([instruction, condition]) => {
        test(`${instruction}: Conditional call and return with dynamically generated labels`, async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        z: fc.boolean(),
                        s: fc.boolean(),
                        p: fc.boolean(),
                        c: fc.boolean(),
                        ac: fc.boolean(),
                    }), // Random flag states
                    fc.stringMatching(/^[a-zA-Z?@][a-zA-Z0-9]{0,5}$/),
                    async (flags, labelName) => {
                        const code = `
                            org 0x0000
                            ${instruction} ${labelName}
                            hlt

                            org 0x1000
                            ${labelName}:
                                pop b
                                dcx sp
                                dcx sp
                                ret
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

                        const shouldCall = condition(flags);

                        await runTest(code, initialCpuState, {
                            registers: {
                                bc: shouldCall
                                    ? {
                                          high: 0,
                                          low: 3,
                                      }
                                    : { high: 0, low: 0 },
                            },
                            programCounter: 4,
                        });
                    },
                ),
                { verbose: true, numRuns: 100 }, // Run 100 variations for each instruction
            );
        });
    });
});