import { describe, test, expect, beforeAll } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { assembleProgram } from "../../core/simulator.js";

// Drives the SDK-85 monitor by pressing keys on a modelled 8279, and checks
// what the monitor does with them.
//
// The board is assembled by src/core/machines/sdk85.h: ROM, RAM and the 8279
// mapped onto the address bus. The processor reaches the keyboard the same way
// it reaches anything else, and the 8279 drives RST 5.5 rather than anything
// poking an interrupt flag.
//
// Run natively because building a board means writing devices, and a device is
// a struct of function pointers. See harness.c.
const here = path.dirname(fileURLToPath(import.meta.url));
const harness = path.join(here, "harness");
const romPath = path.join(here, "monitor.bin");

// Key codes as the 8279 reports them on the SDK-85 keypad.
const KEY = {
    0: 0x00, 1: 0x01, 2: 0x02, 3: 0x03, 4: 0x04, 5: 0x05, 6: 0x06, 7: 0x07,
    8: 0x08, 9: 0x09, A: 0x0a, B: 0x0b, C: 0x0c, D: 0x0d, E: 0x0e, F: 0x0f,
    PERIOD: 0x10, COMMA: 0x11, GO: 0x12, SUBST: 0x13, EXAM: 0x14, STEP: 0x15,
};

// DSPTB, the monitor's character-to-segment table, and DTMSK, the bit it sets
// to light the decimal point.
const DSPTB = 0x0384;
const DOT = 0x08;

let rom;
let segmentToCharacter;

beforeAll(() => {
    execFileSync(path.join(here, "build.sh"), { stdio: "inherit" });

    const source = readFileSync(new URL("../../core/sdk85-monitor.src", import.meta.url), "latin1");
    rom = Buffer.alloc(0x10000);
    for (const byte of assembleProgram(source).assembled) rom[byte.currentAddress] = byte.data & 0xff;
    writeFileSync(romPath, rom);

    // The table is read out of the assembled ROM rather than copied here, so a
    // change to the monitor cannot leave the test decoding against stale
    // patterns.
    segmentToCharacter = new Map();
    for (let i = 0; i < 16; i++) segmentToCharacter.set(rom[DSPTB + i], i.toString(16).toUpperCase());
}, 120000);

function press(keys, dumps = []) {
    const args = [romPath];
    if (keys.length) args.push(keys.map((k) => k.toString(16)).join(","));
    else args.push("");
    if (dumps.length) args.push(dumps.map((d) => d.toString(16)).join(","));

    const output = execFileSync(harness, args, { encoding: "utf8", maxBuffer: 16 << 20 });

    const display = /^DISPLAY (.+)$/m.exec(output)[1].trim().split(/\s+/).map((b) => parseInt(b, 16));
    const memory = new Map(
        [...output.matchAll(/^MEM ([0-9A-F]{4}) ([0-9A-F]{2})$/gm)].map((m) => [parseInt(m[1], 16), parseInt(m[2], 16)]),
    );
    const rom = /^ROM ([0-9A-F]{2}) ([0-9A-F]{2})$/m.exec(output);
    const unmapped = /^UNMAPPED ([0-9A-F]{2})$/m.exec(output);
    const keyLines = [...output.matchAll(/^KEY ([0-9A-F]{2}) pc=([0-9A-F]{4}) curad=([0-9A-F]{4}) curdt=([0-9A-F]{2})$/gm)];
    const last = keyLines[keyLines.length - 1];

    return {
        display,
        memory,
        curad: last ? parseInt(last[3], 16) : null,
        curdt: last ? parseInt(last[4], 16) : null,
        boot: /^BOOT pc=([0-9A-F]{4}) sp=([0-9A-F]{4}) ibuff=([0-9A-F]{2})$/m.exec(output),
        rom: { before: parseInt(rom[1], 16), after: parseInt(rom[2], 16) },
        unmapped: parseInt(unmapped[1], 16),
        // The monitor complements each character before sending it, and may set
        // the decimal point bit, so both come off before the lookup.
        text: display
            .slice(0, 6)
            .map((b) => segmentToCharacter.get((~b & 0xff) & ~DOT) ?? "?")
            .join(""),
    };
}

describe("Driving the SDK-85 monitor from the keypad", () => {
    test("boots with an empty input buffer", () => {
        const { boot } = press([]);
        expect(parseInt(boot[3], 16)).toBe(0x80); // EMPTY
    });

    test("SUBST MEM shows the address that was typed", () => {
        const { text } = press([KEY.SUBST, KEY[2], KEY[0], KEY[5], KEY[0], KEY.COMMA]);
        // Four address digits, then the two data digits for that location.
        expect(text.slice(0, 4)).toBe("2050");
    });

    test("SUBST MEM records the address it was given", () => {
        const { curad } = press([KEY.SUBST, KEY[2], KEY[0], KEY[5], KEY[0], KEY.COMMA]);
        expect(curad).toBe(0x2050);
    });

    test("SUBST MEM writes the byte that was typed", () => {
        const { memory } = press(
            [KEY.SUBST, KEY[2], KEY[0], KEY[5], KEY[0], KEY.COMMA, KEY[7], KEY.F, KEY.COMMA],
            [0x2050],
        );
        expect(memory.get(0x2050)).toBe(0x7f);
    });

    test("SUBST MEM steps to the next location after a byte is entered", () => {
        const { curad } = press(
            [KEY.SUBST, KEY[2], KEY[0], KEY[5], KEY[0], KEY.COMMA, KEY[7], KEY.F, KEY.COMMA],
        );
        expect(curad).toBe(0x2051);
    });

    test("each keypress is delivered exactly once", () => {
        // The 8279's interrupt line is level sensitive, so a key held pending
        // would be read again on every EI and the address would come out as a
        // run of repeats rather than what was typed.
        const { text } = press([KEY.SUBST, KEY[2], KEY[0], KEY[4], KEY[8], KEY.COMMA]);
        expect(text.slice(0, 4)).toBe("2048");
    });

    test("EXAM REG reaches the register display", () => {
        // A different command through the same dispatch, so the table lookup in
        // CMMND is doing real work rather than always landing on SUBST.
        const { display } = press([KEY.EXAM, KEY[0]]);
        expect(display.slice(0, 4)).not.toEqual([0xff, 0xff, 0xff, 0xff]);
    });
});

describe("The SDK-85 memory map", () => {
    test("the monitor ROM ignores writes", () => {
        // 0000h is in the 8355's two kilobytes, which are mask ROM. On a flat
        // 64K of RAM this write would have patched the monitor.
        const { rom } = press([]);
        expect(rom.after).toBe(rom.before);
    });

    test("the empty expansion space floats high", () => {
        // Nothing is fitted above the 8155, so nothing drives the bus there.
        expect(press([]).unmapped).toBe(0xff);
    });
});
