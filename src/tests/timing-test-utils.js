import { expect } from "vitest";
import { verifySolution } from "../lib/practice/run-case.js";

/** Expected totals include the terminating HLT's 5 T-states. */
export async function expectTstates(source, expected, setup = {}) {
    const verdict = await verifySolution({
        source,
        cases: [{ name: "timing", setup, expect: { halted: true } }],
    });

    expect(verdict, JSON.stringify(verdict, null, 2)).toMatchObject({ pass: true });
    expect(verdict.caseResults[0].metrics.totalTstates).toBe(expected);
}
