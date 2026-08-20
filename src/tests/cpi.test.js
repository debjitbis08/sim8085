import { describe, test, expect } from "vitest";
import * as fc from "fast-check";
import { runTest, runAndGetState, setupSimulator } from "./test-utils";

describe("CPI Instruction Tests", () => {
    test("CPI: Compares immediate data with accumulator and sets zero and carry flags", async () => {
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
                    const zeroFlag = result === 0;
                    const carryFlag = accumulator < immediateValue;

                    const code = `
                      org 0x0000
                      cpi ${immediateValue}
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
                        flags: {
                            z: zeroFlag,
                            s: (result & 0x80) !== 0, // Sign flag based on the most significant bit of the result
                            p:
                                (result & 0xff)
                                    .toString(2)
                                    .split("")
                                    .filter((bit) => bit === "1").length %
                                    2 ===
                                0, // Parity flag based on even/odd 1 bits
                            c: carryFlag, // Carry flag based on the comparison
                            ac: false, // Auxiliary carry flag is reset
                        },
                        programCounter: 0x0003, // PC should increment by 2 after CPI (2-byte instruction)
                    };

                    await runTest(code, initialCpuState, expectedCpuState);
                },
            ),
            { verbose: true, numRuns: 100 }, // Run 100 variations for CPI instruction
        );
    });
});

// Worked example from the Intel 8080/8085 Assembly Language Programming Manual,
// Chapter 3.
describe('CPI Instruction Manual Example', () => {
    // "The instruction CPI 'C' compares the contents of the accumulator to the
    // letter C (43H)."
    test("CPI 'C': assembles to FE 43 and compares against 43H", async () => {
        const { assembled } = await setupSimulator("cpi 'C'\nhlt");
        const bytes = assembled.filter((a) => a.kind !== 'label').map((a) => a.data);
        expect(bytes.slice(0, 2)).toEqual([0xfe, 0x43]);

        // Equality is what the zero flag reports.
        const equal = await runAndGetState("cpi 'C'\nhlt", { accumulator: 0x43 });
        expect(equal.flags.z).toBe(true);

        const notEqual = await runAndGetState("cpi 'C'\nhlt", { accumulator: 0x42 });
        expect(notEqual.flags.z).toBe(false);
    });
});
