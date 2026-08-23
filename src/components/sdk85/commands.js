// The monitor's commands, as the key sequences that invoke them.
//
// Nothing here reimplements a command. Each of these is the sequence a person
// would key on the board, and pressing a button in the modern interface queues
// exactly that -- so the monitor's own SUBST, EXAM, GOCMD and SSTEP routines
// are what run, and the display does what it would have done anyway.
import { SDK85_KEYS, SDK85_KEY_LABELS } from "../../core/sdk85.js";

/** The four hex keys for an address, high digit first. */
export function addressKeys(address) {
    return [(address >> 12) & 0xf, (address >> 8) & 0xf, (address >> 4) & 0xf, address & 0xf];
}

/** The two hex keys for a byte. */
export function byteKeys(value) {
    return [(value >> 4) & 0xf, value & 0xf];
}

/** A sequence written the way the manual writes it: `SUBST MEM 2 0 0 0 ,`. */
export function sequenceLabel(keys) {
    return keys.map((code) => SDK85_KEY_LABELS[code] ?? "?").join(" ");
}

const command = (keys) => ({ keys, label: sequenceLabel(keys) });

/** SUBST MEM, up to and including the `,` that shows what is at the address. */
export const examineMemory = (address) => command([SDK85_KEYS.SUBST_MEM, ...addressKeys(address), SDK85_KEYS.COMMA]);

/** Inside SUBST MEM or EXAM REG: type a byte and store it, moving on. */
export const storeByte = (value) => command([...byteKeys(value), SDK85_KEYS.COMMA]);

/** Inside a command: leave this one alone and move to the next. */
export const next = () => command([SDK85_KEYS.COMMA]);

/** Inside a command: finish. */
export const done = () => command([SDK85_KEYS.PERIOD]);

/**
 * EXAM REG. The register is chosen by a key rather than by its letter -- the
 * keypad has no S, P or I -- and the monitor shows it straight away.
 */
export const examineRegister = (registerKey) => command([SDK85_KEYS.EXAM_REG, registerKey]);

/** GO: run from an address. */
export const go = (address) => command([SDK85_KEYS.GO, ...addressKeys(address), SDK85_KEYS.PERIOD]);

/** GO with no address: carry on from the saved program counter. */
export const goOn = () => command([SDK85_KEYS.GO, SDK85_KEYS.PERIOD]);

/** SINGLE STEP, up to the `,` that executes the first instruction. */
export const singleStepFrom = (address) =>
    command([SDK85_KEYS.SINGLE_STEP, ...addressKeys(address), SDK85_KEYS.COMMA]);

/** The registers EXAM REG can be pointed at, and the key that selects each. */
export const REGISTER_KEYS = [
    { key: SDK85_KEYS.A, name: "A", of: (r) => r.a },
    { key: SDK85_KEYS.B, name: "B", of: (r) => r.b },
    { key: SDK85_KEYS.C, name: "C", of: (r) => r.c },
    { key: SDK85_KEYS.D, name: "D", of: (r) => r.d },
    { key: SDK85_KEYS.E, name: "E", of: (r) => r.e },
    { key: SDK85_KEYS.F, name: "Flags" },
    { key: SDK85_KEYS[3], name: "I mask" },
    { key: SDK85_KEYS[8], name: "H", of: (r) => r.h },
    { key: SDK85_KEYS[9], name: "L", of: (r) => r.l },
    { key: SDK85_KEYS[4], name: "SP high" },
    { key: SDK85_KEYS[5], name: "SP low" },
    { key: SDK85_KEYS[6], name: "PC high" },
    { key: SDK85_KEYS[7], name: "PC low" },
];
