import { describe, test, expect } from "vitest";
import { diffLines, isUnchanged } from "../../lib/practice/diff.js";

const render = (before, after) => diffLines(before, after).map((l) => `${l.type[0]} ${l.text}`);

describe("diffLines", () => {
    test("reports identical programs as unchanged", () => {
        expect(render("MOV A, M\nHLT", "MOV A, M\nHLT")).toEqual(["s MOV A, M", "s HLT"]);
        expect(isUnchanged("MOV A, M\nHLT", "MOV A, M\nHLT")).toBe(true);
    });

    test("marks lines the learner added", () => {
        expect(render("LXI H, 2000H\nHLT", "LXI H, 2000H\nMOV A, M\nHLT")).toEqual([
            "s LXI H, 2000H",
            "a MOV A, M",
            "s HLT",
        ]);
    });

    test("marks scaffolding the learner removed", () => {
        // The comment the step supplied is gone from their version.
        expect(render("; your code here\nHLT", "HLT")).toEqual(["r ; your code here", "s HLT"]);
    });

    test("shows a replaced line as a removal and an addition", () => {
        expect(render("LDA 2000H\nHLT", "MOV A, M\nHLT")).toEqual(["r LDA 2000H", "a MOV A, M", "s HLT"]);
    });

    test("ignores trailing whitespace, which is not an edit", () => {
        expect(isUnchanged("MOV A, M   \nHLT", "MOV A, M\nHLT")).toBe(true);
    });

    test("ignores a trailing newline, which comes from the file not the learner", () => {
        expect(isUnchanged("HLT\n", "HLT")).toBe(true);
    });

    test("handles an empty starting file", () => {
        expect(render("", "HLT")).toEqual(["r ", "a HLT"]);
    });

    test("keeps the learner's original spacing in the output", () => {
        // Comparison ignores trailing space; the text shown is still theirs.
        const out = diffLines("A", "  MOV A, M");
        expect(out.find((l) => l.type === "added").text).toBe("  MOV A, M");
    });

    test("degrades rather than hanging on an enormous paste", () => {
        const huge = Array.from({ length: 500 }, (_, i) => `NOP ${i}`).join("\n");
        const out = diffLines("HLT", huge);
        expect(out[0]).toEqual({ type: "removed", text: "HLT" });
        expect(out).toHaveLength(501);
    });
});
