import { describe, test, expect } from "vitest";
import { parse } from "../8085.pegjs";

describe("Assembler label handling", () => {
    test("missing colon on label triggers specific error", () => {
        const code = `
      MVI A, 00H
      NO_CARRY
      MVI B, 00H
    `;
        expect(() => parse(code)).toThrow(/Label missing ':'/);
    });
});
