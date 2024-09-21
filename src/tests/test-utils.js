import { assembleProgram, initSimulator, loadProgram, runProgram } from '../core/simulator';
import { expect } from 'vitest';

// Function to initialize the simulator and prepare for running tests
export async function setupSimulator(code, loadAddress = 0) {
  // Initialize the simulator
  let statePointer = await initSimulator();

  // Assemble the code
  let assembled = assembleProgram(code);

  // Load the program into the simulator
  const loadResult = loadProgram({
    code,
    statePointer,
    loadAddress
  });

  statePointer = loadResult.statePointer;
  const memory = loadResult.memory;
  assembled = loadResult.assembled;

  return { statePointer, assembled, memory };
}

// Function to run the assembled program and return the result
export function runTestProgram(state) {
  const defaultState = {
    accumulator: 0,
    registers: {
      bc: { high: 0, low: 0, isEditing: false },
      de: { high: 0, low: 0, isEditing: false },
      hl: { high: 0, low: 0, isEditing: false },
    },
    stackPointer: 0,
    programCounter: 0,
    flags: {
      s: false,
      z: false,
      ac: false,
      p: false,
      c: false
    },
    loadAddress: 0,
  };

  // Merge the provided state with the default state
  const finalState = { ...defaultState, ...state };

  // Run the program using the final state
  return runProgram(finalState);
}

// Helper to verify the CPU state with improved error reporting
export function verifyCpuState(resultState, expectedState, path = '') {
  Object.keys(expectedState).forEach((key) => {
    const currentPath = path ? `${path}.${key}` : key; // Track nested paths like registers.bc.high

    if (typeof expectedState[key] === 'object' && !Array.isArray(expectedState[key])) {
      // For nested objects like registers or flags, recursively verify
      verifyCpuState(resultState[key], expectedState[key], currentPath);
    } else {
      // For primitive values, compare resultState[key] and expectedState[key]
      expect(resultState[key], `Verification failed at "${currentPath}": Expected ${expectedState[key]} but got ${resultState[key]}`).toBe(expectedState[key]);
    }
  });
}

export async function runTest(code, expectedCpuState) {
  // Step 1: Setup simulator and load program
  const { statePointer, assembled, memory } = await setupSimulator(code);

  // Step 2: Run the program
  const resultState = runTestProgram({
    statePointer,
    assembled,
    memory,
    loadAddress: 0,
  });

  // Step 3: Verify the CPU state
  verifyCpuState(resultState, expectedCpuState);
}
