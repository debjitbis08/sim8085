import { createSignal, onCleanup, onMount, useContext } from "solid-js";
import { VsPlay } from 'solid-icons/vs';
import { HiOutlineWrench } from 'solid-icons/hi';
import Module from '../core/8085.js';
import { StoreContext } from "./StoreContext.js";
import { getStateFromPtr, setState } from "../cpuState.js";
import { produce } from "solid-js/store";
import { initSimulator, loadProgram, runProgram } from "../core/simulator.js";

export function Actions() {
  const { store, setStore } = useContext(StoreContext);
  const [ isReady, setIsReady ] = createSignal(false);

  let simulator;
  let execute8085Program;
  let execute8085ProgramUntil;
  let load8085Program;

  onMount(async () => {
    const statePointer = await initSimulator();
    setStore("statePointer", statePointer);
    setIsReady(true);
  });

  function packAddress(address) {
    const lowByte = address & 0xFF;       // Extract the low byte
    const highByte = (address >> 8) & 0xFF; // Extract the high byte
    return [lowByte, highByte];
  }

  function load() {
    const result = loadProgram(store);

    if (result) {
      setStore(
        produce((draftStore) => {
          draftStore.statePointer = result.statePointer;
          draftStore.memory = result.memory;
          draftStore.assembled = result.assembled;
        })
      );
    }
  }

  function run(input) {
    load();

    let outputState;
    let errorStatus = 0;
    try {
      outputState = runProgram(store);
    } catch (e) {
      // if (e.status === 1) showError("UNKNOWN_INST");
      // else if (e.status === 2) showError("INFINITE_LOOP");
      // else showError("UNKNOWN");
      errorStatus = e.status;
      console.error(e);
    }
    if (errorStatus === 0) {
      setStore(
        produce((draftStore) => {
          console.log(outputState);
          draftStore.accumulator = outputState.accumulator;
          // registers
          draftStore.registers.bc.high = outputState.registers.bc.high;
          draftStore.registers.bc.low = outputState.registers.bc.low;
          draftStore.registers.de.high = outputState.registers.de.high;
          draftStore.registers.de.low = outputState.registers.de.low;
          draftStore.registers.hl.high = outputState.registers.hl.high;
          draftStore.registers.hl.low = outputState.registers.hl.low;
          // flags
          draftStore.flags.z = outputState.flags.z;
          draftStore.flags.s = outputState.flags.s;
          draftStore.flags.p = outputState.flags.p;
          draftStore.flags.c = outputState.flags.cy;
          draftStore.flags.ac = outputState.flags.ac;
          draftStore.stackPointer = outputState.stackPointer;
          draftStore.programCounter = outputState.programCounter;
          draftStore.statePointer = outputState.statePointer;
          draftStore.memory = outputState.memory;
        })
      );
    } else {
      // TODO Set errors in store
    }
  }

  return (
    <div class="flex items-center">
      <button
        type="button"
        class="text-green-600 p-1 rounded border border-transparent hover:border-green-600"
        onClick={load}
      >
        <HiOutlineWrench />
      </button>
      <button
        type="button"
        class="text-green-600 p-1 rounded border border-transparent hover:border-green-600"
        onClick={run}
      >
        <VsPlay />
      </button>
    </div>
  )
}
