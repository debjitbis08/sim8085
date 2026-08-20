/**
 * Pure assertion engine for practice steps.
 *
 * Takes a normalized `expect` spec and a normalized final CPU state and
 * returns a list of diffs. Knows nothing about the simulator, the worker, or
 * Astro content, so it is testable on its own.
 */

export const REGISTER_KEYS = ["a", "b", "c", "d", "e", "h", "l"];
export const FLAG_KEYS = ["z", "s", "p", "cy", "ac", "v", "k"];

const FLAG_LABELS = {
    z: "Zero",
    s: "Sign",
    p: "Parity",
    cy: "Carry",
    ac: "Auxiliary Carry",
    v: "Overflow",
    k: "K",
};

export function hex8(n) {
    return `${n.toString(16).toUpperCase().padStart(2, "0")}H`;
}

export function hex16(n) {
    return `${n.toString(16).toUpperCase().padStart(4, "0")}H`;
}

function diff(path, expected, actual, message) {
    return { path, expected, actual, message };
}

function compareBytes(diffs, expected, actual, pathFor, labelFor, format) {
    for (const [address, value] of expected) {
        const got = actual[address] ?? 0;
        if (got !== value) {
            diffs.push(
                diff(
                    pathFor(address),
                    value,
                    got,
                    `${labelFor(address)} should be ${format(value)}, but it is ${format(got)}`,
                ),
            );
        }
    }
}

/**
 * @param {object} expected - a normalized expect spec (see spec.js)
 * @param {object} actual - a normalized final state (see spec.js#normalizeFinalState)
 * @returns {Array<{path: string, expected: any, actual: any, message: string}>}
 */
export function compareState(expected, actual) {
    const diffs = [];

    for (const key of REGISTER_KEYS) {
        if (expected.registers[key] === undefined) continue;
        const want = expected.registers[key];
        const got = actual.registers[key];
        if (got !== want) {
            diffs.push(
                diff(
                    `registers.${key}`,
                    want,
                    got,
                    `Register ${key.toUpperCase()} should be ${hex8(want)}, but it is ${hex8(got)}`,
                ),
            );
        }
    }

    for (const key of FLAG_KEYS) {
        if (expected.flags[key] === undefined) continue;
        const want = expected.flags[key];
        const got = actual.flags[key];
        if (got !== want) {
            diffs.push(
                diff(
                    `flags.${key}`,
                    want,
                    got,
                    `The ${FLAG_LABELS[key]} flag should be ${want ? "set" : "clear"}, but it is ${
                        got ? "set" : "clear"
                    }`,
                ),
            );
        }
    }

    if (expected.sp !== undefined && actual.sp !== expected.sp) {
        diffs.push(
            diff(
                "sp",
                expected.sp,
                actual.sp,
                `The stack pointer should be ${hex16(expected.sp)}, but it is ${hex16(actual.sp)}`,
            ),
        );
    }

    if (expected.pc !== undefined && actual.pc !== expected.pc) {
        diffs.push(
            diff(
                "pc",
                expected.pc,
                actual.pc,
                `The program counter should be ${hex16(expected.pc)}, but it is ${hex16(actual.pc)}`,
            ),
        );
    }

    compareBytes(
        diffs,
        expected.memory,
        actual.memory,
        (address) => `memory.${address}`,
        (address) => `Memory at ${hex16(address)}`,
        hex8,
    );

    compareBytes(
        diffs,
        expected.io,
        actual.io,
        (port) => `io.${port}`,
        (port) => `IO port ${hex8(port)}`,
        hex8,
    );

    if (expected.halted !== undefined && actual.halted !== expected.halted) {
        diffs.push(
            diff(
                "halted",
                expected.halted,
                actual.halted,
                expected.halted
                    ? "The program should reach HLT, but it did not"
                    : "The program should not halt, but it did",
            ),
        );
    }

    if (expected.maxTstates !== undefined && actual.totalTstates > expected.maxTstates) {
        diffs.push(
            diff(
                "maxTstates",
                expected.maxTstates,
                actual.totalTstates,
                `The program should run in at most ${expected.maxTstates} T-states, but it took ${actual.totalTstates}`,
            ),
        );
    }

    return diffs;
}
