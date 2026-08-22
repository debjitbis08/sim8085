import { describe, test, expect } from "vitest";
import { assembleProgram } from "../simulator.js";

// Assembles one line and returns its object code.
const bytes = (source) => assembleProgram(source).assembled.map((b) => b.data);
// The operand of a two-byte instruction, i.e. the value the expression produced.
const operand = (expression) => bytes(`MVI A, ${expression}`)[1];

describe("Expression operators", () => {
    test.each([
        ["0F0H AND 3FH", 0x30],
        ["0F0H OR 0FH", 0xff],
        ["0FFH XOR 0F0H", 0x0f],
        ["4 SHR 1", 2],
        ["1 SHL 2", 4],
        ["7 MOD 4", 3],
        ["HIGH 1234H", 0x12],
        ["LOW 1234H", 0x34],
    ])("%s is %i", (expression, expected) => {
        expect(operand(expression)).toBe(expected);
    });

    test("NOT complements sixteen bits", () => {
        // ASM80's NOT is a 16-bit ones complement, so NOT 0FFH is 0FF00H.
        expect(bytes("LXI H, NOT 0FFH").slice(1)).toEqual([0x00, 0xff]);
    });

    // SHR and SHL previously parsed only inside parentheses: a numeric literal
    // or a label matched first and the shift rule was never reached, so
    // "RAMST SHR 8" was a syntax error while "(RAMST SHR 8)" worked.
    test("shifts do not need parentheses", () => {
        expect(operand("4 SHR 1")).toBe(operand("(4 SHR 1)"));
    });
});

describe("Expression precedence and associativity", () => {
    test.each([
        // Loosest binding first: OR/XOR, AND, NOT, +/-, then * / MOD SHL SHR.
        ["1+2*3", 7],
        ["2 SHL 1 + 1", 5],
        ["(4 SHR 1) OR 8", 10],
        ["1 OR 6 AND 3", 3],
        ["0FH AND 3 OR 8", 11],
    ])("%s is %i", (expression, expected) => {
        expect(operand(expression)).toBe(expected);
    });

    // These folded right to left before, making 10-3-2 into 10-(3-2).
    test.each([
        ["10-3-2", 5],
        ["20/2/5", 2],
        ["1+2-3+4", 4],
    ])("%s is %i, folding left to right", (expression, expected) => {
        expect(operand(expression)).toBe(expected);
    });
});

describe("Operator words against symbol names", () => {
    // The word operators require whitespace on both sides, which is what keeps
    // a symbol whose name merely starts with one from being misread.
    test.each(["ANDY", "ORG1", "NOTE", "HIGHER", "LOWEST", "SHRUG", "MODE"])(
        "%s is a label, not an operator",
        (name) => {
            expect(bytes(`JMP ${name}\n${name}: NOP`)).toEqual([0xc3, 0x03, 0x00, 0x00]);
        },
    );

    // A hex literal is written with a leading digit, so a name like AHa stays a
    // label rather than being read as 0Ah with a stray character after it.
    test("a label that looks like a hex literal stays a label", () => {
        expect(bytes("JMP AHa\nAHa: NOP")).toEqual([0xc3, 0x03, 0x00, 0x00]);
    });
});

describe("The location counter", () => {
    test.each([
        ["", 0],
        ["NOP\n", 1],
        ["NOP\nNOP\n", 2],
        ["ORG 10H\nNOP\n", 0x11],
    ])("$ after %j is %i", (prefix, expected) => {
        expect(bytes(`${prefix}HERE EQU $\nMVI A, HERE`).slice(-1)[0]).toBe(expected);
    });

    test("measures the size of a table", () => {
        // The idiom the SDK-85 monitor uses to count a table's entries.
        expect(bytes("TBL: DB 1,2,3\nN EQU $-TBL\nMVI A, N").slice(-1)[0]).toBe(3);
    });
});

describe("An instruction in parentheses", () => {
    // ASM80 lets an operandless instruction stand for its opcode byte, which
    // the SDK-85 monitor uses to test a fetched byte against DI and EI.
    test.each([
        ["(DI)", 0xf3],
        ["(EI)", 0xfb],
        ["(NOP)", 0x00],
        ["(XCHG)", 0xeb],
    ])("CPI %s compares against %i", (expression, expected) => {
        expect(bytes(`CPI ${expression}`)).toEqual([0xfe, expected]);
    });

    test("a parenthesised label is still a label", () => {
        expect(bytes("CPI (LBL)\nLBL: NOP")).toEqual([0xfe, 0x02, 0x00]);
    });
});

describe("A label alone on its line", () => {
    test("names the current address when followed by an EQU", () => {
        // opWithLabel binds a label to the instruction below it, but an EQU is
        // not an instruction, so this needs a rule of its own.
        expect(bytes("NOP\nHERE:\nN EQU $\nMVI A, N")).toEqual([0x00, 0x3e, 0x01]);
    });

    test("names the current address when followed by a comment", () => {
        expect(bytes("NOP\nHERE:   ; nothing here\nDW HERE")).toEqual([0x00, 0x01, 0x00]);
    });
});
