import { describe, test, expect } from "vitest";
import * as fc from "fast-check";
import { runTest, runAndGetState } from './test-utils';

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

// Worked examples from the Intel 8080/8085 Assembly Language Programming Manual, Chapter 3, plus the undocumented K flag.
describe('INX Instruction Manual Examples', () => {
    // "Assume that the D and E registers contain the value 01FFH. The
    // instruction INX D increments the value to 0200H."
    test('INX D: 01FFH increments to 0200H', async () => {
        const result = await runAndGetState('inx d\nhlt', {
            registers: { de: { high: 0x01, low: 0xff } },
        });

        expect(result.registers.de.high).toBe(0x02);
        expect(result.registers.de.low).toBe(0x00);
    });

    // "If the stack pointer register contains the value OFFFFH, the
    // instruction INX SP increments the contents of SP to OOOOH."
    test('INX SP: FFFFH increments to 0000H', async () => {
        // A program starts with SP already at FFFFH.
        const result = await runAndGetState('inx sp\nhlt');

        expect(result.stackPointer).toBe(0x0000);
    });

    // Intel adds that "the INX instruction sets no flags to indicate this
    // condition", which holds for the five documented flags. The 8085 does
    // record the incrementer carry in the undocumented K flag; MAME's 8085
    // core sets K exactly when the pair wraps to 0000H.
    test('INX: K is set only when the register pair wraps to 0000H', async () => {
        const wrapped = await runAndGetState('inx b\nhlt', {
            registers: { bc: { high: 0xff, low: 0xff } },
        });
        expect(wrapped.flags.k).toBe(true);

        const notWrapped = await runAndGetState('inx b\nhlt', {
            registers: { bc: { high: 0x00, low: 0x01 } },
        });
        expect(notWrapped.flags.k).toBe(false);
    });
});
