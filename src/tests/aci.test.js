import { describe, test } from "vitest";
import * as fc from "fast-check";
import { runTest } from "./test-utils";

describe("ACI Instruction Tests", () => {
    test("ACI: Adds immediate data and carry to accumulator, updates flags", async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 0x00, max: 0xff }), // Random 8-bit accumulator value
                fc.integer({ min: 0x00, max: 0xff }), // Random 8-bit immediate value
                fc.boolean(), // Carry flag
                async (accumulator, immediateValue, carryFlag) => {
                    const initialCarry = carryFlag ? 1 : 0; // Carry as 0 or 1
                    const expectedResult = accumulator + immediateValue + initialCarry;

                    // Calculate expected flags
                    const zeroFlag = (expectedResult & 0xff) === 0;
                    const signFlag = (expectedResult & 0x80) !== 0;
                    const parityFlag =
                        (expectedResult & 0xff)
                            .toString(2)
                            .split("")
                            .filter((bit) => bit === "1").length %
                            2 ===
                        0;
                    const resultCarryFlag = expectedResult > 0xff;
                    const auxCarryFlag = (accumulator & 0x0f) + (immediateValue & 0x0f) + initialCarry > 0x0f;

                    const code = `
                      org 0x0000
                      aci 0x${immediateValue.toString(16).padStart(2, "0")}
                      hlt
                    `;

                    // Define the initial state of the CPU
                    const initialCpuState = {
                        accumulator,
                        registers: {
                            bc: { high: 0x00, low: 0x00 },
                            de: { high: 0x00, low: 0x00 },
                            hl: { high: 0x00, low: 0x00 },
                        },
                        flags: {
                            z: false,
                            s: false,
                            p: false,
                            c: carryFlag,
                            ac: false,
                        },
                        programCounter: 0x0000, // Initial PC
                    };

                    // Define the expected state of the CPU after execution
                    const expectedCpuState = {
                        ...initialCpuState,
                        accumulator: expectedResult & 0xff, // Result masked to 8 bits
                        flags: {
                            z: zeroFlag,
                            s: signFlag,
                            p: parityFlag,
                            c: resultCarryFlag,
                            ac: auxCarryFlag,
                        },
                        programCounter: 0x0003, // PC should increment by 2 after ACI (2-byte instruction)
                    };

                    await runTest(code, initialCpuState, expectedCpuState);
                },
            ),
            { verbose: true, numRuns: 100 }, // Run 100 variations for the ACI instruction
        );
    });
});
