import { describe, test } from "vitest";
import * as fc from "fast-check";
import { runTest } from "./test-utils";
import { expectedSubtraction } from "./arithmetic-reference.js";

describe("SBI Instruction Tests", () => {
    test("SBI: Subtracts immediate data and carry from accumulator and updates flags", async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 0x00, max: 0xff }), // Random 8-bit accumulator value
                fc.integer({ min: 0x00, max: 0xff }), // Random 8-bit immediate value
                fc.boolean(), // Carry flag state (true or false)
                fc.record({
                    z: fc.boolean(),
                    s: fc.boolean(),
                    p: fc.boolean(),
                    c: fc.boolean(),
                    ac: fc.boolean(),
                }), // Random initial flag states
                async (accumulator, immediateValue, carryFlag, flags) => {
                    const carry = carryFlag ? 1 : 0; // Convert boolean carry flag to numeric
                    const totalSubtraction = immediateValue + carry;

                    // Perform the subtraction
                    const result = accumulator - totalSubtraction;

                    // Calculate flags
                    const zeroFlag = (result & 0xff) === 0;
                    const signFlag = (result & 0x80) !== 0;
                    const parityFlag =
                        (result & 0xff)
                            .toString(2)
                            .split("")
                            .filter((bit) => bit === "1").length %
                            2 ===
                        0;
                    const carryFlagResult = accumulator < totalSubtraction;

                    const expectedFlags = expectedSubtraction(accumulator, immediateValue, carry).flags;

                    const code = `
                      org 0x0000
                      sbi ${immediateValue}
                      hlt
                    `;

                    console.log(code);

                    // Define the initial state of the CPU
                    const initialCpuState = {
                        accumulator,
                        registers: {
                            bc: { high: 0x00, low: 0x00 },
                            de: { high: 0x00, low: 0x00 },
                            hl: { high: 0x00, low: 0x00 },
                        },
                        flags: { ...flags, c: carryFlag }, // Set the carry flag to the test-generated value
                    };

                    // Define the expected state of the CPU after execution
                    const expectedCpuState = {
                        ...initialCpuState,
                        accumulator: result & 0xff, // Result masked to 8 bits
                        flags: {
                            z: zeroFlag,
                            s: signFlag,
                            p: parityFlag,
                            c: carryFlagResult, // Carry flag indicates borrow
                            ac: expectedFlags.ac,
                        },
                        programCounter: 0x0003, // PC should increment by 2 after SBI (2-byte instruction)
                    };

                    await runTest(code, initialCpuState, expectedCpuState);
                },
            ),
            { verbose: true, numRuns: 100 }, // Run 100 variations for SBI instruction
        );
    });
});
