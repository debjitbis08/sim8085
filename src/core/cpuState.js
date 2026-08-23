function getFlagValue(flags, pos) {
    var stringPos = flags.length - 1 - pos;
    return stringPos < 0 ? false : !!parseInt(flags[stringPos], 2);
}

function readUint8(simulator, pointer, def) {
    var v = simulator.getValue(pointer + 0, "i8", def);
    return v < 0 ? 256 + v : v;
}

function readUint16(simulator, pointer, def) {
    var v = simulator.getValue(pointer + 0, "i16", def);
    return v < 0 ? 65536 + v : v;
}

/**
 * The registers and flags on their own.
 *
 * Reading the whole state copies all 64K of memory out with it, which is far
 * too much for a caller that only wants to show what the processor holds --
 * and much too much to do repeatedly while a program runs.
 */
export function getRegistersFromPtr(simulator, statePtr) {
    var flags = simulator.getValue(statePtr + 12, "i8", 0).toString(2);
    return {
        a: readUint8(simulator, statePtr + 0, 0),
        b: readUint8(simulator, statePtr + 1, 0),
        c: readUint8(simulator, statePtr + 2, 0),
        d: readUint8(simulator, statePtr + 3, 0),
        e: readUint8(simulator, statePtr + 4, 0),
        h: readUint8(simulator, statePtr + 5, 0),
        l: readUint8(simulator, statePtr + 6, 0),
        sp: readUint16(simulator, statePtr + 8, "i16", 0),
        pc: readUint16(simulator, statePtr + 10, "i16", 0),
        flags: {
            z: getFlagValue(flags, 0),
            s: getFlagValue(flags, 1),
            p: getFlagValue(flags, 2),
            cy: getFlagValue(flags, 3),
            ac: getFlagValue(flags, 4),
            v: getFlagValue(flags, 5),
            k: getFlagValue(flags, 6),
        },
    };
}

export function getStateFromPtr(simulator, statePtr) {
    const getBool = (offset) => !!simulator.getValue(statePtr + offset, "i8", 0);
    var state = {
        ...getRegistersFromPtr(simulator, statePtr),
        interruptsEnabled: getBool(13),
        interruptMasks: {
            rst55: getBool(14),
            rst65: getBool(15),
            rst75: getBool(16),
        },
        // What the processor currently sees on its interrupt inputs: a
        // combination of the pins below and whatever the devices are driving.
        // Reading this and writing it back would hand a device's line to the
        // host, which would then hold it for ever.
        pendingInterrupts: {
            trap: getBool(17),
            rst55: getBool(18),
            rst65: getBool(19),
            rst75: getBool(20),
        },
        // The pins as driven from outside the processor. This is the half a
        // caller owns, and the half that survives a resume unchanged.
        interruptPins: {
            trap: getBool(26),
            rst55: getBool(27),
            rst65: getBool(28),
            rst75: getBool(29),
        },
        memory: (function () {
            var memoryPtr = simulator._getMemory(statePtr);
            var arr = [];
            var i = 0;
            var n = 0;
            while (i < 65536) {
                n = simulator.getValue(memoryPtr + i, "i8", 0);
                arr.push(n < 0 ? 256 + n : n);
                i++;
            }
            return arr;
        })(),
        io: (function () {
            const ioPointer = simulator._getIO(statePtr);
            const arr = [];
            let i = 0;
            let n = 0;
            while (i < 256) {
                n = simulator.getValue(ioPointer + i, "i8", 0);
                arr.push(n < 0 ? 256 + n : n);
                i++;
            }
            return arr;
        })(),
        ptr: statePtr,
    };

    return state;
}

function boolToBin(v) {
    if (v) {
        return 1;
    }

    return 0;
}

export function getInterruptStateFromPtr(simulator, statePtr) {
    const getBool = (offset) => !!simulator.getValue(statePtr + offset, "i8", 0);
    var state = {
        interruptsEnabled: getBool(13),
        interruptMasks: {
            rst55: getBool(14),
            rst65: getBool(15),
            rst75: getBool(16),
        },
        // What the processor currently sees on its interrupt inputs: a
        // combination of the pins below and whatever the devices are driving.
        // Reading this and writing it back would hand a device's line to the
        // host, which would then hold it for ever.
        pendingInterrupts: {
            trap: getBool(17),
            rst55: getBool(18),
            rst65: getBool(19),
            rst75: getBool(20),
        },
        // The pins as driven from outside the processor. This is the half a
        // caller owns, and the half that survives a resume unchanged.
        interruptPins: {
            trap: getBool(26),
            rst55: getBool(27),
            rst65: getBool(28),
            rst75: getBool(29),
        },
    };

    return state;
}

