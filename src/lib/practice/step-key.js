/**
 * A step is identified by "<problem>/<step>", e.g. "add-two-8bit-numbers/step-1",
 * which is also the id Astro's glob loader generates for the step's markdown
 * and the key progress is stored under.
 */

const STEP_FILE = /practice\/([^/]+)\/(step-[^/.]+)\.(?:cases\.js|starter\.asm|solution\.asm)$/;

/** "../../content/practice/add-two/step-1.cases.js" -> "add-two/step-1" */
export function stepKeyOf(path) {
    const match = path.match(STEP_FILE);
    if (!match) throw new Error(`Unrecognised practice file path: ${path}`);
    return `${match[1]}/${match[2]}`;
}

export function parseStepKey(stepKey) {
    const [problem, step] = stepKey.split("/");
    if (!problem || !step) throw new Error(`Malformed step key: ${stepKey}`);
    return { problem, step };
}
