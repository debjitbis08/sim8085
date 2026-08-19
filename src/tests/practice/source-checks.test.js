import { describe, test, expect } from "vitest";
import { assembleProgram } from "../../core/simulator.js";
import { checkConstraints, mnemonicsUsed, normalizeConstraints } from "../../lib/practice/source-checks.js";
import { SpecError } from "../../lib/practice/spec.js";

const parse = (source) => {
    const { assembled, lines } = assembleProgram(source);
    return { assembled, lines };
};

const check = (source, constraints) =>
    checkConstraints(parse(source), normalizeConstraints(constraints)).map((d) => d.message);

describe("mnemonicsUsed", () => {
    test("reports instructions regardless of how the parser cases them", () => {
        // The assembler yields "mov" from one rule and "INX"/"HLT" from
        // others, so everything is normalized before comparison.
        const { lines } = parse("MOV A, M\nINX H\nHLT\n");
        expect(mnemonicsUsed(lines).map((m) => m.name)).toEqual(["MOV", "INX", "HLT"]);
    });

    test("is not fooled by comments or labels", () => {
        const { lines } = parse("; LDA 2000H would be wrong here\nLDA_LOOP: HLT\n");
        expect(mnemonicsUsed(lines).map((m) => m.name)).toEqual(["HLT"]);
    });

    test("includes directives, which authors expect to be constrainable", () => {
        const { lines } = parse("ORG 2000H\nHLT\nDB 1, 2\n");
        expect(mnemonicsUsed(lines).map((m) => m.name)).toEqual(["ORG", "HLT", "DB"]);
    });

    test("records the source line, so a violation can be pointed at", () => {
        const { lines } = parse("HLT\nLDA 2000H\nHLT\n");
        expect(mnemonicsUsed(lines).find((m) => m.name === "LDA").line).toBe(2);
    });
});

describe("checkConstraints", () => {
    test("passes a program that satisfies everything", () => {
        expect(
            check("LXI H, 2000H\nMOV A, M\nHLT\n", {
                mustUse: ["MOV"],
                mustNotUse: ["LDA"],
                maxBytes: 8,
                maxInstructions: 5,
            }),
        ).toEqual([]);
    });

    test("reports a required instruction that is missing", () => {
        expect(check("LDA 2000H\nHLT\n", { mustUse: ["MOV"] })).toEqual([
            "This exercise asks you to use MOV, but your program does not.",
        ]);
    });

    test("reports a forbidden instruction with its line", () => {
        expect(check("HLT\nLDA 2000H\nHLT\n", { mustNotUse: ["LDA"] })).toEqual([
            "This exercise asks you not to use LDA (line 2).",
        ]);
    });

    test("matches mnemonics case-insensitively in both directions", () => {
        expect(check("lda 2000h\nhlt\n", { mustNotUse: ["LDA"] })).toHaveLength(1);
        expect(check("LDA 2000H\nHLT\n", { mustNotUse: ["lda"] })).toHaveLength(1);
    });

    test("enforces a byte budget", () => {
        // LXI is 3 bytes, MOV 1, HLT 1 = 5.
        expect(check("LXI H, 2000H\nMOV A, M\nHLT\n", { maxBytes: 4 })).toEqual([
            "Your program should assemble to at most 4 bytes, but it takes 5.",
        ]);
        expect(check("LXI H, 2000H\nMOV A, M\nHLT\n", { maxBytes: 5 })).toEqual([]);
    });

    test("counts instructions but not directives", () => {
        // ORG and DB take no execution steps, so they are not instructions.
        expect(check("ORG 2000H\nMOV A, M\nHLT\nDB 1\n", { maxInstructions: 2 })).toEqual([]);
        expect(check("MOV A, M\nINX H\nHLT\n", { maxInstructions: 2 })).toEqual([
            "Your program should use at most 2 instructions, but it uses 3.",
        ]);
    });

    test("reports every violation at once", () => {
        expect(check("LDA 2000H\nHLT\n", { mustUse: ["MOV"], mustNotUse: ["LDA"], maxBytes: 1 })).toHaveLength(3);
    });

    test("no constraints means nothing to report", () => {
        expect(checkConstraints(parse("HLT\n"), null)).toEqual([]);
    });
});

describe("normalizeConstraints", () => {
    test("rejects authoring mistakes loudly", () => {
        expect(() => normalizeConstraints({ mustuse: ["MOV"] })).toThrow(/unknown key/);
        expect(() => normalizeConstraints({ mustUse: "MOV" })).toThrow(/expected an array/);
        expect(() => normalizeConstraints({ mustUse: [42] })).toThrow(/expected a mnemonic/);
        expect(() => normalizeConstraints({ maxBytes: 0 })).toThrow(/positive integer/);
        expect(() => normalizeConstraints({ maxBytes: 1.5 })).toThrow(/positive integer/);
        expect(() => normalizeConstraints({ mustUse: [42] })).toThrow(SpecError);
    });

    test("absent constraints normalize to null", () => {
        expect(normalizeConstraints(undefined)).toBe(null);
        expect(normalizeConstraints(null)).toBe(null);
    });
});
