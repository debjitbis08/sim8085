/**
 * Normalization and validation for practice step case specs.
 *
 * Step frontmatter is written by hand, so this layer is deliberately strict:
 * an unrecognised key is an authoring mistake and should fail loudly at build
 * or test time rather than silently never being checked.
 */

import { REGISTER_KEYS, FLAG_KEYS } from "./assert.js";

const SETUP_KEYS = ["registers", "flags", "sp", "pc", "memory", "memoryRange", "io"];
const EXPECT_KEYS = [...SETUP_KEYS, "halted", "maxTstates"];

// The store spells the carry flag "c"; 8085 documentation spells it "CY".
// Accept both from authors, normalize to "cy".
const FLAG_ALIASES = { c: "cy", cy: "cy", z: "z", s: "s", p: "p", ac: "ac" };

export class SpecError extends Error {}

function fail(path, message) {
    throw new SpecError(`${path}: ${message}`);
}

function rejectUnknownKeys(value, allowed, path) {
    for (const key of Object.keys(value)) {
        if (!allowed.includes(key)) {
            fail(`${path}.${key}`, `unknown key (expected one of ${allowed.join(", ")})`);
        }
    }
}

/**
 * Parse an address or value literal. YAML turns a bare `0x2000` into the
 * number 8192, but authors also write `"2000H"` and `"0x2000"` as strings,
 * and object keys always arrive as strings.
 */
export function parseNumber(raw, path) {
    if (typeof raw === "number") {
        if (!Number.isInteger(raw)) fail(path, `expected an integer, got ${raw}`);
        return raw;
    }
    if (typeof raw !== "string") fail(path, `expected a number, got ${typeof raw}`);

    const text = raw.trim();
    let parsed;
    if (/^0x[0-9a-f]+$/i.test(text)) {
        parsed = Number.parseInt(text.slice(2), 16);
    } else if (/^[0-9a-f]+h$/i.test(text)) {
        parsed = Number.parseInt(text.slice(0, -1), 16);
    } else if (/^[0-9]+$/.test(text)) {
        parsed = Number.parseInt(text, 10);
    } else {
        fail(path, `cannot parse "${raw}" as a number`);
    }
    return parsed;
}

function parseBounded(raw, max, path) {
    const value = parseNumber(raw, path);
    if (value < 0 || value > max) {
        fail(path, `value ${value} is out of range (0..${max})`);
    }
    return value;
}

function normalizeByteMap(raw, memoryRange, max, path) {
    const result = new Map();

    if (raw !== undefined) {
        if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
            fail(path, "expected a map of address to byte");
        }
        // A Map means an already-normalized spec is being normalized again.
        // Object.entries would quietly return nothing and drop every byte, so
        // refuse rather than run a check against the wrong initial memory.
        if (raw instanceof Map) {
            fail(path, "received an already-normalized spec; normalize raw cases only once");
        }
        for (const [key, value] of Object.entries(raw)) {
            const address = parseBounded(key, max, `${path}.${key}`);
            result.set(address, parseBounded(value, 0xff, `${path}.${key}`));
        }
    }

    if (memoryRange !== undefined) {
        const rangePath = `${path}Range`;
        if (typeof memoryRange !== "object" || memoryRange === null) {
            fail(rangePath, "expected { start, bytes }");
        }
        rejectUnknownKeys(memoryRange, ["start", "bytes"], rangePath);
        if (!Array.isArray(memoryRange.bytes)) fail(`${rangePath}.bytes`, "expected an array");
        const start = parseBounded(memoryRange.start, max, `${rangePath}.start`);
        memoryRange.bytes.forEach((byte, index) => {
            const address = start + index;
            if (address > max) fail(`${rangePath}.bytes[${index}]`, `address ${address} is out of range`);
            result.set(address, parseBounded(byte, 0xff, `${rangePath}.bytes[${index}]`));
        });
    }

    return result;
}

function normalizeRegisters(raw, path) {
    const result = {};
    if (raw === undefined) return result;
    if (typeof raw !== "object" || raw === null) fail(path, "expected a map of register to byte");

    for (const [key, value] of Object.entries(raw)) {
        const name = key.toLowerCase();
        if (!REGISTER_KEYS.includes(name)) {
            fail(`${path}.${key}`, `unknown register (expected one of ${REGISTER_KEYS.join(", ")})`);
        }
        result[name] = parseBounded(value, 0xff, `${path}.${key}`);
    }
    return result;
}

