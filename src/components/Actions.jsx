import { createSignal, onCleanup, onMount, useContext } from "solid-js";
import { VsPlay } from 'solid-icons/vs';
import { HiOutlineWrench } from 'solid-icons/hi';
import Module from '../core/8085.js';
import { StoreContext } from "./StoreContext.js";
import { parse } from '../core/8085.pegjs';
import { getStateFromPtr } from "../cpuState.js";
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

    console.log(`Load Address: ${store.loadAddress}`);

    const statePointer = load8085Program(
      store.statePointer,
      assembled.map((c) => c.data),
      assembled.length,
      store.loadAddress
    );

    const state = getStateFromPtr(simulator, statePointer);

    setStore(
      produce((draftStore) => {
        console.log(draftStore.code);
        draftStore.statePointer = statePointer;
        draftStore.memory = state.memory;
        draftStore.assembled = assembled;
      })
    );
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
      <button type="button" class="text-green-600 p-1 rounded border border-transparent hover:border-green-600">
        <VsPlay />
      </button>
    </div>
  )
}
