import { createSignal, onCleanup, onMount, useContext } from "solid-js";
import { VsPlay } from 'solid-icons/vs';
import { HiOutlineWrench } from 'solid-icons/hi';
import Module from '../core/8085.js';
import { StoreContext } from "./StoreContext.js";
import { parse } from '../core/8085.pegjs';
import { getStateFromPtr, setState } from "../cpuState.js";
import { produce } from "solid-js/store";

export function Actions() {
  const { store, setStore } = useContext(StoreContext);
  const [ isReady, setIsReady ] = createSignal(false);

  let simulator;
  let execute8085Program;
  let execute8085ProgramUntil;
  let load8085Program;

  onMount(() => {
    Module().then((sim) => {
      simulator = sim;
      // window.simulator = simulator;
      execute8085Program = simulator.cwrap('ExecuteProgram', 'number', ['number', 'number']);
      execute8085ProgramUntil = simulator.cwrap('ExecuteProgramUntil', 'number', ['number', 'number', 'number', 'number']);
      load8085Program = simulator.cwrap('LoadProgram', 'number', ['number', 'array', 'number', 'number']);

      const statePointer = simulator._Init8085();

      setStore("statePointer", statePointer);

      setIsReady(true);
    });
  });

  function assembleProgram(code) {
      try {
        // Try to assemble Program
        var assembled = parse(code);
        console.log(assembled);
      } catch (e) {
        console.error(e);
      }

      return assembled;
  }

  function load() {
    let assembled = assembleProgram(store.code);

    if (!assembled) return;

    assembled = assembled.map((a) => {
      a.breakHere = false;
      return a;
    });

    const statePointer = load8085Program(
      store.statePointer,
      assembled.map((c) => c.data),
      assembled.length,
      store.loadAddress
    );

    const state = getStateFromPtr(simulator, statePointer);

    setStore(
      produce((draftStore) => {
        draftStore.statePointer = statePointer;
        draftStore.memory = state.memory;
        draftStore.assembled = assembled;
      })
    );
  }

  function runProgram (input) {
      load();

      var inputState = getCpuState(store);
      let statePointer = store.statePointer;
      var errorStatus = 0;

      // TODO Check why Loaded state check is needed
      setState(simulator, statePointer, inputState);

      try {
        statePointer = execute8085Program(statePointer, store.loadAddress);
      } catch (e) {
        // if (e.status === 1) showError("UNKNOWN_INST");
        // else if (e.status === 2) showError("INFINITE_LOOP");
        // else showError("UNKNOWN");
        // errorStatus = e.status;
        console.error(e);
      }

      if (errorStatus === 0) {
        const outputState = getStateFromPtr(simulator, statePointer);
        console.log(outputState.a);
        setStore(
          produce((draftStore) => {
            draftStore.accumulator = outputState.a;
            // registers
            draftStore.registers.bc.high = outputState.b;
            draftStore.registers.bc.low = outputState.c;
            draftStore.registers.de.high = outputState.d;
            draftStore.registers.de.low = outputState.e;
            draftStore.registers.hl.high = outputState.h;
            draftStore.registers.hl.low = outputState.l;
            // flags
            draftStore.flags.z = outputState.flags.z;
            draftStore.flags.s = outputState.flags.s;
            draftStore.flags.p = outputState.flags.p;
            draftStore.flags.c = outputState.flags.cy;
            draftStore.flags.ac = outputState.flags.ac;
            draftStore.stackPointer = outputState.sp;
            draftStore.programCounter = outputState.pc;
            draftStore.statePointer = statePointer;
            draftStore.memory = outputState.memory;
          })
        );
      } else {
        app.ports.runError.send(errorStatus);
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
        onClick={runProgram}
      >
        <VsPlay />
      </button>
    </div>
  )
}


function getCpuState(store) {
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
     flags:
          { z: store.flags.z,
     s: store.flags.s,
     p: store.flags.p,
     cy: store.flags.c,
     ac: store.flags.ac,
          },
     memory: store.memory,
     ptr: store.statePointer

      }
}
