"use strict";

function getFlagValue(flags, pos) {
  var stringPos = (flags.length - 1) - pos;
  return stringPos < 0 ? false : !!(parseInt(flags[stringPos], 2));
}

function getStateFromPtr (simulator, statePtr) {
    var flags = simulator.getValue(statePtr + 12, 'i8', 0).toString(2);
    var state = {
      a: simulator.getValue(statePtr + 0, 'i8', 0),
      b: simulator.getValue(statePtr + 1, 'i8', 0),
      c: simulator.getValue(statePtr + 2, 'i8', 0),
      d: simulator.getValue(statePtr + 3, 'i8', 0),
      e: simulator.getValue(statePtr + 4, 'i8', 0),
      h: simulator.getValue(statePtr + 5, 'i8', 0),
      l: simulator.getValue(statePtr + 6, 'i8', 0),
      sp: simulator.getValue(statePtr + 8, 'i16', 0),
      pc: simulator.getValue(statePtr + 10, 'i16', 0),
      flags: {
        z: getFlagValue(flags, 0),
        s: getFlagValue(flags, 1),
        p: getFlagValue(flags, 2),
        cy: getFlagValue(flags, 3),
        ac: getFlagValue(flags, 4)
      },
      memory: (function () {
        var memoryPtr = statePtr + 24;
        var arr = [];
        var i = 0;
        var n = 0;
        while (i < 65536) {
          n = simulator.getValue(memoryPtr + i, 'i8', 0);
          arr.push(n < 0 ? 256 + n : n);
          i++;
        }
        return arr;
      })(),
      ptr: statePtr
    };

    return state;
}

function boolToBin (v) {
  if (v) { return 1; }

  return 0;
}

function setState (simulator, statePtr, state) {
    simulator.setValue(statePtr + 0, state.a, 'i8', 0);
    simulator.setValue(statePtr + 1, state.b, 'i8', 0);
    simulator.setValue(statePtr + 2, state.c, 'i8', 0);
    simulator.setValue(statePtr + 3, state.d, 'i8', 0);
    simulator.setValue(statePtr + 4, state.e, 'i8', 0);
    simulator.setValue(statePtr + 5, state.h, 'i8', 0);
    simulator.setValue(statePtr + 6, state.l, 'i8', 0);
    simulator.setValue(statePtr + 8, state.sp, 'i16', 0);
    simulator.setValue(statePtr + 10, state.pc, 'i16', 0);

    var flag = parseInt([
      state.flags.z,
      state.flags.s,
      state.flags.p,
      state.flags.cy,
      state.flags.ac,
    ].reverse().map(Number).map(String).join(''), 2);
    simulator.setValue(statePtr + 12, flag, 'i8', 0);

    // Memory
    var memoryPtr = statePtr + 24;
    var i = 0;
    while (i < 65536) {
      simulator.setValue(memoryPtr + i, state.memory[i], 'i8', 0);
      i++;
    }
}

module.exports = {
  getStateFromPtr: getStateFromPtr,
  setState: setState
}
