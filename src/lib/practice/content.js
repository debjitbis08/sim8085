/**
 * Locates the executable half of a practice step.
 *
 * A step is four files sharing a stem:
 *
 *   step-1.md            prose, plus title / stepNumber / hints
 *   step-1.starter.asm   what the editor is seeded with
 *   step-1.solution.asm  a reference solution (see solutions.js)
 *   step-1.cases.js      the check spec: cases, and optional constraints
 *
 * Naming convention rather than paths in frontmatter: there is no path to get
 * wrong, and nothing has to be updated in two places when a step is added.
 *
 * Reference solutions are deliberately absent from this module — see
 * solutions.js — so that importing this from a client component cannot leak
 * answers into the browser bundle.
 *
 * `loadStep` is also the seam for paid content. Today it resolves everything
 * from the static bundle. If step content ever needs to be withheld
 * server-side, this is the only function that has to change.
 */

import { normalizeCases } from "./spec.js";
import { normalizeConstraints } from "./source-checks.js";
import { stepKeyOf } from "./step-key.js";

const caseModules = import.meta.glob("../../content/practice/*/step-*.cases.js", { eager: true });
const starterModules = import.meta.glob("../../content/practice/*/step-*.starter.asm", {
    eager: true,
    query: "?raw",
    import: "default",
});

function indexBy(modules) {
    return new Map(Object.entries(modules).map(([path, value]) => [stepKeyOf(path), value]));
}

const casesByStep = indexBy(caseModules);
const startersByStep = indexBy(starterModules);

/** Every authored step key, e.g. "add-two-8bit-numbers/step-1". */
export function listStepKeys() {
    return [...casesByStep.keys()].sort();
}

export function getCases(stepKey) {
    const module = casesByStep.get(stepKey);
    if (!module) throw new Error(`Missing ${stepKey}.cases.js`);
    const cases = module.default;
    if (!Array.isArray(cases)) {
        throw new Error(`${stepKey}.cases.js must default-export an array of cases`);
    }
    return cases;
}

/**
 * Optional rules about how the program is written, exported by name from the
 * cases file alongside the default-exported cases.
 */
export function getConstraints(stepKey) {
    const module = casesByStep.get(stepKey);
    if (!module) throw new Error(`Missing ${stepKey}.cases.js`);
    return module.constraints ?? null;
}

export function getStarterCode(stepKey) {
    const code = startersByStep.get(stepKey);
    if (code === undefined) throw new Error(`Missing ${stepKey}.starter.asm`);
    return code;
}

/**
 * What a practice page needs in order to render and check a step. Excludes the
 * reference solution by construction.
 */
export function loadStep(stepKey) {
    const cases = getCases(stepKey);
    const constraints = getConstraints(stepKey);

    // Validate at build time so an authoring mistake fails the build, but hand
    // back the raw specs. Normalization produces Maps, which survive neither
    // the trip through island props nor structured cloning into the worker —
    // and normalizing twice silently discards the memory setup. The worker
    // normalizes exactly once, at the point of use.
    normalizeCases(cases);
    normalizeConstraints(constraints);

    return {
        stepKey,
        starterCode: getStarterCode(stepKey),
        cases,
        constraints,
    };
}
