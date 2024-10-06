import { describe, test, expect, beforeEach } from 'vitest';
import { setMemoryLocation, setIOPort, initSimulator, getCpuState, getFullState, setPC, setFullState } from './simulator.js';
import { getStateFromPtr } from './cpuState.js';
import * as fc from 'fast-check';

let store = {
  statePointer: null,
  memory: Array(65536).fill(0),
  io: Array(256).fill(0),
  accumulator: 0,
  registers: {
    bc: { high: 0, low: 0 },
    de: { high: 0, low: 0 },
    hl: { high: 0, low: 0 },
  },
  stackPointer: 0,
  programCounter: 0,
  flags: {
    z: false,
    s: false,
    p: false,
    c: false,
    ac: false,
  }
};

describe('8085 Simulator Functions', () => {
  // Initialize the simulator before running tests
  beforeEach(async () => {
    store.statePointer = await initSimulator(); // Initializes the simulator and sets the state pointer
  });

  test('setMemoryLocation correctly sets a memory location', () => {
    const location = 0x1000; // Arbitrary memory address
    const value = 0x42;      // Arbitrary value to set in memory

    // Set memory location using the function
    setMemoryLocation(store, location, value);

    // Retrieve CPU state to verify memory location value
    const cpuState = getFullState(store);
    const actualValue = cpuState.memory[location];

    expect(actualValue).toBe(value); // Check if value is correctly set
  });

  test('setIOPort correctly sets an IO port', () => {
    const location = 0x10;   // Arbitrary IO port address
    const value = 0x99;      // Arbitrary value to set at an IO port

    // Set IO port using the function
    setIOPort(store, location, value);

    // Retrieve CPU state to verify IO port value
    const cpuState = getFullState(store);
    const actualValue = cpuState.io[location];

    expect(actualValue).toBe(value); // Check if value is correctly set
  });
});

describe('8085 Simulator Randomized State Validation', () => {
  // Initialize the simulator before running tests
  beforeEach(async () => {
    store.statePointer = await initSimulator(); // Initializes the simulator and sets the state pointer
    store.memory = Array(65536).fill(0)
    store.io = Array(256).fill(0)
  });

  test('Set random values in registers, memory, and IO and verify', () => {
    const uniqueMemoryArray = fc.uniqueArray(
      fc.record({
        location: fc.integer({ min: 0, max: 0xFFFF }),
        value: fc.integer({ min: 0, max: 0xFF }),
      }),
      {
        minLength: 1,
        maxLength: 10,
        selector: (item) => item.location, // Ensure uniqueness based on location
      }
    );

    const uniqueIOArray = fc.uniqueArray(
      fc.record({
        location: fc.integer({ min: 0, max: 0xFF }),
        value: fc.integer({ min: 0, max: 0xFF }),
      }),
      {
        minLength: 1,
        maxLength: 10,
        selector: (item) => item.location, // Ensure uniqueness based on location
      }
    );

    fc.assert(
      fc.property(
        // Generate random values for the registers, memory, and IO
        fc.integer({ min: 0, max: 0xFF }), // A
        fc.integer({ min: 0, max: 0xFF }), // B
        fc.integer({ min: 0, max: 0xFF }), // C
        fc.integer({ min: 0, max: 0xFF }), // D
        fc.integer({ min: 0, max: 0xFF }), // E
        fc.integer({ min: 0, max: 0xFF }), // H
        fc.integer({ min: 0, max: 0xFF }), // L
        fc.integer({ min: 0, max: 0xFFFF }), // PC
        uniqueMemoryArray, // Random memory locations array
        uniqueIOArray, // Random IO locations array
        (
          a,
          b,
          c,
          d,
          e,
          h,
          l,
          pc,
          memoryData,
          ioData
        ) => {
          // Set random values for CPU registers
          store.accumulator = a;
          store.registers.bc.high = b;
          store.registers.bc.low = c;
          store.registers.de.high = d;
          store.registers.de.low = e;
          store.registers.hl.high = h;
          store.registers.hl.low = l;
          store.programCounter = pc;

          // Set the program counter with a random value
          setPC(store, pc);

          // Set random memory locations and values
          memoryData.forEach((data) => {
            store.memory[data.location] = data.value;
          });

          // Set random IO ports with values
          ioData.forEach((data) => {
            store.io[data.location] = data.value;
          });

          // Apply state to the simulator
          setFullState(store);

          // Retrieve the updated state from the simulator
          const state = getFullState(store);

          // console.log(state.memory);

          // Verify the registers have the correct random values
          expect(state.a).toBe(a);
          expect(state.b).toBe(b);
          expect(state.c).toBe(c);
          expect(state.d).toBe(d);
          expect(state.e).toBe(e);
          expect(state.h).toBe(h);
          expect(state.l).toBe(l);

          // Verify the program counter is set correctly
          expect(state.pc).toBe(pc);

          // Verify memory locations have the correct random values
          memoryData.forEach((data) => {
            expect(state.memory[data.location]).toBe(data.value);
          });

          // Verify IO ports have the correct random values
          ioData.forEach((data) => {
            expect(state.io[data.location]).toBe(data.value);
          });
        }
      )
    );
  });

  test('setMemoryLocation', () => {
    fc.assert(
      fc.property(
        fc.integer({ min:0, max: 0xFFFF }),
        fc.integer({ min:0, max: 0xFF }),
        (location, value) => {
          setMemoryLocation(store, location, value);

          const state = getFullState(store);
          expect(state.memory[location]).toBe(value);
        }
      )
    )
  });

  test('setIOPort', () => {
    fc.assert(
      fc.property(
        fc.integer({ min:0, max: 0xFF }),
        fc.integer({ min:0, max: 0xFF }),
        (location, value) => {
          setIOPort(store, location, value);

          const state = getFullState(store);
          expect(state.io[location]).toBe(value);
        }
      )
    )
  });
});
