import { describe, test, expect } from "vitest";
import * as fc from "fast-check";
import { runTest, runAndGetState } from './test-utils';

describe("DCX Instruction Tests", () => {
    const registerPairs = ["B", "D", "H", "SP"];

    registerPairs.forEach((pair) => {
        test(`DCX ${pair}: Decrements the ${pair} register pair`, async () => {
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
                        const incrementedValue = (initialValue - 1) & 0xffff; // Wrap around to 16 bits if it overflows

                        const code = `
                          org 0x0000
                          ${pair === "SP" ? `lxi sp, ${initialValue}` : ""}
                          dcx ${pair.toLowerCase()}
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

// Worked example from the Intel 8080/8085 Assembly Language Programming Manual, Chapter 3, plus the undocumented K flag.
describe('DCX Instruction Manual Example', () => {
    // "Assume that the H and L registers contain the address 9800H when the
    // instruction DCX H is executed... to produce the value 97FFH."
    test('DCX H: 9800H decrements to 97FFH', async () => {
        const result = await runAndGetState('dcx h\nhlt', {
            registers: { hl: { high: 0x98, low: 0x00 } },
        });

        expect(result.registers.hl.high).toBe(0x97);
        expect(result.registers.hl.low).toBe(0xff);
    });

    // As with INX, the 8085 records the decrementer borrow in the undocumented
    // K flag. MAME's 8085 core sets K exactly when the pair wraps to FFFFH.
    test('DCX: K is set only when the register pair wraps to FFFFH', async () => {
        const wrapped = await runAndGetState('dcx b\nhlt', {
            registers: { bc: { high: 0x00, low: 0x00 } },
        });
        expect(wrapped.flags.k).toBe(true);

        const notWrapped = await runAndGetState('dcx b\nhlt', {
            registers: { bc: { high: 0x00, low: 0x02 } },
        });
        expect(notWrapped.flags.k).toBe(false);
    });
});
