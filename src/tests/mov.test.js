import { describe, test } from "vitest";
import * as fc from "fast-check";
import { runTest } from "./test-utils.js";

describe("MOV Instruction Tests: Register to Register", () => {
    const registers = ["A", "B", "C", "D", "E", "H", "L"];

    registers.forEach((dest) => {
        registers.forEach((src) => {
            if (dest !== src) {
                test(`MOV ${dest}, ${src}: Copy data from ${src} to ${dest}`, async () => {
                    await fc.assert(
                        fc.asyncProperty(
                            fc.integer({ min: 0x00, max: 0xff }), // Random 8-bit data for the source register
                            async (srcValue) => {
                                const code = `
                                  org 0x0000
                                  mov ${dest.toLowerCase()}, ${src.toLowerCase()}
                                  hlt
                                `;

                                const initialCpuState = {
                                    accumulator: src === "A" ? srcValue : 0x00,
                                    registers: {
                                        bc: {
                                            high: src === "B" ? srcValue : 0x00,
                                            low: src === "C" ? srcValue : 0x00,
                                        },
                                        de: {
                                            high: src === "D" ? srcValue : 0x00,
                                            low: src === "E" ? srcValue : 0x00,
                                        },
                                        hl: {
                                            high: src === "H" ? srcValue : 0x00,
                                            low: src === "L" ? srcValue : 0x00,
                                        },
                                    },
                                };

                                const expectedCpuState = {
                                    ...initialCpuState,
                                    accumulator: src === "A" || dest === "A" ? srcValue : initialCpuState.accumulator,
                                    registers: {
                                        bc: {
                                            high: src === "B" || dest === "B" ? srcValue : 0x00,
                                            low: src === "C" || dest === "C" ? srcValue : 0x00,
                                        },
                                        de: {
                                            high: src === "D" || dest === "D" ? srcValue : 0x00,
                                            low: src === "E" || dest === "E" ? srcValue : 0x00,
                                        },
                                        hl: {
                                            high: src === "H" || dest === "H" ? srcValue : 0x00,
                                            low: src === "L" || dest === "L" ? srcValue : 0x00,
                                        },
                                    },
                                    programCounter: 0x0002,
                                };

                                await runTest(code, initialCpuState, expectedCpuState);
                            },
                        ),
                        { verbose: true, numRuns: 100 }, // Run 100 variations for each register pair
                    );
                });
            }
        });
    });
});
