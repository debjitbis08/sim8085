// Reading an SDK-85's front panel.
//
// The keypad codes are what the 8279 reports, and the display is six
// seven-segment digits: four for the address field and two for the data field.
//
// The monitor complements each character before sending it and may set the
// decimal point bit, and it translates characters to segment patterns through a
// table in its own ROM. Decoding therefore reads that table out of memory
// rather than carrying a copy, so a different monitor build cannot leave this
// decoding against stale patterns.
import { sdk85Display } from "./simulator.js";

/** Key codes as the 8279 reports them on the SDK-85 keypad. */
export const SDK85_KEYS = {
    0: 0x00, 1: 0x01, 2: 0x02, 3: 0x03, 4: 0x04, 5: 0x05, 6: 0x06, 7: 0x07,
    8: 0x08, 9: 0x09, A: 0x0a, B: 0x0b, C: 0x0c, D: 0x0d, E: 0x0e, F: 0x0f,
    PERIOD: 0x10,
    COMMA: 0x11,
    GO: 0x12,
    SUBST_MEM: 0x13,
    EXAM_REG: 0x14,
    SINGLE_STEP: 0x15,
};

/** DSPTB, the monitor's character-to-segment table. */
export const DISPLAY_TABLE = 0x0384;
/** DTMSK, the bit the monitor sets to light a decimal point. */
export const DISPLAY_DOT = 0x08;
/** The SDK-85 has six digits, however much display RAM the 8279 has. */
export const DISPLAY_DIGITS = 6;

/**
 * Builds a segment-pattern to character map by reading the monitor's own table
 * out of `memory`, which is the 64K image the simulator exposes.
 */
export function displayCharacters(memory) {
    const characters = new Map();
    for (let i = 0; i < 16; i++) {
        characters.set(memory[DISPLAY_TABLE + i] & 0xff, i.toString(16).toUpperCase());
    }
    return characters;
}

/**
 * The six digits as text, with "?" for a pattern the table does not name --
 * the monitor also displays letters for its messages, which are not hex digits.
 */
export function decodeDisplay(store, memory) {
    const characters = displayCharacters(memory);
    return sdk85Display(store)
        .slice(0, DISPLAY_DIGITS)
        .map((byte) => characters.get((~byte & 0xff) & ~DISPLAY_DOT) ?? "?")
        .join("");
}

/** Which digits carry the decimal point, which the monitor uses as a cursor. */
export function decodeDisplayDots(store) {
    return sdk85Display(store)
        .slice(0, DISPLAY_DIGITS)
        .map((byte) => ((~byte & 0xff) & DISPLAY_DOT) !== 0);
}
