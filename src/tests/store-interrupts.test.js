import { describe, test, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { store as appStore } from "../store/store.js";
import {
    initSimulator,
    loadProgram,
    runProgramWithBudget,
    attachSDK85,
    sdk85PressKey,
    sdk85PendingKeys,
} from "../core/simulator.js";

// The interrupt pins have to survive the application's store, not just the
// emulator's own round-trip.
//
// pendingInterrupts is what the processor sees, devices included; interruptPins
// is the half the application drives. Keeping only the first and handing it
// back asks the processor to hold a line a device had merely raised, and it
// stays held long after the cause has gone. cpuState.js falls back to
// pendingInterrupts when interruptPins is absent, which is what makes dropping
// the field quietly reintroduce that.
const SOURCE = readFileSync(new URL("../core/sdk85-monitor.src", import.meta.url), "latin1");

describe("The application store", () => {
    test("carries the interrupt pins as well as the processor's view", () => {
        expect(appStore).toHaveProperty("pendingInterrupts");
        expect(appStore).toHaveProperty("interruptPins");
    });

    test("persists the two together everywhere it persists either", () => {
        // A source check rather than a behavioural one: driving the component
        // needs a DOM, and the defect this guards against is a missing line
        // beside an existing one. The two belong together in every path that
        // writes back a result.
        const actions = readFileSync(new URL("../components/Actions.jsx", import.meta.url), "utf8");
        const view = actions.match(/draftStore\.pendingInterrupts = /g) ?? [];
        const pins = actions.match(/draftStore\.interruptPins = /g) ?? [];
        expect(view.length).toBeGreaterThan(0);
        expect(pins.length).toBe(view.length);
    });
});

describe("A state kept the way the application keeps it", () => {
    let statePointer;
    let booted;

    beforeAll(async () => {
        const initial = await initSimulator();
        const loaded = loadProgram({ activeFile: { content: SOURCE }, statePointer: initial, loadAddress: 0 });
        statePointer = loaded.statePointer;
        attachSDK85({ statePointer });
        booted = runProgramWithBudget(
            { ...blank(), statePointer, memory: loaded.memory },
            { maxTstates: 3_000_000 },
        );
    }, 120000);

    function blank() {
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
        };
    }

    // Keeps exactly what the application's store has room for, so a field
    // missing from it is missing here too.
    const keep = (result) => {
        const kept = blank();
        for (const key of Object.keys(appStore)) {
            if (key in result) kept[key] = result[key];
        }
        return { ...kept, statePointer, memory: result.memory };
    };

    test("releases a line the 8279 was driving once the key is read", () => {
        const memory = [...booted.memory];
        // DI / JMP self: never reads the keyboard, so the 8279 holds its line.
        memory[0x2000] = 0xf3;
        memory[0x2001] = 0xc3;
        memory[0x2002] = 0x01;
        memory[0x2003] = 0x20;

        let state = runProgramWithBudget({ ...blank(), statePointer, memory, programCounter: 0x2000 }, { maxTstates: 100_000 });
        sdk85PressKey({ statePointer }, 0x13);
        state = runProgramWithBudget(keep(state), { maxTstates: 100_000 });
        expect(state.pendingInterrupts.rst55).toBe(true);

        // Hand it back to the monitor, which reads the key.
        state = runProgramWithBudget({ ...keep(state), programCounter: 0 }, { maxTstates: 3_000_000 });

        expect(sdk85PendingKeys({ statePointer })).toBe(0);
        expect(state.pendingInterrupts.rst55).toBe(false);
    });
});
