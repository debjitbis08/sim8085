/**
 * Reference solutions for practice steps.
 *
 * DO NOT import this module from anything that renders. It is deliberately
 * separate from content.js: the glob below is eager, so importing it anywhere
 * in the client graph would bundle every answer into the browser. Only tests
 * and build-time validation may use it.
 */

import { stepKeyOf } from "./step-key.js";

const solutionModules = import.meta.glob("../../content/practice/*/step-*.solution.asm", {
    eager: true,
    query: "?raw",
    import: "default",
});

const solutionsByStep = new Map(
    Object.entries(solutionModules).map(([path, code]) => [stepKeyOf(path), code]),
);

export function getSolution(stepKey) {
    const code = solutionsByStep.get(stepKey);
    if (code === undefined) throw new Error(`Missing ${stepKey}.solution.asm`);
    return code;
}

export function listSolutionKeys() {
    return [...solutionsByStep.keys()].sort();
}
