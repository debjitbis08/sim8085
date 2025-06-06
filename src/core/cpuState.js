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

export function getStateFromPtr(simulator, statePtr) {
    const getBool = (offset) => !!simulator.getValue(statePtr + offset, "i8", 0);
    var flags = simulator.getValue(statePtr + 12, "i8", 0).toString(2);
    var state = {
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
        },
        interruptsEnabled: getBool(13),
        interruptMasks: {
            rst55: getBool(14),
            rst65: getBool(15),
            rst75: getBool(16),
        },
        pendingInterrupts: {
            trap: getBool(17),
            rst55: getBool(18),
            rst65: getBool(19),
            rst75: getBool(20),
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
        pendingInterrupts: {
            trap: getBool(17),
            rst55: getBool(18),
            rst65: getBool(19),
            rst75: getBool(20),
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

    var flag = parseInt(
        [state.flags.z, state.flags.s, state.flags.p, state.flags.cy, state.flags.ac]
            .reverse()
            .map(Number)
            .map(String)
            .join(""),
        2,
    );
    simulator.setValue(statePtr + 12, flag, "i8", 0);

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
    var flag = parseInt(
        [state.flags.z, state.flags.s, state.flags.p, state.flags.cy, state.flags.ac]
            .reverse()
            .map(Number)
            .map(String)
            .join(""),
        2,
    );
    simulator.setValue(statePtr + 12, flag, "i8", 0);
}
