import { describe, test } from "vitest";
import * as fc from "fast-check";
import { runTest } from "./test-utils";

describe("LXI Instruction Tests", () => {
    const registerPairs = ["B", "D", "H", "SP"];

    registerPairs.forEach((pair) => {
        test(`LXI ${pair}: Load immediate data into ${pair} register pair`, async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 0x0000, max: 0xffff }), // Random 16-bit immediate data
                    async (immediateValue) => {
                        const lowByte = immediateValue & 0xff;
                        const highByte = (immediateValue >> 8) & 0xff;

                        const code = `
                          org 0x0000
                          lxi ${pair.toLowerCase()}, 0x${immediateValue.toString(16).padStart(4, "0")}
                          hlt
                        `;

                        // Define the initial state of the CPU
                        const initialCpuState = {
                            accumulator: 0x00,
                            registers: {
                                bc: { high: 0x00, low: 0x00 },
                                de: { high: 0x00, low: 0x00 },
                                hl: { high: 0x00, low: 0x00 },
                            },
                            stackPointer: 0xffff,
                            flags: {
                                z: false,
                                s: false,
                                p: false,
                                c: false,
                                ac: false,
                            },
                            programCounter: 0x0000, // Initial PC
                        };

                        // Define the expected state of the CPU after execution
                        const expectedCpuState = {
                            ...initialCpuState,
                            registers: {
                                ...initialCpuState.registers,
                                ...(pair === "SP"
                                    ? {}
                                    : {
                                          [registerPairNames[pair.toLowerCase()]]: { high: highByte, low: lowByte },
                                      }),
                            },
                            stackPointer: pair === "SP" ? immediateValue : initialCpuState.stackPointer,
                            programCounter: 0x0004, // PC should increment by 3 after LXI (3-byte instruction)
                        };

                        await runTest(code, initialCpuState, expectedCpuState);
                    },
                ),
                { verbose: true, numRuns: 100 }, // Run 100 variations for each register pair
            );
        });
    });
});

const registerPairNames = {
    b: "bc",
    d: "de",
    h: "hl",
};