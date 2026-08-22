import Module from "./8085.js";
import { expandMacros, remapLocations } from "./macroPreprocessor.js";
import {
    getInterruptStateFromPtr,
    getStateFromPtr,
    setFlagState,
    setInterruptState as setInterruptStateFromPtr,
    setPCValue,
    setRegisterState,
    setState,
} from "./cpuState.js";
import { parse } from "../core/8085.pegjs";

let simulator = null;
let execute8085Program = null;
let execute8085ProgramSlice = null;
let load8085Program = null;
let unload8085Program = null;
let execute8085ProgramUntil = null;
let interruptToHalt = null;
let attachSDK85Machine = null;
let detachSDK85Machine = null;
let sdk85PressKeyRaw = null;
let sdk85DisplayPointer = null;
let sdk85PendingKeysRaw = null;
let getLastTotalTstates = null;
let getLastMaxStackBytes = null;
let statePointer = null;

// ExecuteProgramSlice takes its budget as a uint16_t, so a single slice can
// spend at most 65535 T-states; runProgramWithBudget loops over slices.
const SLICE_TSTATES = 0xf000;
const DEFAULT_TSTATE_BUDGET = 5_000_000;

export const setIOWriteCallback = (function () {
    let callback = null;

    globalThis.io_write = function (address, value) {
        if (callback) {
            callback(address, value);
        }
    };

    return function (fn) {
        callback = fn;
    };
})();

// Initialize the simulator asynchronously
export async function initSimulator() {
    simulator = await Module();
    execute8085Program = simulator.cwrap("ExecuteProgram", "number", ["number", "number"]);
    execute8085ProgramSlice = simulator.cwrap("ExecuteProgramSlice", null, ["number", "number", "number", "number"]);
    execute8085ProgramUntil = simulator.cwrap("ExecuteProgramUntil", "number", [
        "number",
        "number",
        "number",
        "number",
    ]);
    load8085Program = simulator.cwrap("LoadProgram", "number", ["number", "array", "number", "number"]);
    unload8085Program = simulator.cwrap("UnloadProgram", "number", ["number", "array", "number", "number"]);
    interruptToHalt = simulator.cwrap("InterruptToHalt", "number", ["number"]);
    attachSDK85Machine = simulator.cwrap("attachSDK85", "number", ["number"]);
    detachSDK85Machine = simulator.cwrap("detachSDK85", null, ["number"]);
    sdk85PressKeyRaw = simulator.cwrap("sdk85PressKey", "number", ["number", "number"]);
    sdk85DisplayPointer = simulator.cwrap("sdk85Display", "number", ["number"]);
    sdk85PendingKeysRaw = simulator.cwrap("sdk85PendingKeys", "number", ["number"]);
    getLastTotalTstates = simulator._get_last_total_tstates
        ? simulator.cwrap("get_last_total_tstates", "number", [])
        : null;
    getLastMaxStackBytes = simulator._get_last_max_stack_bytes
        ? simulator.cwrap("get_last_max_stack_bytes", "number", [])
        : null;

    // Initialize the state pointer
    statePointer = simulator._Init8085();

    console.log("State Pointer", statePointer);
    console.log("Memory Pointer", simulator._getMemory(statePointer));
    console.log("IO Pointer", simulator._getIO(statePointer));

    // Added because on first run, the address 0x16c4 was set with
    // value 0x28, which I have no idea why.
    setAllMemoryLocations({
        statePointer,
        memory: Array(65536).fill(0),
    });

    return statePointer; // Return the initial state pointer
}

// Assemble program using provided code
export function assembleProgram(code) {
    // Macros are expanded before parsing, which can change how many lines the
    // grammar sees. lineMap carries the mapping back, so every location the
    // caller receives still refers to the source the user wrote.
    const { text, lineMap } = expandMacros(code);
    try {
        return remapLocations(parse(text), lineMap, code);
    } catch (e) {
        if (lineMap && e.location) {
            remapLocations({ location: e.location }, lineMap, code);
        }
        console.log("Failed to assemble program:", e);
        throw e;
    }
}

