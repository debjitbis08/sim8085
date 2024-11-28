import { describe, test } from "vitest";
import * as fc from "fast-check";
import { runTest } from "./test-utils";

describe("INX Instruction Tests", () => {
    const registerPairs = ["B", "D", "H", "SP"];

    registerPairs.forEach((pair) => {
        test(`INX ${pair}: Increments the ${pair} register pair`, async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 0x0005, max: 0xfffe }), // Random 16-bit initial value for the register pair
                    fc.record({
                        z: fc.boolean(),
                        s: fc.boolean(),
                        p: fc.boolean(),
                        c: fc.boolean(),
                        ac: fc.boolean(),
                    }), // Random initial flag states
                    async (initialValue, flags) => {
                        const incrementedValue = (initialValue + 1) & 0xffff; // Wrap around to 16 bits if it overflows

                        const code = `
                          org 0x0000
                          ${pair === "SP" ? `lxi sp, ${initialValue}` : ""}
                          inx ${pair.toLowerCase()}
                          hlt
                        `;

                        // Define the initial state of the CPU
                        const initialCpuState = {
                            accumulator: 0x00, // Initial accumulator value
                            registers: {
                                bc:
                                    pair === "B"
                                        ? { high: (initialValue >> 8) & 0xff, low: initialValue & 0xff }
                                        : { high: 0, low: 0 },
                                de:
                                    pair === "D"
                                        ? { high: (initialValue >> 8) & 0xff, low: initialValue & 0xff }
                                        : { high: 0, low: 0 },
                                hl:
                                    pair === "H"
                                        ? { high: (initialValue >> 8) & 0xff, low: initialValue & 0xff }
                                        : { high: 0, low: 0 },
                            },
                            stackPointer: pair === "SP" ? initialValue : 0xffff,
                            flags, // Randomized flags from fast-check
                        };

                        // Define the expected state of the CPU after execution
                        const expectedCpuState = {
                            ...initialCpuState,
                            registers: {
                                ...initialCpuState.registers,
                                ...{
                                    bc:
                                        pair === "B"
                                            ? { high: (incrementedValue >> 8) & 0xff, low: incrementedValue & 0xff }
                                            : { high: 0, low: 0 },
                                    de:
                                        pair === "D"
                                            ? { high: (incrementedValue >> 8) & 0xff, low: incrementedValue & 0xff }
                                            : { high: 0, low: 0 },
                                    hl:
                                        pair === "H"
                                            ? { high: (incrementedValue >> 8) & 0xff, low: incrementedValue & 0xff }
                                            : { high: 0, low: 0 },
                                },
                            },
                            stackPointer: pair === "SP" ? incrementedValue : initialCpuState.stackPointer,
                            programCounter: pair === "SP" ? 5 : 2, // PC should increment by 1 after INX (1-byte instruction)
                        };

                        await runTest(code, initialCpuState, expectedCpuState);
                    },
                ),
                { verbose: true, numRuns: 100 }, // Run 100 variations for INX instruction
            );
        });
    });
});