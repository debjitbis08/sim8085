/**
 * Validates every authored practice step.
 *
 * The important assertion here is that each step's reference solution passes
 * that step's own cases. It is the only thing that proves an exercise is
 * solvable at all and that its assertions describe the intended behaviour
 * rather than something subtly different.
 */

import { describe, test, expect } from "vitest";
import { getCases, getConstraints, getStarterCode, listStepKeys } from "../../lib/practice/content.js";
import { getSolution, listSolutionKeys } from "../../lib/practice/solutions.js";
import { normalizeCases } from "../../lib/practice/spec.js";
import { normalizeConstraints } from "../../lib/practice/source-checks.js";
import { verifySolution, Reason } from "../../lib/practice/run-case.js";

const stepKeys = listStepKeys();

test("there is authored content to validate", () => {
    expect(stepKeys.length).toBeGreaterThan(0);
});

test("every step has a solution and every solution has a step", () => {
    expect(listSolutionKeys()).toEqual(stepKeys);
});

describe.each(stepKeys)("%s", (stepKey) => {
    test("has a starter file, a solution file and a valid case spec", () => {
        expect(getStarterCode(stepKey).trim()).not.toBe("");
        expect(getSolution(stepKey).trim()).not.toBe("");
        // Throws with a precise path on an authoring mistake.
        expect(() => normalizeCases(getCases(stepKey))).not.toThrow();
        expect(() => normalizeConstraints(getConstraints(stepKey))).not.toThrow();
    });

    test("case names are unique, so a failure is unambiguous", () => {
        const names = getCases(stepKey).map((c) => c.name);
        expect(new Set(names).size).toBe(names.length);
    });

    test("the reference solution passes every case", async () => {
        const verdict = await verifySolution({
            source: getSolution(stepKey),
            cases: getCases(stepKey),
            constraints: getConstraints(stepKey),
        });

        // A reference solution that breaks its own step's rules would teach
        // the opposite of what the step asks for.
        expect(verdict.constraintDiffs).toEqual([]);

        const failures = verdict.caseResults
            .filter((r) => !r.pass)
            .map((r) => `${r.name}: ${r.diffs.map((d) => d.message).join("; ") || r.error?.message}`);

        expect(failures).toEqual([]);
        expect(verdict.reason).toBe(Reason.PASSED);
    });

    test("the starter code does not already pass", async () => {
        // A step whose starter code passes is not an exercise. Failing to
        // assemble counts as not passing, which is fine for a stub.
        const verdict = await verifySolution({
            source: getStarterCode(stepKey),
            cases: getCases(stepKey),
            constraints: getConstraints(stepKey),
        });

        expect(verdict.pass).toBe(false);
    });
});