// Pack address into two bytes (helper function)
export function packAddress(address) {
    const lowByte = address & 0xff; // Extract the low byte
    const highByte = (address >> 8) & 0xff; // Extract the high byte
    return [lowByte, highByte];
}

// Load the program into the simulator memory
export function loadProgram(store) {
    let { pcStartValue, assembled } = assembleProgram(store.activeFile.content);

    if (!assembled) return;

    assembled = assembled.map((a) => {
        a.breakHere = false;
        return a;
    });

    const flattenedProgram = assembled.flatMap((line) => {
        const [lowByte, highByte] = packAddress(line.currentAddress);
        return [line.data, lowByte, highByte, line.kind === "code" ? 1 : line.kind === "addr" ? 2 : 3];
    });

    // Load the program into the simulator memory
    const newStatePointer = load8085Program(
        store.statePointer,
        flattenedProgram,
        flattenedProgram.length / 4,
        store.loadAddress,
    );

    const state = getStateFromPtr(simulator, newStatePointer);

    return {
        statePointer: newStatePointer,
        assembled,
        pcStartValue,
        memory: state.memory,
    };
}

export function unloadProgram(store) {
    const assembled = store.assembled;

    if (!assembled) return;

    const flattenedProgram = assembled.flatMap((line) => {
        const [lowByte, highByte] = packAddress(line.currentAddress);
        return [line.data, lowByte, highByte, line.kind === "code" ? 1 : line.kind === "addr" ? 2 : 3];
    });

    // Load the program into the simulator memory
    const newStatePointer = unload8085Program(
        store.statePointer,
        flattenedProgram,
        flattenedProgram.length / 4,
        store.loadAddress,
    );
}

// Run the program on the simulator
export function runProgram(store) {
    var inputState = getCpuState(store);

    // TODO Check why Loaded state check is needed
    if (store.programState === "Loaded") {
        setState(simulator, store.statePointer, inputState);
    }

    // const loadAddress = Math.min(...store.assembled.map((line) => line.currentAddress));

    if (store.settings.run.enableTiming) {
        simulator.ccall("set_timing_enabled", "void", ["number"], [1]);
    } else {
        simulator.ccall("set_timing_enabled", "void", ["number"], [0]);
    }

    const clockFrequency = Number.parseInt(store.settings.run.clockFrequency);
    simulator.ccall("set_clock_frequency", "void", ["number"], [clockFrequency]);

    try {
        const start = performance.now();
        const newStatePointer = execute8085Program(store.statePointer, inputState.pc);
        const end = performance.now();
        console.log("Execution Time", end - start);
        const outputState = getStateFromPtr(simulator, newStatePointer);
        const tstates = getLastTotalTstates ? getLastTotalTstates() : null;
        const maxStackBytes = getLastMaxStackBytes ? getLastMaxStackBytes() : null;

        return {
            accumulator: outputState.a,
            registers: {
                bc: { high: outputState.b, low: outputState.c },
                de: { high: outputState.d, low: outputState.e },
                hl: { high: outputState.h, low: outputState.l },
            },
            flags: {
                z: outputState.flags.z || false,
                s: outputState.flags.s || false,
                p: outputState.flags.p || false,
                c: outputState.flags.cy || false,
                ac: outputState.flags.ac || false,
                v: outputState.flags.v || false,
                k: outputState.flags.k || false,
            },
            interruptsEnabled: outputState.interruptsEnabled,
            interruptMasks: outputState.interruptMasks,
            pendingInterrupts: outputState.pendingInterrupts,
            interruptPins: outputState.interruptPins,
            stackPointer: outputState.sp,
            programCounter: outputState.pc,
            memory: outputState.memory,
            io: outputState.io,
            statePointer: newStatePointer,
            metrics: {
                totalTstates: tstates,
                maxStackBytes,
            },
        };
    } catch (e) {
        console.error("Execution failed:", e);
        throw e;
    }
}

