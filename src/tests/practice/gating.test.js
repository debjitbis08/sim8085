import { describe, test, expect } from "vitest";
import { unlockedSteps, isStepUnlocked, nextIncompleteStep } from "../../lib/practice/gating.js";

const STEPS = ["p/step-1", "p/step-2", "p/step-3"];
const completedSet = (...keys) => {
    const set = new Set(keys);
    return (stepKey) => set.has(stepKey);
};

describe("unlockedSteps", () => {
    test("opens only the first step to a new learner", () => {
        expect([...unlockedSteps(STEPS, completedSet())]).toEqual(["p/step-1"]);
    });

    test("opens the next step once the previous one is done", () => {
        expect([...unlockedSteps(STEPS, completedSet("p/step-1"))]).toEqual(["p/step-1", "p/step-2"]);
    });

    test("opens everything once every step is done", () => {
        const done = completedSet("p/step-1", "p/step-2", "p/step-3");
        expect([...unlockedSteps(STEPS, done)]).toEqual(STEPS);
    });

    test("keeps a completed step open even if the one before it is not", () => {
        // Progress synced from another device, or a step reworked after the
        // gate changed. Locking work the learner has already finished would be
        // indefensible.
        const done = completedSet("p/step-3");
        expect(isStepUnlocked("p/step-3", STEPS, done)).toBe(true);
    });

    test("does not open a step two ahead", () => {
        expect(isStepUnlocked("p/step-3", STEPS, completedSet("p/step-1"))).toBe(false);
    });

    test("a single-step problem is always open", () => {
        expect(isStepUnlocked("p/step-1", ["p/step-1"], completedSet())).toBe(true);
    });
});

describe("nextIncompleteStep", () => {
    test("points at the first unfinished step", () => {
        expect(nextIncompleteStep(STEPS, completedSet("p/step-1"))).toBe("p/step-2");
    });

    test("returns null when the problem is finished", () => {
        const done = completedSet("p/step-1", "p/step-2", "p/step-3");
        expect(nextIncompleteStep(STEPS, done)).toBe(null);
    });
});
