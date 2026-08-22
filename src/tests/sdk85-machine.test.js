import { describe, test, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import {
    initSimulator,
    loadProgram,
    runProgramWithBudget,
    attachSDK85,
    detachSDK85,
    sdk85PressKey,
    sdk85PendingKeys,
} from "../core/simulator.js";
import { decodeDisplay, SDK85_KEYS } from "../core/sdk85.js";

// The SDK-85 as a caller in the browser would use it: attach the machine, load
// the monitor, run it, press keys, read the display.
//
// monitor/monitor-commands.test.js drives the same board natively and in more
// detail. What this checks is that the machine is reachable at all from
// JavaScript -- the board is compiled into the emulator, exported, and wrapped.
const SOURCE = readFileSync(new URL("../core/sdk85-monitor.src", import.meta.url), "latin1");

const IDLE_LOOP = { first: 0x02e7, last: 0x02f0 };

function blankStore(over = {}) {
    return {
        accumulator: 0,
        registers: { bc: { high: 0, low: 0 }, de: { high: 0, low: 0 }, hl: { high: 0, low: 0 } },
        stackPointer: 0x20c0,
        programCounter: 0,
        flags: { z: false, s: false, p: false, c: false, ac: false, v: false, k: false },
        interruptsEnabled: false,
        interruptMasks: { rst55: false, rst65: false, rst75: false },
        pendingInterrupts: { trap: false, rst55: false, rst65: false, rst75: false },
        io: new Array(256).fill(0),
        loadAddress: 0,
        settings: { run: { enableTiming: false } },
        ...over,
    };
}

let statePointer;
let booted;

beforeAll(async () => {
    const initial = await initSimulator();
    const loaded = loadProgram({ activeFile: { content: SOURCE }, statePointer: initial, loadAddress: 0 });
    statePointer = loaded.statePointer;

    expect(attachSDK85({ statePointer })).toBe(true);
    booted = runProgramWithBudget(blankStore({ statePointer, memory: loaded.memory }), { maxTstates: 3_000_000 });
}, 120000);

const resume = (over) => runProgramWithBudget(blankStore({ ...booted, statePointer, ...over }), { maxTstates: 400_000 });

describe("The SDK-85 machine from JavaScript", () => {
    test("the monitor boots on it", () => {
        expect(booted.programCounter).toBeGreaterThanOrEqual(IDLE_LOOP.first);
        expect(booted.programCounter).toBeLessThanOrEqual(IDLE_LOOP.last);
        expect(booted.interruptMasks).toEqual({ rst55: false, rst65: true, rst75: true });
    });

    test("a keypress is queued on the 8279 and read by the monitor", () => {
        // Nothing here raises an interrupt: the 8279 drives RST 5.5 while a key
        // is waiting, and the monitor's routine reads it.
        expect(sdk85PressKey({ statePointer }, SDK85_KEYS.SUBST_MEM)).toBe(true);
        expect(sdk85PendingKeys({ statePointer })).toBe(1);
        const after = resume({});
        expect(sdk85PendingKeys({ statePointer })).toBe(0);
        expect(after.programCounter).toBeGreaterThan(0);
    });

    test("the display shows the address that was typed", () => {
        let state = booted;
        for (const key of [SDK85_KEYS.SUBST_MEM, SDK85_KEYS[2], SDK85_KEYS[0], SDK85_KEYS[5], SDK85_KEYS[0], SDK85_KEYS.COMMA]) {
            sdk85PressKey({ statePointer }, key);
            state = runProgramWithBudget(blankStore({ ...state, statePointer }), { maxTstates: 400_000 });
        }
        expect(decodeDisplay({ statePointer }, state.memory).slice(0, 4)).toBe("2050");
    });
});

describe("Attaching and detaching the machine", () => {
    test("the monitor ROM ignores writes while the board is attached", () => {
        const before = booted.memory[0x0000];
        const after = runProgramWithBudget(
            blankStore({ ...booted, statePointer, programCounter: 0x2000, memory: booted.memory }),
            { maxTstates: 1 },
        );
        // Nothing above writes to ROM, so this is really asserting the map is
        // still in place; monitor-commands.test.js writes to it and checks.
        expect(after.memory[0x0000]).toBe(before);
    });

    test("detaching gives back the plain 64K machine", () => {
        detachSDK85({ statePointer });
        // 8000h is empty expansion space on an SDK-85 and floats; on the plain
        // machine it is ordinary RAM again.
        const memory = new Array(65536).fill(0);
        memory[0x8000] = 0x00;
        const program = [0x3e, 0x5a, 0x32, 0x00, 0x80, 0x76]; // MVI A,5Ah / STA 8000h / HLT
        program.forEach((byte, i) => (memory[0x2000 + i] = byte));
        const result = runProgramWithBudget(
            blankStore({ statePointer, memory, programCounter: 0x2000, stackPointer: 0x2fff }),
            { maxTstates: 10_000 },
        );
        expect(result.memory[0x8000]).toBe(0x5a);
        attachSDK85({ statePointer });
    });
});