export function runProgramInSlices(store, onStateUpdate) {
    var inputState = getCpuState(store);

    // TODO Check why Loaded state check is needed
    if (store.programState === "Loaded") {
        setState(simulator, store.statePointer, inputState);
    }

    // const loadAddress = Math.min(...store.assembled.map((line) => line.currentAddress));

    // Always enable timing when running in slice mode.
    simulator.ccall("set_timing_enabled", "void", ["number"], [1]);

    const clockFrequency = Number.parseInt(store.settings.run.clockFrequency);
    simulator.ccall("set_clock_frequency", "void", ["number"], [clockFrequency]);

    const resultPtr = simulator._malloc(8);

    let lastSliceMs = 200;

    let totalTstates = 0;

    function step(isFirst) {
        const start = performance.now();
        try {
            execute8085ProgramSlice(
                store.statePointer,
                isFirst ? store.pc : -1,
                // How many T-States required for lastSliceMs
                Math.floor(clockFrequency * (lastSliceMs / 1000)),
                resultPtr,
            );
            const outputState = getStateFromPtr(simulator, store.statePointer);

            const halted = simulator.getValue(resultPtr, "i32");
            const tstates = simulator.getValue(resultPtr + 4, "i32");
            totalTstates += tstates;

            const maxStackBytes = getLastMaxStackBytes ? getLastMaxStackBytes() : null;

            onStateUpdate(halted, {
                accumulator: outputState.a,
                registers: {
                    bc: { high: outputState.b, low: outputState.c },
                    de: { high: outputState.d, low: outputState.e },
                    hl: { high: outputState.h, low: outputState.l },
                },
                flags: {
                    z: outputState.flags.z || false,
                    s: outputState.flags.s || false,
                    p: outputState.flags.p || false,
                    c: outputState.flags.cy || false,
                    ac: outputState.flags.ac || false,
                    v: outputState.flags.v || false,
                    k: outputState.flags.k || false,
                },
                interruptsEnabled: outputState.interruptsEnabled,
                interruptMasks: outputState.interruptMasks,
                pendingInterrupts: outputState.pendingInterrupts,
                interruptPins: outputState.interruptPins,
                stackPointer: outputState.sp,
                programCounter: outputState.pc,
                memory: outputState.memory,
                io: outputState.io,
                statePointer: store.statePointer,
                metrics: {
                    lastSliceTstates: tstates,
                    totalTstates,
                    maxStackBytes,
                },
            });

            if (!halted) {
                const end = performance.now();
                const actualTimeTaken = end - start;
                const delayMs = (1000 * tstates) / clockFrequency;
                const remainingDelay = Math.max(0, delayMs - actualTimeTaken);
                lastSliceMs = 0.75 * lastSliceMs + 0.25 * actualTimeTaken;
                console.log(
                    `Used ${tstates} T-states in ${actualTimeTaken.toFixed(2)}ms; next sliceMs = ${lastSliceMs.toFixed(2)}`,
                );
                setTimeout(function () {
                    step(false);
                }, remainingDelay);
            } else {
                simulator._free(resultPtr);
            }
        } catch (e) {
            console.error("Execution failed:", e);
            simulator._free(resultPtr);
            throw e;
        }
    }

    step(true);
}

/**
 * Run the loaded program to completion under a T-state budget.
 *
 * Unlike `runProgram`, this never calls into `ExecuteProgram`, whose fixed
 * 100000-instruction cap raises `exit(2)`. It drives `ExecuteProgramSlice`
 * instead, which stops cleanly once a slice's T-state budget is spent, so a
 * program that never halts comes back as `exhausted` rather than as an
 * exception. Intended for automated checking, where the caller needs a
 * verdict rather than an animation.
 *
 * The slice offset is always -1. `Emulate8085Op` resets SP to 0xFFFF whenever
 * PC equals the offset it is given, so passing -1 keeps the caller's PC and SP
 * exactly as `store` specifies.
 */
