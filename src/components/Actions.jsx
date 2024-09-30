import { createSignal, onCleanup, onMount, useContext } from "solid-js";
import { VsClearAll, VsPlay } from 'solid-icons/vs';
import { HiOutlineWrench, HiSolidArrowRight, HiSolidPlay, HiSolidWrench } from 'solid-icons/hi';
import Module from '../core/8085.js';
import { StoreContext } from "./StoreContext.js";
import { getStateFromPtr, setState } from "../cpuState.js";
import { produce } from "solid-js/store";
import { initSimulator, loadProgram, runProgram, runSingleInstruction, setPC } from "../core/simulator.js";
import { AiFillFastForward, AiOutlineClear } from "solid-icons/ai";
import { Tooltip } from "@kobalte/core/tooltip";
import { FiFastForward } from "solid-icons/fi";
import { BsFastForwardFill } from "solid-icons/bs";
import { store, setStore } from '../store/store.js';

export function Actions() {
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

    console.log("assembled");
    console.log(result.assembled);

    if (result) {
      setStore(
        produce((draftStore) => {
          draftStore.statePointer = result.statePointer;
          draftStore.memory = result.memory;
          draftStore.assembled = result.assembled;
          draftStore.programState = 'Loaded';
          draftStore.programCounter = store.assembled.length ? store.assembled[0].currentAddress : 0;
        })
      );
    }
  }

  function updateState(outputState) {
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
        draftStore.flags.c = outputState.flags.c;
        draftStore.flags.ac = outputState.flags.ac;
        draftStore.stackPointer = outputState.stackPointer;
        draftStore.programCounter = outputState.programCounter;
        draftStore.statePointer = outputState.statePointer;
        draftStore.memory = outputState.memory;
      })
    );
  }

  function run() {
    let outputState;
    let errorStatus = 0;
    try {
      setStore('programState', 'Running');
      outputState = runProgram(store);
    } catch (e) {
      // if (e.status === 1) showError("UNKNOWN_INST");
      // else if (e.status === 2) showError("INFINITE_LOOP");
      // else showError("UNKNOWN");
      errorStatus = e.status;
      console.error(e);
    } finally {
      setStore('programState', 'Idle');
    }
    if (errorStatus === 0) {
      updateState(outputState);
    } else {
      // TODO Set errors in store
    }
  }

  function loadAndRun() {
    load();
    run()
  }

  function runOne() {
    let outputState;
    let errorStatus = 0;
    let status = null;
    try {
      if (store.programState === 'Loaded') {
        console.log("===== Starting Debug =====");
        const pc = store.assembled.length ? store.assembled[0].currentAddress : 0;
        setStore(
          produce(draftStore => {
            draftStore.programState = 'Paused';
            draftStore.programCounter = pc;
          })
        );
        // TODO Set PC in simulator
        setPC(store, pc);
      } else {
        setStore('programState', 'Running');
        [status, outputState] = runSingleInstruction(store);
        console.log(`program counter after runOne: ${outputState.programCounter}`);

        if (errorStatus > 0) {
          setStore('programState', 'Loaded');
          if (e.status === 1) alert("UNKNOWN_INST");
          else if (e.status === 2) alert("INFINITE_LOOP");
          else alert("UNKNOWN");
          // TODO Show error
        } else if (status > 0) {
          updateState(outputState);
          setStore('programState', 'Idle');
        } else {
          updateState(outputState);
          setStore('programState', 'Paused');
        }
    }
    } catch (e) {
      // if (e.status === 1) showError("UNKNOWN_INST");
      // else if (e.status === 2) showError("INFINITE_LOOP");
      // else showError("UNKNOWN");
      errorStatus = e.status;
      console.error(e);
    }
  }

  return (
    <div class="flex items-center border border-gray-300 border-t-0 border-b-0 rounded-sm dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
      <Tooltip>
        <Tooltip.Trigger class="tooltip__trigger">
      <button
        type="button"
        class="px-2 py-1 border border-transparent hover:bg-gray-100 dark:hover:bg-gray-800"
        onClick={load}
      >
        <div class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <HiSolidWrench class="text-yellow-400 dark:text-yellow-600" />
          <span class="text-sm font-semibold hidden">Assemble &amp; Load</span>
        </div>
      </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content class="tooltip__content">
          <Tooltip.Arrow />
          <p>Assemble &amp; Load</p>
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip>
      <Tooltip>
        <Tooltip.Trigger class="tooltip__trigger">
        <button
          type="button"
          class="px-2 py-1 border border-transparent hover:bg-gray-100 dark:hover:bg-gray-800 border-l border-l-gray-300 dark:border-l-gray-700"
          onClick={runOne}
          disabled={store.programState !== 'Loaded' && store.programState !== 'Paused'}
        >
          <div class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <HiSolidPlay class={`${store.programState === 'Loaded' || store.programState === 'Paused' ? 'text-green-400 dark:text-green-600' : 'text-gray-400 dark:text-gray-600'}`} />
            <span class="text-sm font-semibold hidden">Run One Instruction</span>
          </div>
        </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content class="tooltip__content">
            <Tooltip.Arrow />
            <p>{store.programState === 'Loaded' || store.programState === 'Paused' ? 'Run' : 'Assemble program before running'}</p>
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip>
      <Tooltip>
        <Tooltip.Trigger class="tooltip__trigger">
        <button
          type="button"
          class="px-2 py-1 border border-transparent hover:bg-gray-100 dark:hover:bg-gray-800 border-l border-l-gray-300 dark:border-l-gray-700"
          onClick={loadAndRun}
        >
          <div class="flex items-center gap-1 text-gray-600 dark:text-gray-400">
            <HiSolidWrench class="text-yellow-400 dark:text-yellow-600" />
            <HiSolidArrowRight class="text-gray-500 dark:text-gray-500" />
            <BsFastForwardFill class="text-green-400 dark:text-green-600" />
            <span class="text-sm font-semibold hidden">Load &amp; Run</span>
          </div>
        </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content class="tooltip__content">
            <Tooltip.Arrow />
            <p>Assemble, Load &amp; Run</p>
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip>
      <Tooltip>
        <Tooltip.Trigger class="tooltip__trigger">
          <button
            type="button"
            class="px-2 py-1 border border-transparent hover:bg-gray-100 dark:hover:bg-gray-800 border-l border-l-gray-300 dark:border-l-gray-700"
            onClick={() => { }}
          >
            <div class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <AiOutlineClear class="text-red-400 dark:text-red-600"/>
              <span class="text-sm font-semibold hidden">Clear All Data</span>
            </div>
        </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content class="tooltip__content">
            <Tooltip.Arrow />
            <p>Clear All Data</p>
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip>
    </div>
  )
}
