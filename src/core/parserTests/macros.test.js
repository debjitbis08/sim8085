import { describe, test, expect } from "vitest";
import { assembleProgram } from "../simulator.js";
import { expandMacros } from "../macroPreprocessor.js";

const bytes = (source) => assembleProgram(source).assembled.map((b) => b.data);

describe("MACRO and ENDM", () => {
    const TRUE = "TRUE MACRO WHERE\n JC WHERE\n ENDM\n";

    test("an invocation assembles as the body", () => {
        expect(bytes(`${TRUE} TRUE 1234H`)).toEqual([0xda, 0x34, 0x12]);
    });

    test("the definition itself emits nothing", () => {
        // The three lines of the definition must contribute no object code, so
        // the NOP after it is the whole program. (A source file with nothing
        // but a definition in it is not assemblable, for the same reason an
        // empty one is not.)
        expect(bytes(`${TRUE} NOP`)).toEqual([0x00]);
    });

    test("substitutes several parameters", () => {
        expect(bytes("M MACRO A1,A2\n MVI A,A1\n MVI B,A2\n ENDM\n M 1,2")).toEqual([0x3e, 1, 0x06, 2]);
    });

    test("takes no parameters at all", () => {
        expect(bytes("N MACRO\n NOP\n ENDM\n N\n N")).toEqual([0x00, 0x00]);
    });

    test("a label on the invocation lands on the first expanded line", () => {
        expect(bytes(`${TRUE}START: TRUE START`)).toEqual([0xda, 0x00, 0x00]);
    });

    test("substitutes whole identifiers only", () => {
        // The parameter X must not rewrite the symbol XY.
        expect(bytes("M MACRO X\n MVI A,X\n ENDM\nXY EQU 7\n M XY")).toEqual([0x3e, 7]);
    });

    test("a definition with no ENDM is an error", () => {
        expect(() => bytes("BAD MACRO X\n NOP\n")).toThrow(/no matching ENDM/);
    });

    test("a macro that invokes itself is an error rather than a hang", () => {
        expect(() => bytes("R MACRO\n R\n ENDM\n R")).toThrow(/nested/);
    });
});

describe("Macro expansion and source locations", () => {
    test("source with no macros is handed through untouched", () => {
        const source = "MVI A, 1\nNOP";
        expect(expandMacros(source)).toEqual({ text: source, lineMap: null });
    });

    test("locations still refer to the line the user wrote", () => {
        // The definition occupies three lines, so without the mapping the
        // invocation's object code would be attributed to line 1.
        const source = "TRUE MACRO WHERE\n JC WHERE\n ENDM\n TRUE 1234H";
        const { assembled } = assembleProgram(source);
        expect(assembled[0].location.start.line).toBe(4);
    });

    test("an error inside an expansion points at the invocation", () => {
        const source = "M MACRO X\n MVI A,X\n ENDM\n M UNDEFINED";
        expect(() => assembleProgram(source)).toThrow();
        try {
            assembleProgram(source);
        } catch (e) {
            expect(e.location.start.line).toBe(4);
        }
    });
});
