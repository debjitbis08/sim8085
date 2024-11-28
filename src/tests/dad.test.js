import { describe, test } from "vitest";
import * as fc from "fast-check";
import { runTest } from "./test-utils";

describe("DAD Instruction Tests", () => {
    const registerPairs = ["B", "D", "H", "SP"];

    registerPairs.forEach((pair) => {
        test(`DAD ${pair}: Adds the ${pair} register pair to HL and updates carry`, async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 0x0000, max: 0xffff }), // Random 16-bit value for HL
                    fc.integer({ min: 0x0000, max: 0xffff }), // Random 16-bit value for the specified register pair
                    fc.record({
                        z: fc.boolean(),
                        s: fc.boolean(),
                        p: fc.boolean(),
                        c: fc.boolean(),
                        ac: fc.boolean(),
                    }), // Random initial flag states
                    async (hlValue, pairValue, flags) => {
                        const result = pair === "H" ? hlValue + hlValue : hlValue + pairValue;

                        // Calculate carry flag
                        const carryFlag = result > 0xffff;

                        const code = `
                          org 0x0000
                          ${pair === "SP" ? `lxi sp, ${pairValue}` : ""}
                          dad ${pair.toLowerCase()}
                          hlt
                        `;

                        // Define the initial state of the CPU
                        const initialCpuState = {
                            accumulator: 0x00, // Initial accumulator value
                            registers: {
                                bc:
                                    pair === "B"
                                        ? { high: (pairValue >> 8) & 0xff, low: pairValue & 0xff }
                                        : { high: 0, low: 0 },
                                de:
                                    pair === "D"
                                        ? { high: (pairValue >> 8) & 0xff, low: pairValue & 0xff }
                                        : { high: 0, low: 0 },
                                hl: { high: (hlValue >> 8) & 0xff, low: hlValue & 0xff },
                            },
                            stackPointer: pair === "SP" ? pairValue : 0xffff,
                            flags, // Randomized flags from fast-check
                        };

                        // Define the expected state of the CPU after execution
                        const expectedCpuState = {
                            ...initialCpuState,
                            registers: {
                                ...initialCpuState.registers,
                                hl: {
                                    high: (result >> 8) & 0xff,
                                    low: result & 0xff,
                                },
                            },
                            flags: {
                                ...initialCpuState.flags,
                                c: carryFlag, // Carry flag updated
                            },
                            programCounter: pair === "SP" ? 5 : 2,
                        };

                        await runTest(code, initialCpuState, expectedCpuState);
                    },
                ),
                { verbose: true, numRuns: 100 }, // Run 100 variations for DAD instruction
            );
        });
    });
});
