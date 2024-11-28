import { describe, test } from "vitest";
import * as fc from "fast-check";
import { runTest } from "./test-utils";

describe("DCR Instruction Property-Based Tests", () => {
    test("DCR: Decrement all registers and memory with correct flags, preserving carry flag", async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.constantFrom("a", "b", "c", "d", "e", "h", "l", "m"), // Test all registers and memory
                fc.integer({ min: 0x00, max: 0xff }), // Generate 8-bit values for the target
                fc.record({
                    z: fc.boolean(),
                    s: fc.boolean(),
                    p: fc.boolean(),
                    c: fc.boolean(),
                    ac: fc.boolean(),
                }), // Generate random initial flags
                fc.integer({ min: 0x1000, max: 0xffff - 1 }), // Stack pointer (SP)
                async (target, initialValue, initialFlags, stackPointer) => {
                    const code = `
                        dcr ${target}
                        hlt
                    `;

                    // Calculate the expected results
                    const decrementedValue = (initialValue - 1) & 0xff; // Decrement and wrap to 8 bits
                    const zeroFlag = decrementedValue === 0;
                    const signFlag = (decrementedValue & 0x80) !== 0; // Check MSB for sign
                    const parityFlag =
                        decrementedValue
                            .toString(2)
                            .split("")
                            .filter((bit) => bit === "1").length %
                            2 ===
                        0; // Even parity
                    const auxCarryFlag = (initialValue & 0xf) + ((~1 + 1) & 0xf) > 0xf;

                    // Initial CPU state setup
                    const initialCpuState = {
                        accumulator: target === "a" ? initialValue : 0x00,
                        registers: {
                            bc: {
                                high: target === "b" ? initialValue : 0x00,
                                low: target === "c" ? initialValue : 0x00,
                            },
                            de: {
                                high: target === "d" ? initialValue : 0x00,
                                low: target === "e" ? initialValue : 0x00,
                            },
                            hl: {
                                high: target === "h" ? initialValue : 0x12,
                                low: target === "l" ? initialValue : 0x34,
                            },
                        },
                        flags: initialFlags, // Randomized initial flags
                        memory: {
                            0x1234: target === "m" ? initialValue : 0x00, // Memory at HL contains initial value if target is M
                        },
                    };

                    // Expected CPU state after DCR
                    const expectedCpuState = {
                        ...initialCpuState,
                        accumulator: target === "a" ? decrementedValue : initialCpuState.accumulator,
                        registers: {
                            bc: {
                                high: target === "b" ? decrementedValue : initialCpuState.registers.bc.high,
                                low: target === "c" ? decrementedValue : initialCpuState.registers.bc.low,
                            },
                            de: {
                                high: target === "d" ? decrementedValue : initialCpuState.registers.de.high,
                                low: target === "e" ? decrementedValue : initialCpuState.registers.de.low,
                            },
                            hl: {
                                high: target === "h" ? decrementedValue : initialCpuState.registers.hl.high,
                                low: target === "l" ? decrementedValue : initialCpuState.registers.hl.low,
                            },
                        },
                        memory: {
                            ...initialCpuState.memory,
                            0x1234: target === "m" ? decrementedValue : initialCpuState.memory[0x1234],
                        },
                        flags: {
                            ...initialFlags,
                            z: zeroFlag,
                            s: signFlag,
                            p: parityFlag,
                            ac: auxCarryFlag,
                        },
                        programCounter: 0x0002, // PC advances to the next instruction
                    };

                    await runTest(code, initialCpuState, expectedCpuState);
                },
            ),
            { verbose: true, numRuns: 100 },
        );
    });
});