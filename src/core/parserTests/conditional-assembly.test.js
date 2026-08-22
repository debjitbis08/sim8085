import { describe, test, expect } from "vitest";
import { assembleProgram } from "../simulator.js";

const bytes = (source) => assembleProgram(source).assembled.map((b) => b.data);

describe("IF, ELSE and ENDIF", () => {
    test("assembles a true block", () => {
        expect(bytes("IF 1\nMVI A, 1\nENDIF")).toEqual([0x3e, 0x01]);
    });

    test("skips a false block entirely", () => {
        expect(bytes("IF 0\nMVI A, 1\nENDIF")).toEqual([]);
    });

    test("takes the ELSE arm when the condition is false", () => {
        expect(bytes("IF 0\nMVI A, 1\nELSE\nMVI A, 2\nENDIF")).toEqual([0x3e, 0x02]);
    });

    test("skips the ELSE arm when the condition is true", () => {
        expect(bytes("IF 1\nMVI A, 1\nELSE\nMVI A, 2\nENDIF")).toEqual([0x3e, 0x01]);
    });

    test("does not evaluate a nested IF inside a skipped block", () => {
        // UNDEFINED is never defined, which is only harmless because the outer
        // block is false and the inner condition is therefore not evaluated.
        expect(bytes("IF 0\nIF UNDEFINED\nMVI A, 1\nENDIF\nENDIF\nNOP")).toEqual([0x00]);
    });

    test("a skipped block does not move the location counter", () => {
        // HERE has to be 0000H, as though the skipped NOP were not written.
        expect(bytes("IF 0\nNOP\nENDIF\nHERE: NOP\nDW HERE")).toEqual([0x00, 0x00, 0x00]);
    });

    test("a symbol defined in a skipped block is not defined at all", () => {
        expect(() => bytes("IF 0\nX EQU 5\nENDIF\nMVI A, X")).toThrow();
    });

    // The condition is decided in the first pass, while addresses are still
    // being assigned, so it may only use symbols already defined above it.
    test("tests a symbol defined earlier", () => {
        const source = "WAITS SET 0\nIF 1-WAITS\nTIMER EQU 197\nENDIF\nIF WAITS\nTIMER EQU 237\nENDIF\nMVI A, TIMER";
        expect(bytes(source)).toEqual([0x3e, 197]);
    });

    test.each([
        ["IF 1\nNOP", "IF without a matching ENDIF"],
        ["ENDIF", "ENDIF without a matching IF"],
        ["ELSE", "ELSE without a matching IF"],
    ])("%s is an error", (source) => {
        expect(() => bytes(source)).toThrow();
    });
});
