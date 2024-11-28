import { describe, test } from "vitest";
import * as fc from "fast-check";
import { runTest } from "./test-utils";

describe("SUI Instruction Tests", () => {
    test("SUI: Subtracts immediate data from accumulator and updates flags", async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 0x00, max: 0xff }), // Random 8-bit accumulator value
                fc.integer({ min: 0x00, max: 0xff }), // Random 8-bit immediate value
                fc.record({
                    z: fc.boolean(),
                    s: fc.boolean(),
                    p: fc.boolean(),
                    c: fc.boolean(),
                    ac: fc.boolean(),
                }), // Random initial flag states
                async (accumulator, immediateValue, flags) => {
                    const result = accumulator - immediateValue;

                    // Calculate expected flags
                    const zeroFlag = (result & 0xff) === 0;
                    const signFlag = (result & 0x80) !== 0;
                    const parityFlag =
                        (result & 0xff)
                            .toString(2)
                            .split("")
                            .filter((bit) => bit === "1").length %
                            2 ===
                        0;
                    const carryFlag = accumulator < immediateValue;
                    const auxCarryFlag = (accumulator & 0x0f) + ((~immediateValue + 1) & 0x0f) > 0x0f;

                    const code = `
                      org 0x0000
                      sui ${immediateValue}
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
                        flags, // Randomized flags from fast-check
                    };

                    // Define the expected state of the CPU after execution
                    const expectedCpuState = {
                        ...initialCpuState,
                        accumulator: result & 0xff, // Result masked to 8 bits
                        flags: {
                            z: zeroFlag,
                            s: signFlag,
                            p: parityFlag,
                            c: carryFlag, // Carry flag indicates borrow
                            ac: auxCarryFlag, // Auxiliary carry flag indicates lower nibble borrow
                        },
                        programCounter: 0x0003, // PC should increment by 2 after SUI (2-byte instruction)
                    };

                    await runTest(code, initialCpuState, expectedCpuState);
                },
            ),
            { verbose: true, numRuns: 100 }, // Run 100 variations for SUI instruction
        );
    });
});
