/**
 * The reference solutions, read from the same files the unit tests check.
 *
 * These never reach the browser through the application — that is the point of
 * solutions.js — so a test that needs a passing program reads the file itself,
 * exactly as a learner who had solved the step would have it in their editor.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const CONTENT = resolve(fileURLToPath(import.meta.url), "../../..", "src/content/practice");

/** @param stepKey e.g. "add-two-8bit-numbers/step-1" */
export function solutionFor(stepKey) {
    return read(`${stepKey}.solution.asm`);
}

/** What the editor is seeded with — a program that does not yet pass. */
export function starterFor(stepKey) {
    return read(`${stepKey}.starter.asm`);
}

function read(relativePath) {
    const [problem, file] = relativePath.split("/");

    return readFileSync(resolve(CONTENT, problem, file), "utf8").trimEnd();
}
