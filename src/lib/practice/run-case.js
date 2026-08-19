/**
 * Runs a learner's source against a step's cases and reports a verdict.
 *
 * This is the deterministic core of the practice feature. It is deliberately
 * free of DOM and worker concerns so it can run under vitest exactly as it
 * runs inside `verify.worker.js`.
 */

import { assembleProgram, initSimulator, runProgramWithBudget } from "../../core/simulator.js";
import { compareState } from "./assert.js";
import { checkConstraints, normalizeConstraints } from "./source-checks.js";
import { normalizeCases, normalizeFinalState, SpecError } from "./spec.js";

export const DEFAULT_BUDGET_TSTATES = 2_000_000;

/** Why a check produced the verdict it did. */
export const Reason = {
    PASSED: "passed",
    ASSEMBLY_ERROR: "assembly-error",
    ASSERTIONS_FAILED: "assertions-failed",
    // The program computes the right answers but breaks a rule about how it is
    // written — the wrong instruction, or too long.
    CONSTRAINTS_FAILED: "constraints-failed",
    BUDGET_EXHAUSTED: "budget-exhausted",
    RUNTIME_ERROR: "runtime-error",
    SPEC_ERROR: "spec-error",
    // Produced by the client, not here: the worker overran its wall clock and
    // was terminated. The T-state budget bounds emulated time; this bounds the
    // time the host actually spends.
    TIMEOUT: "timeout",
};

let statePointerPromise = null;

/**
 * `initSimulator` builds a fresh module every call, which is slow and leaks
 * the previous one, so the simulator is created once per worker or test run.
 */
export function ensureSimulator() {
    if (!statePointerPromise) statePointerPromise = initSimulator();
    return statePointerPromise;
}

/** Test seam: forget the cached simulator so the next call rebuilds it. */
export function resetSimulator() {
    statePointerPromise = null;
}

/**
 * The assembler throws its detail as a JSON string in `message`, which the
 * Assembler Errors panel unpacks into a message, a type and hints. Practice
 * checks unpack it the same way so a learner sees one consistent error, not a
 * different one depending on which button they pressed.
 */
function formatAssemblyError(error) {
    const location = error?.location?.start;
    const raw = error?.message ?? String(error);

    let detail = raw;
    if (typeof raw === "string" && raw.startsWith("{")) {
        try {
            detail = JSON.parse(raw);
        } catch {
            detail = raw;
        }
    }

    return {
        message: typeof detail === "string" ? detail : (detail.message ?? raw),
        type: typeof detail === "string" ? "" : (detail.type ?? ""),
        hint: typeof detail === "string" ? [] : (detail.hint ?? []),
        line: location?.line ?? null,
        column: location?.column ?? null,
    };
}

/**
 * Build a fresh 64K image containing only the assembled program, so each case
 * starts from a clean machine rather than inheriting the previous case's
 * writes.
 */
function buildMemoryImage(assembled) {
    const memory = new Array(65536).fill(0);
    for (const line of assembled) {
        memory[line.currentAddress] = line.data;
    }
    return memory;
}

function buildStore(statePointer, memoryImage, setup, defaultPc) {
    const memory = memoryImage.slice();
    for (const [address, value] of setup.memory) {
        memory[address] = value;
    }

    const io = new Array(256).fill(0);
    for (const [port, value] of setup.io) {
        io[port] = value;
    }

    const reg = (name) => setup.registers[name] ?? 0;

    return {
        statePointer,
        memory,
        io,
        accumulator: reg("a"),
        registers: {
            bc: { high: reg("b"), low: reg("c") },
            de: { high: reg("d"), low: reg("e") },
            hl: { high: reg("h"), low: reg("l") },
        },
        stackPointer: setup.sp ?? 0xffff,
        programCounter: setup.pc ?? defaultPc,
        flags: {
            z: setup.flags.z ?? false,
            s: setup.flags.s ?? false,
            p: setup.flags.p ?? false,
            c: setup.flags.cy ?? false,
            ac: setup.flags.ac ?? false,
        },
        programState: "Loaded",
        settings: { run: { enableTiming: false, clockFrequency: "3072000" } },
    };
}

/**
 * Only the addresses a case actually asserts on are worth reporting back; the
 * full 64K array would dominate the postMessage payload for no benefit.
 */
function collectObservedBytes(expected, actual) {
    const observed = {};
    for (const address of expected.keys()) {
        observed[address] = actual[address] ?? 0;
    }
    return observed;
}

/**
 * What the case asserts, in the same shape as the setup, so the panel can show
 * a learner the inputs and the expected outputs side by side. A case name on
 * its own does not tell anyone what was actually checked.
 */
