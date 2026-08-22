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

function press(keys, dumps = [], pokes = {}) {
    const args = [romPath];
    if (keys.length) args.push(keys.map((k) => k.toString(16)).join(","));
    else args.push("");
    const pokeList = Object.entries(pokes);
    if (dumps.length || pokeList.length) args.push(dumps.map((d) => d.toString(16)).join(","));
    if (pokeList.length) {
        args.push(pokeList.map(([a, v]) => `${Number(a).toString(16)}:${v.toString(16)}`).join(","));
    }

    const output = execFileSync(harness, args, { encoding: "utf8", maxBuffer: 16 << 20 });

    const display = /^DISPLAY (.+)$/m.exec(output)[1].trim().split(/\s+/).map((b) => parseInt(b, 16));
    const memory = new Map(
        [...output.matchAll(/^MEM ([0-9A-F]{4}) ([0-9A-F]{2})$/gm)].map((m) => [parseInt(m[1], 16), parseInt(m[2], 16)]),
    );
    const rom = /^ROM ([0-9A-F]{2}) ([0-9A-F]{2})$/m.exec(output);
    const timer = /^TIMER reload=(\d+) mode=([0-9A-F]{2}) timeouts=(\d+)$/m.exec(output);
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
        timer: { reload: Number(timer[1]), mode: parseInt(timer[2], 16), timeouts: Number(timer[3]) },
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

// The monitor keeps the user's program counter here while it is in control.
const PSAV = 0x20f2;
const word = (memory, address) => memory.get(address) | (memory.get(address + 1) << 8);

describe("GO", () => {
    // MVI A,42h / STA 2060h / JMP self, so that running it leaves a mark.
    const program = {
        0x2050: 0x3e, 0x2051: 0x42, 0x2052: 0x32, 0x2053: 0x60, 0x2054: 0x20,
        0x2055: 0xc3, 0x2056: 0x55, 0x2057: 0x20,
    };
    const keys = [KEY.GO, KEY[2], KEY[0], KEY[5], KEY[0], KEY.PERIOD];

    test("runs the user program at the address given", () => {
        expect(press(keys, [0x2060], program).memory.get(0x2060)).toBe(0x42);
    });
});

describe("SINGLE STEP", () => {
    // Single step works by loading the 8155's timer with a count chosen so that
    // TIMER OUT, which is wired to TRAP, fires one user instruction after the
    // monitor has restored the user's registers and jumped to them.
    const step = (program) =>
        press([KEY.STEP, KEY[2], KEY[0], KEY[5], KEY[0], KEY.COMMA], [PSAV, PSAV + 1], program);

    test("executes exactly one instruction", () => {
        const { memory } = step({ 0x2050: 0x00, 0x2051: 0x00, 0x2052: 0x00 });
        expect(word(memory, PSAV)).toBe(0x2051);
    });

    test("follows the instruction it stepped", () => {
        // JMP 2060h. Landing on 2060h proves one instruction ran and that the
        // saved program counter is the user's, not a byte count.
        const { memory } = step({ 0x2050: 0xc3, 0x2051: 0x60, 0x2052: 0x20 });
        expect(word(memory, PSAV)).toBe(0x2060);
    });

    test("uses the 8155 timer to get there", () => {
        const { timer } = step({ 0x2050: 0x00, 0x2051: 0x00 });
        expect(timer.timeouts).toBeGreaterThan(0);
        // TIMER and TMODE from the monitor source: 197 counts, square wave.
        expect(timer.reload).toBe(197);
        expect(timer.mode).toBe(0x40);
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
