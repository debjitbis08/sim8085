import { describe, test } from "vitest";
import { runTest } from "./test-utils";

describe("RAL Instruction Tests", () => {
    test("RAL: Rotate accumulator left with carry flag 0", async () => {
        const code = `
      mvi a, 0aah  ; A = 10101010
      ral
      hlt
    `;
        const expectedCpuState = {
            accumulator: 0x54, // A = 01010100 after rotation
            flags: {
                z: false,
                s: false,
                p: false,
                c: true, // Carry flag set because of the bit shifted out from A
            },
            programCounter: 0x0004,
        };
        await runTest(code, {}, expectedCpuState);
    });

    test("RAL: Rotate accumulator left with carry flag 1", async () => {
        const code = `
      mvi a, 0aah  ; A = 10101010
      stc          ; Set carry flag to 1
      ral
      hlt
    `;
        const expectedCpuState = {
            accumulator: 0x55, // A = 01010101 after rotation
            flags: {
                z: false,
                s: false,
                p: false,
                c: true,
            },
            programCounter: 0x0005,
        };
        await runTest(code, {}, expectedCpuState);
    });
});