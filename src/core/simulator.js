import Module from './8085.js';
import { getStateFromPtr, setFlagState, setPCValue, setRegisterState, setState } from './cpuState.js';
import { parse } from '../core/8085.pegjs';

let simulator = null;
let execute8085Program = null;
let load8085Program = null;
let unload8085Program = null;
let execute8085ProgramUntil = null;
let statePointer = null;

// Initialize the simulator asynchronously
export async function initSimulator() {
  simulator = await Module();
  execute8085Program = simulator.cwrap('ExecuteProgram', 'number', ['number', 'number']);
  execute8085ProgramUntil = simulator.cwrap('ExecuteProgramUntil', 'number', ['number', 'number', 'number', 'number']);
  load8085Program = simulator.cwrap('LoadProgram', 'number', ['number', 'array', 'number', 'number']);
  unload8085Program = simulator.cwrap('UnloadProgram', 'number', ['number', 'array', 'number', 'number']);

  // Initialize the state pointer
  statePointer = simulator._Init8085();

  // Added because on first run, the address 0x16c4 was set with
  // value 0x28, which I have no idea why.
  setAllMemoryLocations({
    statePointer,
    memory: Array(65536).fill(0)
  });

  return statePointer; // Return the initial state pointer
}

// Assemble program using provided code
export function assembleProgram(code) {
  try {
    return parse(code);
  } catch (e) {
    console.log('Failed to assemble program:', e);
    throw e;
  }
}

// Pack address into two bytes (helper function)
export function packAddress(address) {
  const lowByte = address & 0xFF; // Extract the low byte
  const highByte = (address >> 8) & 0xFF; // Extract the high byte
  return [lowByte, highByte];
}

// Load the program into the simulator memory
export function loadProgram(store) {
  let { pcStartValue, assembled }  = assembleProgram(store.activeFile.content);

  if (!assembled) return;

  assembled = assembled.map((a) => {
    a.breakHere = false;
    return a;
  });

  const flattenedProgram = assembled.flatMap((line) => {
    const [lowByte, highByte] = packAddress(line.currentAddress);
    return [
      line.data,
      lowByte,
      highByte,
      line.kind === 'code' ? 1 : line.kind === 'addr' ? 2 : 3,
    ];
  });

  // Load the program into the simulator memory
  const newStatePointer = load8085Program(
    store.statePointer,
    flattenedProgram,
    flattenedProgram.length / 4,
    store.loadAddress
  );

  const state = getStateFromPtr(simulator, newStatePointer);

  return {
    statePointer: newStatePointer,
    assembled,
    pcStartValue
  };
}

export function unloadProgram(store) {
  const assembled = store.assembled;

  if (!assembled) return;

  const flattenedProgram = assembled.flatMap((line) => {
    const [lowByte, highByte] = packAddress(line.currentAddress);
    return [
      line.data,
      lowByte,
      highByte,
      line.kind === 'code' ? 1 : line.kind === 'addr' ? 2 : 3,
    ];
  });

  // Load the program into the simulator memory
  const newStatePointer = unload8085Program(
    store.statePointer,
    flattenedProgram,
    flattenedProgram.length / 4,
    store.loadAddress
  );
}

// Run the program on the simulator
export function runProgram(store) {
  var inputState = getCpuState(store);

  // TODO Check why Loaded state check is needed
  if (store.programState === 'Loaded') {
    setState(simulator, store.statePointer, inputState);
  }

  // const loadAddress = Math.min(...store.assembled.map((line) => line.currentAddress));

  try {
    console.log(`PC Start Value ${store.pcStartValue}`);
    const newStatePointer = execute8085Program(store.statePointer, store.pcStartValue);
    const outputState = getStateFromPtr(simulator, newStatePointer);

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
      },
      stackPointer: outputState.sp,
      programCounter: outputState.pc,
      memory: outputState.memory,
      io: outputState.io,
      statePointer: newStatePointer,
    };
  } catch (e) {
    console.error('Execution failed:', e);
    throw e;
  }
}

export function runSingleInstruction(store) {
  var inputState = getCpuState(store);

  // const loadAddress = Math.min(...store.assembled.map((line) => line.currentAddress));

  try {
    console.log(`Emulating instruction at ${store.pcStartValue.toString(16)}`)
    const status = simulator._Emulate8085Op(inputState.ptr, store.pcStartValue);
    const outputState = getStateFromPtr(simulator, inputState.ptr);

    console.log('status', status);

    return [status, {
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
      },
      stackPointer: outputState.sp,
      programCounter: outputState.pc,
      memory: outputState.memory,
      io: outputState.io,
      statePointer: inputState.ptr,
    }];
  } catch (e) {
    console.error('Execution failed:', e);
    throw new Error('Execution failed');
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
    },
    memory: store.memory,
    io: store.io,
    ptr: store.statePointer,
  };
}

export function startDebug(store) {
  var inputState = getCpuState(store);

  if (store.programState === 'Loaded') {
    setState(simulator, store.statePointer, inputState);
  }
}

export function setPC(store, value) {
  setPCValue(simulator, store.statePointer, value);
}

export function setMemoryLocation(store, location, value) {
  const memoryPointer = store.statePointer + 32;
  simulator.setValue(memoryPointer + location, value, 'i8', 0);
}

export function setAllMemoryLocations(store) {
  const memoryPtr = store.statePointer + 32;
  let i = 0;
  while (i < 65536) {
    simulator.setValue(memoryPtr + i, store.memory[i], 'i8', 0);
    i++;
  }
}

export function setIOPort(store, location, value) {
  const ioPointer = store.statePointer + 65576;
  simulator.setValue(ioPointer + location, value, 'i8', 0);
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