function normalizeFlags(raw, path) {
    const result = {};
    if (raw === undefined) return result;
    if (typeof raw !== "object" || raw === null) fail(path, "expected a map of flag to boolean");

    for (const [key, value] of Object.entries(raw)) {
        const name = FLAG_ALIASES[key.toLowerCase()];
        if (!name) fail(`${path}.${key}`, `unknown flag (expected one of ${FLAG_KEYS.join(", ")})`);
        if (typeof value !== "boolean") fail(`${path}.${key}`, `expected true or false, got ${value}`);
        result[name] = value;
    }
    return result;
}

function normalizeCommon(raw, allowedKeys, path) {
    const source = raw ?? {};
    if (typeof source !== "object" || Array.isArray(source)) fail(path, "expected an object");
    rejectUnknownKeys(source, allowedKeys, path);

    return {
        registers: normalizeRegisters(source.registers, `${path}.registers`),
        flags: normalizeFlags(source.flags, `${path}.flags`),
        sp: source.sp === undefined ? undefined : parseBounded(source.sp, 0xffff, `${path}.sp`),
        pc: source.pc === undefined ? undefined : parseBounded(source.pc, 0xffff, `${path}.pc`),
        memory: normalizeByteMap(source.memory, source.memoryRange, 0xffff, `${path}.memory`),
        io: normalizeByteMap(source.io, undefined, 0xff, `${path}.io`),
    };
}

export function normalizeSetup(raw, path = "setup") {
    return normalizeCommon(raw, SETUP_KEYS, path);
}

export function normalizeExpect(raw, path = "expect") {
    const source = raw ?? {};
    const common = normalizeCommon(source, EXPECT_KEYS, path);

    if (source.halted !== undefined && typeof source.halted !== "boolean") {
        fail(`${path}.halted`, `expected true or false, got ${source.halted}`);
    }
    if (source.maxTstates !== undefined) {
        const value = parseNumber(source.maxTstates, `${path}.maxTstates`);
        if (value <= 0) fail(`${path}.maxTstates`, "expected a positive number");
        common.maxTstates = value;
    }
    common.halted = source.halted;

    return common;
}

/**
 * A step's `cases` entry. `expect.halted` defaults to true: virtually every
 * exercise wants the program to reach HLT, and forgetting to assert it is a
 * far more common authoring mistake than deliberately omitting it.
 */
export function normalizeCase(raw, index = 0) {
    const path = `cases[${index}]`;
    if (typeof raw !== "object" || raw === null) fail(path, "expected an object");
    rejectUnknownKeys(raw, ["name", "setup", "expect"], path);
    if (typeof raw.name !== "string" || raw.name.trim() === "") {
        fail(`${path}.name`, "expected a non-empty string");
    }

    const expect = normalizeExpect(raw.expect, `${path}.expect`);
    if (expect.halted === undefined) expect.halted = true;

    return {
        name: raw.name,
        setup: normalizeSetup(raw.setup, `${path}.setup`),
        expect,
    };
}

export function normalizeCases(raw) {
    if (!Array.isArray(raw) || raw.length === 0) {
        fail("cases", "expected a non-empty array");
    }
    return raw.map(normalizeCase);
}

/**
 * Flatten the store-shaped result of `runProgramWithBudget` into the shape
 * `compareState` works with.
 */
export function normalizeFinalState(result) {
    return {
        registers: {
            a: result.accumulator,
            b: result.registers.bc.high,
            c: result.registers.bc.low,
            d: result.registers.de.high,
            e: result.registers.de.low,
            h: result.registers.hl.high,
            l: result.registers.hl.low,
        },
        flags: {
            z: result.flags.z,
            s: result.flags.s,
            p: result.flags.p,
            cy: result.flags.c,
            ac: result.flags.ac,
        },
        sp: result.stackPointer,
        pc: result.programCounter,
        memory: result.memory,
        io: result.io,
        halted: result.halted,
        totalTstates: result.metrics.totalTstates,
    };
}