function serializeExpect(expect) {
    return {
        registers: expect.registers,
        flags: expect.flags,
        sp: expect.sp,
        pc: expect.pc,
        memory: Object.fromEntries(expect.memory),
        io: Object.fromEntries(expect.io),
        maxTstates: expect.maxTstates,
    };
}

function serializeSetup(setup) {
    return {
        registers: setup.registers,
        flags: setup.flags,
        sp: setup.sp,
        pc: setup.pc,
        memory: Object.fromEntries(setup.memory),
        io: Object.fromEntries(setup.io),
    };
}

/**
 * @param {object} input
 * @param {string} input.source - the learner's assembly source
 * @param {Array} input.cases - raw case specs from step frontmatter
 * @param {number} [input.budgetTstates] - per-case T-state budget
 * @param {object} [input.constraints] - rules about the program's own text
 * @returns {Promise<object>} a verdict; see Reason for the `reason` values
 */
export async function verifySolution({
    source,
    cases,
    constraints,
    budgetTstates = DEFAULT_BUDGET_TSTATES,
}) {
    let normalizedCases;
    let normalizedConstraints;
    try {
        normalizedCases = normalizeCases(cases);
        normalizedConstraints = normalizeConstraints(constraints);
    } catch (error) {
        if (error instanceof SpecError) {
            return { pass: false, reason: Reason.SPEC_ERROR, error: { message: error.message }, caseResults: [] };
        }
        throw error;
    }

    let assembled;
    let pcStartValue;
    let lines;
    try {
        ({ assembled, pcStartValue, lines } = assembleProgram(source));
    } catch (error) {
        return {
            pass: false,
            reason: Reason.ASSEMBLY_ERROR,
            error: formatAssemblyError(error),
            caseResults: [],
        };
    }

    if (!assembled || assembled.length === 0) {
        return {
            pass: false,
            reason: Reason.ASSEMBLY_ERROR,
            error: {
                message: "The program is empty. There is nothing to run.",
                type: "",
                hint: [],
                line: null,
                column: null,
            },
            caseResults: [],
        };
    }

    // Constraints are checked but do not short-circuit the run: a learner who
    // has the logic right and the instruction wrong should see both at once
    // rather than being told one thing, fixing it, and being told the other.
    const constraintDiffs = checkConstraints({ assembled, lines }, normalizedConstraints);

    const statePointer = await ensureSimulator();
    const memoryImage = buildMemoryImage(assembled);

    // The app leaves PC at 0 unless an END directive says otherwise, so mirror
    // that here; a step using ORG should set `setup.pc` explicitly.
    const defaultPc = pcStartValue ?? 0;

    const caseResults = normalizedCases.map((testCase) => {
        const store = buildStore(statePointer, memoryImage, testCase.setup, defaultPc);
        const base = {
            name: testCase.name,
            setup: serializeSetup(testCase.setup),
            expect: serializeExpect(testCase.expect),
        };

        let result;
        try {
            result = runProgramWithBudget(store, { maxTstates: budgetTstates });
        } catch (error) {
            return {
                ...base,
                pass: false,
                reason: Reason.RUNTIME_ERROR,
                diffs: [],
                error: { message: error?.message ?? String(error) },
            };
        }

        const finalState = normalizeFinalState(result);

        if (result.exhausted) {
            return {
                ...base,
                pass: false,
                reason: Reason.BUDGET_EXHAUSTED,
                diffs: [],
                metrics: { totalTstates: finalState.totalTstates },
                error: {
                    message:
                        `The program was still running after ${budgetTstates} T-states. ` +
                        "It probably never reaches HLT. Check for a loop that never ends.",
                },
            };
        }

        const diffs = compareState(testCase.expect, finalState);

        return {
            ...base,
            pass: diffs.length === 0,
            reason: diffs.length === 0 ? Reason.PASSED : Reason.ASSERTIONS_FAILED,
            diffs,
            metrics: { totalTstates: finalState.totalTstates },
            observed: {
                registers: finalState.registers,
                flags: finalState.flags,
                sp: finalState.sp,
                pc: finalState.pc,
                memory: collectObservedBytes(testCase.expect.memory, finalState.memory),
                io: collectObservedBytes(testCase.expect.io, finalState.io),
            },
        };
    });

    const casesPass = caseResults.every((r) => r.pass);
    const pass = casesPass && constraintDiffs.length === 0;
    const firstFailure = caseResults.find((r) => !r.pass);

    return {
        pass,
        reason: pass
            ? Reason.PASSED
            : casesPass
              ? Reason.CONSTRAINTS_FAILED
              : firstFailure.reason,
        caseResults,
        constraintDiffs,
        programSizeBytes: assembled.length,
    };
}
