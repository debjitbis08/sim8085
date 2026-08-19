import { describe, test, expect } from "vitest";
import { canAccess, seal, unseal } from "../../lib/practice/access.js";

describe("canAccess", () => {
    test("free problems are open to everyone", () => {
        expect(canAccess("free", "FREE")).toBe(true);
        expect(canAccess("free", "PLUS")).toBe(true);
        expect(canAccess("free", null)).toBe(true);
    });

    test("paid problems need an active Plus tier", () => {
        expect(canAccess("plus", "PLUS")).toBe(true);
        expect(canAccess("plus", "FREE")).toBe(false);
        expect(canAccess("plus", null)).toBe(false);
        expect(canAccess("plus", undefined)).toBe(false);
    });

    test("an unrecognised tier does not open a paid problem", () => {
        // Fail closed: a tier string we do not know about is not Plus.
        expect(canAccess("plus", "TRIAL")).toBe(false);
        expect(canAccess("plus", "plus")).toBe(false);
    });
});

describe("seal / unseal", () => {
    test("round-trips a step payload", () => {
        const payload = {
            briefHtml: "<p>Load the operands</p>",
            cases: [{ name: "a", setup: { memory: { 8192: 58 } }, expect: { registers: { a: 58 } } }],
            constraints: { mustNotUse: ["LDA"] },
            starterCode: "HLT\n",
            hints: ["one", "two"],
        };
        expect(unseal(seal(payload))).toEqual(payload);
    });

    test("survives the non-ASCII that briefs actually contain", () => {
        // Em dashes and arrows appear throughout the authored briefs; btoa
        // alone would throw on these, hence the UTF-8 encode first.
        const payload = { briefHtml: "<p>eight bits — 00H to FFH → wraps</p>", hints: ["≤ 255"] };
        expect(unseal(seal(payload))).toEqual(payload);
    });

    test("the sealed form does not contain the plaintext", () => {
        // This is the whole point: an unsealed brief would be readable in the
        // static HTML of every paid step.
        const sealed = seal({ briefHtml: "<p>THE SECRET BRIEF</p>" });
        expect(sealed).not.toContain("SECRET");
        expect(sealed).not.toContain("<p>");
    });

    test("is obfuscation, not encryption — anyone can reverse it", () => {
        // Documenting the limitation in a test so it cannot be quietly
        // mistaken for a security boundary.
        const sealed = seal({ note: "reversible" });
        expect(unseal(sealed)).toEqual({ note: "reversible" });
    });
});