export function runProgramWithBudget(store, options = {}) {
    const maxTstates = options.maxTstates ?? DEFAULT_TSTATE_BUDGET;

    const inputState = getCpuState(store);
    setState(simulator, store.statePointer, inputState);

    const resultPtr = simulator._malloc(8);
    let totalTstates = 0;
    let halted = false;

    try {
        while (!halted && totalTstates < maxTstates) {
            execute8085ProgramSlice(store.statePointer, -1, SLICE_TSTATES, resultPtr);

            halted = simulator.getValue(resultPtr, "i32") !== 0;
            const sliceTstates = simulator.getValue(resultPtr + 4, "i32");
            totalTstates += sliceTstates;

            // A slice that neither halts nor advances would spin forever, so
            // treat it as exhausted.
            if (sliceTstates <= 0 && !halted) break;
        }
    } finally {
        simulator._free(resultPtr);
    }

    const outputState = getStateFromPtr(simulator, store.statePointer);

    return {
        accumulator: outputState.a,
        registers: {
            bc: { high: outputState.b, low: outputState.c },
            de: { high: outputState.d, low: outputState.e },
            hl: { high: outputState.h, low: outputState.l },
        },
        flags: {
            z: outputState.flags.z || false,
            s: outputState.flags.s || false,
            p: outputState.flags.p || false,
            c: outputState.flags.cy || false,
            ac: outputState.flags.ac || false,
            v: outputState.flags.v || false,
            k: outputState.flags.k || false,
        },
        interruptsEnabled: outputState.interruptsEnabled,
        interruptMasks: outputState.interruptMasks,
        pendingInterrupts: outputState.pendingInterrupts,
        interruptPins: outputState.interruptPins,
        stackPointer: outputState.sp,
        programCounter: outputState.pc,
        memory: outputState.memory,
        io: outputState.io,
        statePointer: store.statePointer,
        halted,
        exhausted: !halted,
        metrics: {
            totalTstates,
        },
    };
}

export function runSingleInstruction(store) {
    var inputState = getCpuState(store);

    // const loadAddress = Math.min(...store.assembled.map((line) => line.currentAddress));

    try {
        const status = simulator._Emulate8085Op(inputState.ptr, store.pcStartValue);
        const outputState = getStateFromPtr(simulator, inputState.ptr);

        return [
            status,
            {
                accumulator: outputState.a,
                registers: {
                    bc: { high: outputState.b, low: outputState.c },
                    de: { high: outputState.d, low: outputState.e },
                    hl: { high: outputState.h, low: outputState.l },
                },
                flags: {
                    z: outputState.flags.z,
                    s: outputState.flags.s,
                    p: outputState.flags.p,
                    c: outputState.flags.cy,
                    ac: outputState.flags.ac,
                    v: outputState.flags.v,
                    k: outputState.flags.k,
                },
                interruptsEnabled: outputState.interruptsEnabled,
                interruptMasks: outputState.interruptMasks,
                pendingInterrupts: outputState.pendingInterrupts,
                interruptPins: outputState.interruptPins,
                stackPointer: outputState.sp,
                programCounter: outputState.pc,
                memory: outputState.memory,
                io: outputState.io,
                statePointer: inputState.ptr,
            },
        ];
    } catch (e) {
        console.error("Execution failed:", e);
        throw new Error("Execution failed");
    }
}

// Helper function to extract the CPU state from the store
export function getCpuState(store) {
    return {
        a: store.accumulator,
        b: store.registers.bc.high,
        c: store.registers.bc.low,
        d: store.registers.de.high,
        e: store.registers.de.low,
        h: store.registers.hl.high,
        l: store.registers.hl.low,
        sp: store.stackPointer,
        pc: store.programCounter,
        flags: {
            z: store.flags.z,
            s: store.flags.s,
            p: store.flags.p,
            cy: store.flags.c,
            ac: store.flags.ac,
            v: store.flags.v,
            k: store.flags.k,
        },
        interruptsEnabled: store.interruptsEnabled ?? false,
        interruptMasks: store.interruptMasks ?? { rst55: false, rst65: false, rst75: false },
        pendingInterrupts: store.pendingInterrupts ?? { trap: false, rst55: false, rst65: false, rst75: false },
        // Passed through so that resuming from a state read out of the
        // processor restores the pins the caller was driving, rather than
        // whatever the processor last saw on them.
        interruptPins: store.interruptPins,
        memory: store.memory,
        io: store.io,
        ptr: store.statePointer,
    };
}

