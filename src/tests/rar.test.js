import { describe, test } from "vitest";
import { runTest } from "./test-utils";

describe("RAR Instruction Tests", () => {
    test("RAR: Rotate accumulator left with carry flag 0", async () => {
        const code = `
      mvi a, 0aah  ; A = 10101010
      rar
      hlt
    `;
        const expectedCpuState = {
            accumulator: 0x55, // A = 01010101 after rotation
            flags: {
                z: false,
                s: false,
                p: false,
                c: false,
            },
            programCounter: 0x0004,
        };
        await runTest(code, {}, expectedCpuState);
    });

    test("RAR: Rotate accumulator left with carry flag 1", async () => {
        const code = `
      mvi a, 0aah  ; A = 10101010
      stc          ; Set carry flag to 1
      rar
      hlt
    `;
        const expectedCpuState = {
            accumulator: 0xd5, // A = 11010101 after rotation
            flags: {
                z: false,
                s: false,
                p: false,
                c: false,
            },
            programCounter: 0x0005,
        };
        await runTest(code, {}, expectedCpuState);
    });
});