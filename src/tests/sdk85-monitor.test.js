import { describe, test, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { initSimulator, loadProgram, runProgramWithBudget } from "../core/simulator.js";

// Boots the real SDK-85 monitor ROM in the emulator and drives its interrupts.
//
// Everything else in the suite checks one thing at a time. This assembles two
// kilobytes of Intel's 1977 code, starts it from reset, and lets it run: the
// assembler, the instruction set, the stack, RAM, EI and SIM all have to be
// right together or the monitor never reaches its idle loop.
//
// The source is src/core/sdk85-monitor.src, whose object code
// sdk85-image.test.js checks byte for byte against Intel's listing.
const SOURCE = readFileSync(new URL("../core/sdk85-monitor.src", import.meta.url), "latin1");

// After its cold start the monitor sits in this loop, polling a RAM flag and
// re-enabling interrupts on each pass, waiting for a keypress.
const IDLE_LOOP = { first: 0x02e7, last: 0x02f0 };

// Where the monitor's own vector JMPs land. Reaching one of these proves the
// vector at 0024h/002Ch/0034h/003Ch was taken and followed, not merely that
// something happened.
const HANDLERS = {
    trap: { entry: 0x0157, name: "STP25, the single step routine" },
    rst55: { entry: 0x028e, name: "ININT, the input interrupt routine" },
    rst65: { entry: 0x20c8, name: "RST65, a RAM vector the user fills in" },
    rst75: { entry: 0x20ce, name: "USINT, a RAM vector the user fills in" },
};

const HLT = 0x76;

function store(over = {}) {
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
    booted = runProgramWithBudget(store({ statePointer, memory: loaded.memory }), { maxTstates: 3_000_000 });
}, 120000);

// Resumes from the booted state with one interrupt line asserted, and a HLT
// planted at the handler so that `halted` says whether the vector was taken.
function interrupt(which, { masks } = {}) {
    const memory = [...booted.memory];
    memory[HANDLERS[which].entry] = HLT;
    return runProgramWithBudget(
        store({
            ...booted,
            statePointer,
            memory,
            interruptMasks: masks ?? booted.interruptMasks,
            pendingInterrupts: { ...booted.pendingInterrupts, [which]: true },
        }),
        { maxTstates: 400_000 },
    );
}

describe("The SDK-85 monitor booting in the emulator", () => {
    test("reaches its idle loop from reset", () => {
        expect(booted.programCounter).toBeGreaterThanOrEqual(IDLE_LOOP.first);
        expect(booted.programCounter).toBeLessThanOrEqual(IDLE_LOOP.last);
    });

    test("never halts and never stalls", () => {
        // A monitor waiting for a keypress runs forever; stopping early would
        // mean it hit a HLT or an instruction that made no progress.
        expect(booted.exhausted).toBe(true);
        expect(booted.halted).toBe(false);
    });

    test("puts its stack in RAM", () => {
        // MNSTK is the top of the monitor stack, in the 8155's RAM at 20xxh.
        expect(booted.stackPointer).toBeGreaterThan(0x2000);
        expect(booted.stackPointer).toBeLessThan(0x2100);
    });

    test("enables interrupts and sets the masks its SIM asks for", () => {
        // The cold start unmasks RST 5.5 for the keyboard and masks the other
        // two. Getting this right needs both EI and SIM to work.
        expect(booted.interruptsEnabled).toBe(true);
        expect(booted.interruptMasks).toEqual({ rst55: false, rst65: true, rst75: true });
    });
});

describe("The SDK-85 monitor servicing interrupts", () => {
    test("TRAP is taken and reaches the single step routine", () => {
        const result = interrupt("trap");
        expect(result.halted).toBe(true);
        expect(result.programCounter).toBe(HANDLERS.trap.entry + 1);
    });

    test("TRAP is consumed once it has been taken", () => {
        expect(interrupt("trap").pendingInterrupts.trap).toBe(false);
    });

    test("RST 5.5 is taken and reaches the input interrupt routine", () => {
        const result = interrupt("rst55");
        expect(result.halted).toBe(true);
        expect(result.programCounter).toBe(HANDLERS.rst55.entry + 1);
    });

    test.each(["rst65", "rst75"])("%s is ignored while the monitor has it masked", (which) => {
        const result = interrupt(which);
        expect(result.halted).toBe(false);
        expect(result.programCounter).toBeGreaterThanOrEqual(IDLE_LOOP.first);
        expect(result.programCounter).toBeLessThanOrEqual(IDLE_LOOP.last);
    });

    test.each(["rst65", "rst75"])("%s is taken once unmasked, so the mask is what blocked it", (which) => {
        const result = interrupt(which, { masks: { ...booted.interruptMasks, [which]: false } });
        expect(result.halted).toBe(true);
        expect(result.programCounter).toBe(HANDLERS[which].entry + 1);
    });
});
