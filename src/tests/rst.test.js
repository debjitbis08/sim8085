import { describe, expect, test } from "vitest";
import { runAndGetState } from "./test-utils.js";

describe("RST instruction semantics", () => {
    test.each([0, 1, 2, 3, 4, 5, 6, 7])("RST %i pushes the return address and selects its vector", async (restart) => {
        const vector = restart * 8;
        const result = await runAndGetState(`org 0100H\nrst ${restart}\nhlt\norg ${vector.toString(16)}H\nhlt`, {
            programCounter: 0x0100,
        });

        expect(result.programCounter).toBe(vector + 1);
        expect(result.stackPointer).toBe(0xfffd);
        expect(result.memory[0xfffd]).toBe(0x01);
        expect(result.memory[0xfffe]).toBe(0x01);
    });
});
