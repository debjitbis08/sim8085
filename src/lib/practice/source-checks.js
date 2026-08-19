/**
 * Constraints on the program itself, rather than on what it computes.
 *
 * Some exercises are only meaningful if the learner reaches for a particular
 * instruction — "walk the array with HL" is not taught by a solution that
 * hard-codes three LDAs, even though both produce the right answer. These
 * checks assert over the assembler's own output, so comments, labels and
 * string literals cannot be mistaken for code.
 */

import { SpecError } from "./spec.js";

const CONSTRAINT_KEYS = ["mustUse", "mustNotUse", "maxBytes", "maxInstructions"];

function fail(path, message) {
    throw new SpecError(`${path}: ${message}`);
}

/**
 * The assembler reports mnemonics inconsistently — `mov` from one rule, `INX`
 * from another — so everything is compared upper-cased.
 */
function normalizeMnemonic(name) {
    return String(name).trim().toUpperCase();
}

/**
 * Every mnemonic in the program, with the source line it appeared on.
 *
 * Covers directives (ORG, EQU, DB) as well as instructions: an author writing
 * `mustNotUse: [DB]` means "do not lay this out as static data", and would be
 * surprised if directives were exempt.
 */
export function mnemonicsUsed(lines) {
    const used = [];

    for (const line of lines ?? []) {
        // Blank lines come through as "", comment-only lines as objects with
        // nothing on them.
        if (!line || typeof line !== "object") continue;

        if (line.inst?.name) {
            used.push({ name: normalizeMnemonic(line.inst.name), line: line.location?.start?.line ?? null });
        } else if (typeof line.opcode === "string") {
            used.push({ name: normalizeMnemonic(line.opcode), line: line.location?.start?.line ?? null });
        }
    }

    return used;
}

/** Instructions only — directives assemble to data, not to executed steps. */
function instructionCount(lines) {
    return (lines ?? []).filter((line) => line && typeof line === "object" && line.inst?.name).length;
}

export function normalizeConstraints(raw, path = "constraints") {
    if (raw == null) return null;
    if (typeof raw !== "object" || Array.isArray(raw)) fail(path, "expected an object");

    for (const key of Object.keys(raw)) {
        if (!CONSTRAINT_KEYS.includes(key)) {
            fail(`${path}.${key}`, `unknown key (expected one of ${CONSTRAINT_KEYS.join(", ")})`);
        }
    }

    const list = (value, key) => {
        if (value === undefined) return [];
        if (!Array.isArray(value)) fail(`${path}.${key}`, "expected an array of mnemonics");
        return value.map((entry) => {
            if (typeof entry !== "string" || entry.trim() === "") {
                fail(`${path}.${key}`, `expected a mnemonic, got ${JSON.stringify(entry)}`);
            }
            return normalizeMnemonic(entry);
        });
    };

    const positive = (value, key) => {
        if (value === undefined) return undefined;
        if (!Number.isInteger(value) || value <= 0) fail(`${path}.${key}`, "expected a positive integer");
        return value;
    };

    return {
        mustUse: list(raw.mustUse, "mustUse"),
        mustNotUse: list(raw.mustNotUse, "mustNotUse"),
        maxBytes: positive(raw.maxBytes, "maxBytes"),
        maxInstructions: positive(raw.maxInstructions, "maxInstructions"),
    };
}

/**
 * @param {{assembled: Array, lines: Array}} parsed - assembler output
 * @param {object|null} constraints - already normalized
 * @returns {Array<{path: string, message: string, line: number|null}>}
 */
export function checkConstraints(parsed, constraints) {
    if (!constraints) return [];

    const diffs = [];
    const used = mnemonicsUsed(parsed.lines);
    const usedNames = new Set(used.map((entry) => entry.name));

    for (const mnemonic of constraints.mustUse) {
        if (!usedNames.has(mnemonic)) {
            diffs.push({
                path: `constraints.mustUse.${mnemonic}`,
                line: null,
                message: `This exercise asks you to use ${mnemonic}, but your program does not.`,
            });
        }
    }

    for (const mnemonic of constraints.mustNotUse) {
        const offender = used.find((entry) => entry.name === mnemonic);
        if (offender) {
            diffs.push({
                path: `constraints.mustNotUse.${mnemonic}`,
                line: offender.line,
                message: `This exercise asks you not to use ${mnemonic}${
                    offender.line ? ` (line ${offender.line})` : ""
                }.`,
            });
        }
    }

    if (constraints.maxBytes !== undefined) {
        const bytes = parsed.assembled?.length ?? 0;
        if (bytes > constraints.maxBytes) {
            diffs.push({
                path: "constraints.maxBytes",
                line: null,
                message: `Your program should assemble to at most ${constraints.maxBytes} bytes, but it takes ${bytes}.`,
            });
        }
    }

    if (constraints.maxInstructions !== undefined) {
        const count = instructionCount(parsed.lines);
        if (count > constraints.maxInstructions) {
            diffs.push({
                path: "constraints.maxInstructions",
                line: null,
                message: `Your program should use at most ${constraints.maxInstructions} instructions, but it uses ${count}.`,
            });
        }
    }

    return diffs;
}