export function startDebug(store) {
    var inputState = getCpuState(store);

    if (store.programState === "Loaded") {
        setState(simulator, store.statePointer, inputState);
    }
}

export function setPC(store, value) {
    setPCValue(simulator, store.statePointer, value);
}

export function setMemoryLocation(store, location, value) {
    const memoryPointer = simulator._getMemory(store.statePointer);
    simulator.setValue(memoryPointer + location, value, "i8", 0);
}

export function setAllMemoryLocations(store) {
    const memoryPtr = simulator._getMemory(store.statePointer);
    let i = 0;
    while (i < 65536) {
        simulator.setValue(memoryPtr + i, store.memory[i], "i8", 0);
        i++;
    }
}

export function setIOPort(store, location, value) {
    const ioPointer = simulator._getIO(store.statePointer);
    simulator.setValue(ioPointer + location, value, "i8", 0);
}

export function getFullState(store) {
    return getStateFromPtr(simulator, store.statePointer);
}

export function setFullState(store) {
    setState(simulator, store.statePointer, getCpuState(store));
}

export function setRegisters(store) {
    setRegisterState(simulator, store.statePointer, getCpuState(store));
}

export function setFlags(store) {
    setFlagState(simulator, store.statePointer, getCpuState(store));
}

export function setInterruptState(store) {
    setInterruptStateFromPtr(simulator, store.statePointer, getCpuState(store));
}

export function halt(store) {
    interruptToHalt(store.statePointer);
}

export function setInterruptLine(name, active) {
    switch (name) {
        case "trap":
            return simulator._triggerInterrupt(statePointer, 45, active);
        case "rst5.5":
            return simulator._triggerInterrupt(statePointer, 55, active);
        case "rst6.5":
            return simulator._triggerInterrupt(statePointer, 65, active);
        case "rst7.5":
            return simulator._triggerInterrupt(statePointer, 75, active);
        default:
            console.warn("Unknown Interrupt", name);
            return 0;
    }
}

export function getInterruptState(store) {
    return getInterruptStateFromPtr(simulator, store.statePointer);
}

// ---------------------------------------------------------------------------
// The SDK-85.
//
// A board is a different machine rather than a mode of this one: attaching it
// remaps the address bus, putting ROM where the monitor lives, RAM where the
// 8155 is, and the 8279 keyboard and display controller in between. The default
// machine -- 64K of RAM and no peripherals -- is what every other caller here
// gets, and detachSDK85 returns to it.
// ---------------------------------------------------------------------------

/** Plugs the processor into an SDK-85. */
export function attachSDK85(store) {
    return attachSDK85Machine(store.statePointer) !== 0;
}

/** Returns to the plain 64K machine. */
export function detachSDK85(store) {
    detachSDK85Machine(store.statePointer);
}

/**
 * Queues a keypress on the 8279. Returns false if its FIFO is full, which is
 * what the real part does with a key it has no room for.
 *
 * The key is not delivered here: the 8279 raises RST 5.5 and the monitor's
 * interrupt routine reads it, so the machine has to be running for anything to
 * happen.
 */
export function sdk85PressKey(store, code) {
    return sdk85PressKeyRaw(store.statePointer, code & 0x3f) !== 0;
}

/** How many keys are still waiting to be read. */
export function sdk85PendingKeys(store) {
    return sdk85PendingKeysRaw(store.statePointer);
}

/**
 * The 8279's display RAM. Six of its sixteen bytes are wired to digits on an
 * SDK-85, and each holds the segment pattern the monitor sent, complemented --
 * see decodeDisplay in sdk85.js.
 */
export function sdk85Display(store) {
    const pointer = sdk85DisplayPointer(store.statePointer);
    if (!pointer) return [];
    const bytes = [];
    for (let i = 0; i < 16; i++) bytes.push(simulator.getValue(pointer + i, "i8") & 0xff);
    return bytes;
}
