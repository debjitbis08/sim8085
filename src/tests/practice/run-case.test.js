import { describe, test, expect } from "vitest";
import { verifySolution, Reason } from "../../lib/practice/run-case.js";

const ADD_TWO_BYTES = `
LDA 2000H
MOV B, A
LDA 2001H
ADD B
STA 2002H
HLT
`;

describe("verifySolution", () => {
    test("passes a correct program across every case", async () => {
        const verdict = await verifySolution({
            source: ADD_TWO_BYTES,
            cases: [
                {
                    name: "typical values",
                    setup: { memory: { "0x2000": 0x3a, "0x2001": 0x27 } },
                    expect: { registers: { a: 0x61 }, memory: { "0x2002": 0x61 }, flags: { cy: false } },
                },
                {
                    name: "sum overflows into the carry flag",
                    setup: { memory: { "0x2000": 0xff, "0x2001": 0x02 } },
                    expect: { registers: { a: 0x01 }, memory: { "0x2002": 0x01 }, flags: { cy: true } },
                },
                {
                    name: "both operands zero",
                    setup: { memory: { "0x2000": 0x00, "0x2001": 0x00 } },
                    expect: { registers: { a: 0x00 }, flags: { z: true } },
                },
            ],
        });

        expect(verdict.pass).toBe(true);
        expect(verdict.reason).toBe(Reason.PASSED);
        expect(verdict.caseResults.map((r) => r.pass)).toEqual([true, true, true]);
    });

    test("each case starts from a clean machine", async () => {
        // The first case writes 61H to 2002H. If memory leaked between cases,
        // the second case would still see it instead of its own result.
        const verdict = await verifySolution({
            source: ADD_TWO_BYTES,
            cases: [
                {
                    name: "first",
                    setup: { memory: { "0x2000": 0x3a, "0x2001": 0x27 } },
                    expect: { memory: { "0x2002": 0x61 } },
                },
                {
                    name: "second",
                    setup: { memory: { "0x2000": 0x01, "0x2001": 0x01 } },
                    expect: { memory: { "0x2002": 0x02 } },
                },
            ],
        });

        expect(verdict.pass).toBe(true);
    });

    test("registers do not leak between cases", async () => {
        const verdict = await verifySolution({
            source: "HLT",
            cases: [
                { name: "sets nothing", setup: { registers: { b: 0x99 } }, expect: { registers: { b: 0x99 } } },
                { name: "starts clean", setup: {}, expect: { registers: { b: 0x00 } } },
            ],
        });

        expect(verdict.pass).toBe(true);
    });

    test("reports which case failed and why", async () => {
        const verdict = await verifySolution({
            source: ADD_TWO_BYTES,
            cases: [
                {
                    name: "typical values",
                    setup: { memory: { "0x2000": 0x3a, "0x2001": 0x27 } },
                    expect: { registers: { a: 0x61 } },
                },
                {
                    name: "wrong expectation on purpose",
                    setup: { memory: { "0x2000": 0x01, "0x2001": 0x01 } },
                    expect: { registers: { a: 0xff } },
                },
            ],
        });

        expect(verdict.pass).toBe(false);
        expect(verdict.reason).toBe(Reason.ASSERTIONS_FAILED);
        expect(verdict.caseResults[0].pass).toBe(true);

        const failed = verdict.caseResults[1];
        expect(failed.pass).toBe(false);
        expect(failed.diffs[0].message).toBe("Register A should be FFH, but it is 02H");
        // The failing case carries its own setup so the UI can load it into
        // the live simulator for debugging.
        expect(failed.setup.memory).toEqual({ 8192: 1, 8193: 1 });
    });

    test("reports assembly errors with a line number instead of running", async () => {
        const verdict = await verifySolution({
            source: "MOV B\nHLT",
            cases: [{ name: "any", expect: {} }],
        });

        expect(verdict.pass).toBe(false);
        expect(verdict.reason).toBe(Reason.ASSEMBLY_ERROR);
        expect(verdict.error.line).toBe(1);
        expect(verdict.caseResults).toEqual([]);
        // Unpacked the same way the Assembler Errors panel unpacks it, rather
        // than surfaced as a raw JSON blob.
        expect(verdict.error.message).toBe("Invalid operands syntax for MOV instruction");
        expect(verdict.error.type).toBe("Invalid Operands");
        expect(verdict.error.hint).toEqual(["Expected syntax: MOV register, register."]);
    });

    test("reports an empty program rather than passing it", async () => {
        const verdict = await verifySolution({
            source: "; just a comment\n",
            cases: [{ name: "any", expect: {} }],
        });

        expect(verdict.reason).toBe(Reason.ASSEMBLY_ERROR);
        expect(verdict.error.message).toMatch(/empty/);
    });

    test("stops a program that never halts and says so", async () => {
        const verdict = await verifySolution({
            source: "LOOP: JMP LOOP\nHLT",
            cases: [{ name: "any", expect: { registers: { a: 0 } } }],
            budgetTstates: 50_000,
        });

        expect(verdict.pass).toBe(false);
        expect(verdict.reason).toBe(Reason.BUDGET_EXHAUSTED);
        expect(verdict.caseResults[0].error.message).toMatch(/never reaches HLT/);
        // Crucially, no exception escaped and no assertion diff was invented.
        expect(verdict.caseResults[0].diffs).toEqual([]);
    });

    test("a run that exceeds the budget does not poison later cases", async () => {
        const verdict = await verifySolution({
            source: "LOOP: JMP LOOP\nHLT",
            cases: [
                { name: "loops", expect: {} },
                { name: "loops again", expect: {} },
            ],
            budgetTstates: 50_000,
        });

        expect(verdict.caseResults.map((r) => r.reason)).toEqual([
            Reason.BUDGET_EXHAUSTED,
            Reason.BUDGET_EXHAUSTED,
        ]);
    });

    test("halting is asserted by default", async () => {
        const verdict = await verifySolution({
            source: "MVI A, 05H\nHLT",
            cases: [{ name: "any", expect: { registers: { a: 0x05 } } }],
        });
        expect(verdict.pass).toBe(true);
    });

    test("surfaces spec mistakes as a distinct reason", async () => {
        const verdict = await verifySolution({
            source: "HLT",
            cases: [{ name: "typo", expect: { registeres: { a: 1 } } }],
        });

        expect(verdict.reason).toBe(Reason.SPEC_ERROR);
        expect(verdict.error.message).toMatch(/unknown key/);
    });

    test("honours an explicit starting PC, stack pointer and flags", async () => {
        const verdict = await verifySolution({
            // ORG moves the program away from 0000H, so the case must say
            // where execution starts.
            source: "ORG 0100H\nACI 01H\nHLT",
            cases: [
                {
                    name: "carry is added in",
                    setup: { pc: "0x0100", sp: "0xFF00", registers: { a: 0x10 }, flags: { cy: true } },
                    expect: { registers: { a: 0x12 }, sp: 0xff00 },
                },
            ],
        });

        expect(verdict.pass).toBe(true);
    });

    test("reports T-states so efficiency can be graded", async () => {
        const verdict = await verifySolution({
            source: "MVI A, 05H\nHLT",
            cases: [{ name: "any", expect: { maxTstates: 100 } }],
        });

        expect(verdict.pass).toBe(true);
        expect(verdict.caseResults[0].metrics.totalTstates).toBeGreaterThan(0);
    });

    test("fails a program that is correct but too slow", async () => {
        const verdict = await verifySolution({
            source: "MVI A, 05H\nHLT",
            cases: [{ name: "any", expect: { registers: { a: 5 }, maxTstates: 1 } }],
        });

        expect(verdict.pass).toBe(false);
        expect(verdict.caseResults[0].diffs[0].path).toBe("maxTstates");
    });

    test("fails a program that is correct but breaks a constraint", async () => {
        const verdict = await verifySolution({
            source: ADD_TWO_BYTES,
            cases: [
                {
                    name: "typical values",
                    setup: { memory: { "0x2000": 0x3a, "0x2001": 0x27 } },
                    expect: { registers: { a: 0x61 } },
                },
            ],
            constraints: { mustNotUse: ["LDA"] },
        });

        expect(verdict.pass).toBe(false);
        // The cases themselves are fine; only the rule was broken.
        expect(verdict.reason).toBe(Reason.CONSTRAINTS_FAILED);
        expect(verdict.caseResults.every((r) => r.pass)).toBe(true);
        expect(verdict.constraintDiffs[0].message).toMatch(/not to use LDA/);
    });

    test("still runs the cases when a constraint is broken", async () => {
        // A learner with both the wrong instruction and wrong logic should see
        // both at once, not be sent round the loop twice.
        const verdict = await verifySolution({
            source: "LDA 2000H\nHLT",
            cases: [{ name: "typical", setup: { memory: { "0x2000": 0x3a } }, expect: { registers: { a: 0x00 } } }],
            constraints: { mustNotUse: ["LDA"] },
        });

        expect(verdict.constraintDiffs).toHaveLength(1);
        expect(verdict.caseResults[0].pass).toBe(false);
        expect(verdict.reason).toBe(Reason.ASSERTIONS_FAILED);
    });

    test("passes when constraints are satisfied", async () => {
        const verdict = await verifySolution({
            source: ADD_TWO_BYTES,
            cases: [
                {
                    name: "typical values",
                    setup: { memory: { "0x2000": 0x3a, "0x2001": 0x27 } },
                    expect: { registers: { a: 0x61 } },
                },
            ],
            constraints: { mustUse: ["LDA"], maxBytes: 16 },
        });

        expect(verdict.pass).toBe(true);
        expect(verdict.constraintDiffs).toEqual([]);
    });

    test("surfaces a malformed constraint spec as a spec error", async () => {
        const verdict = await verifySolution({
            source: "HLT",
            cases: [{ name: "any", expect: {} }],
            constraints: { mustuse: ["MOV"] },
        });

        expect(verdict.reason).toBe(Reason.SPEC_ERROR);
        expect(verdict.error.message).toMatch(/unknown key/);
    });

    test("returns program size for size-limited exercises", async () => {
        const verdict = await verifySolution({
            source: "MVI A, 05H\nHLT",
            cases: [{ name: "any", expect: {} }],
        });
        expect(verdict.programSizeBytes).toBe(3);
    });
});