export function setState(simulator, statePtr, state) {
    simulator.setValue(statePtr + 0, state.a, "i8", 0);
    simulator.setValue(statePtr + 1, state.b, "i8", 0);
    simulator.setValue(statePtr + 2, state.c, "i8", 0);
    simulator.setValue(statePtr + 3, state.d, "i8", 0);
    simulator.setValue(statePtr + 4, state.e, "i8", 0);
    simulator.setValue(statePtr + 5, state.h, "i8", 0);
    simulator.setValue(statePtr + 6, state.l, "i8", 0);
    simulator.setValue(statePtr + 8, state.sp, "i16", 0);
    simulator.setValue(statePtr + 10, state.pc, "i16", 0);

    // Callers may omit the undocumented V and K flags, so coerce rather than
    // letting an undefined turn the whole byte into NaN.
    var flag = parseInt(
        [state.flags.z, state.flags.s, state.flags.p, state.flags.cy, state.flags.ac, state.flags.v, state.flags.k]
            .reverse()
            .map((f) => (f ? "1" : "0"))
            .join(""),
        2,
    );
    simulator.setValue(statePtr + 12, flag, "i8", 0);
    setInterruptState(simulator, statePtr, state);

    // Memory
    var memoryPtr = simulator._getMemory(statePtr);
    var i = 0;
    while (i < 65536) {
        simulator.setValue(memoryPtr + i, state.memory[i], "i8", 0);
        i++;
    }

    // IO
    const ioPointer = simulator._getIO(statePtr);
    i = 0;
    while (i < 256) {
        simulator.setValue(ioPointer + i, state.io[i], "i8", 0);
        i++;
    }
}

export function setInterruptState(simulator, statePtr, state) {
    simulator.setValue(statePtr + 13, boolToBin(state.interruptsEnabled), "i8", 0);
    simulator.setValue(statePtr + 14, boolToBin(state.interruptMasks?.rst55), "i8", 0);
    simulator.setValue(statePtr + 15, boolToBin(state.interruptMasks?.rst65), "i8", 0);
    simulator.setValue(statePtr + 16, boolToBin(state.interruptMasks?.rst75), "i8", 0);
    simulator.setValue(statePtr + 17, boolToBin(state.pendingInterrupts?.trap), "i8", 0);
    simulator.setValue(statePtr + 18, boolToBin(state.pendingInterrupts?.rst55), "i8", 0);
    simulator.setValue(statePtr + 19, boolToBin(state.pendingInterrupts?.rst65), "i8", 0);
    simulator.setValue(statePtr + 20, boolToBin(state.pendingInterrupts?.rst75), "i8", 0);
    // The pins a caller is driving. These are taken from interruptPins when the
    // caller has one -- a state read back from the processor does -- and only
    // fall back to pendingInterrupts for a caller that asks for an interrupt
    // without having read one out first.
    //
    // The distinction matters as soon as a device shares a line.
    // pendingInterrupts is what the processor sees, devices included, so
    // feeding it back in would make the host hold a line the 8279 had merely
    // raised for a moment, and it would still be held long after the key that
    // caused it had been read.
    const pins = state.interruptPins ?? state.pendingInterrupts;
    simulator.setValue(statePtr + 26, boolToBin(pins?.trap), "i8", 0);
    simulator.setValue(statePtr + 27, boolToBin(pins?.rst55), "i8", 0);
    simulator.setValue(statePtr + 28, boolToBin(pins?.rst65), "i8", 0);
    simulator.setValue(statePtr + 29, boolToBin(pins?.rst75), "i8", 0);
    // Clear execution-only state so one run cannot leak EI delay or the
    // one-shot pre-TRAP IE snapshot into another.
    simulator.setValue(statePtr + 23, 0, "i8", 0);
    simulator.setValue(statePtr + 24, 0, "i8", 0);
    simulator.setValue(statePtr + 25, 0, "i8", 0);
    // Offset 30, the RST 7.5 level the devices drove last sample, is
    // deliberately left alone. It belongs to the devices rather than to a run,
    // and clearing it would make a line a device is simply still holding look
    // like a fresh rising edge after every resume.
}

export function setPCValue(simulator, statePtr, pcValue) {
    simulator.setValue(statePtr + 10, pcValue, "i16", 0);
}

export function setRegisterState(simulator, statePtr, state) {
    simulator.setValue(statePtr + 0, state.a, "i8", 0);
    simulator.setValue(statePtr + 1, state.b, "i8", 0);
    simulator.setValue(statePtr + 2, state.c, "i8", 0);
    simulator.setValue(statePtr + 3, state.d, "i8", 0);
    simulator.setValue(statePtr + 4, state.e, "i8", 0);
    simulator.setValue(statePtr + 5, state.h, "i8", 0);
    simulator.setValue(statePtr + 6, state.l, "i8", 0);
    simulator.setValue(statePtr + 8, state.sp, "i16", 0);
    simulator.setValue(statePtr + 10, state.pc, "i16", 0);
}

export function setFlagState(simulator, statePtr, state) {
    // Callers may omit the undocumented V and K flags, so coerce rather than
    // letting an undefined turn the whole byte into NaN.
    var flag = parseInt(
        [state.flags.z, state.flags.s, state.flags.p, state.flags.cy, state.flags.ac, state.flags.v, state.flags.k]
            .reverse()
            .map((f) => (f ? "1" : "0"))
            .join(""),
        2,
    );
    simulator.setValue(statePtr + 12, flag, "i8", 0);
}
