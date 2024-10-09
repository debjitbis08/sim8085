import { createSignal, onCleanup, onMount, useContext } from "solid-js";
import { VsClearAll, VsDebug, VsDebugLineByLine, VsDebugStart, VsDebugStepInto, VsDebugStepOver, VsDebugStop, VsPlay } from 'solid-icons/vs';
import { HiOutlineWrench, HiSolidArrowRight, HiSolidPlay, HiSolidStop, HiSolidWrench } from 'solid-icons/hi';
import Module from '../core/8085.js';
import { StoreContext } from "./StoreContext.js";
import { produce } from "solid-js/store";
import { initSimulator, loadProgram, runProgram, runSingleInstruction, setAllMemoryLocations, setFlags, setPC, setRegisters, startDebug, unloadProgram } from "../core/simulator.js";
import { AiFillFastForward, AiFillStop, AiOutlineClear } from "solid-icons/ai";
import { Tooltip } from "@kobalte/core/tooltip";
import { FiFastForward } from "solid-icons/fi";
import { BsFastForwardFill, BsStop } from "solid-icons/bs";
import { store, setStore } from '../store/store.js';
import { Toast, toaster } from "@kobalte/core/toast";
import { trackEvent } from "../analytics/events.js";
import { showToaster } from "./toaster.jsx";
import { FaSolidEject } from "solid-icons/fa";

export function Actions() {
  const [ isReady, setIsReady ] = createSignal(false);

  onMount(async () => {
    const statePointer = await initSimulator();
    setStore("statePointer", statePointer);
    setIsReady(true);
  });

  function load() {
    let result = null;

    setStore("errors", []);

    try {
      result = loadProgram(store);
    } catch (e) {
      if (e.name && e.message && e.location) {
        setStore("errors", [{
          name: e.name,
          msg: e.message,
          line: e.location.start.line,
          column: e.location.start.column
        }]);
        setStore("assembled", []);
        trackEvent("assemble failed", {
          code: store.code,
          name: e.name,
          msg: e.message,
          line: e.location.start.line,
          column: e.location.start.column
        });
        return;
      } else {
        setStore("assembled", []);
        trackEvent("assemble exception", {
          code: store.code,
        });
        showToaster("error", "Assmeble Failed", "Assemble failed with unknown errors. Please check the syntax of your program.");
        return;
      }
    }

    if (result) {
      setStore(
        produce((draftStore) => {
          draftStore.statePointer = result.statePointer;
          draftStore.assembled = result.assembled;
          draftStore.errors = [];
          draftStore.programState = 'Loaded';
          draftStore.programCounter = store.assembled.length ? store.assembled[0].currentAddress : 0;
          for (const line of result.assembled) {
            draftStore.memory[line.currentAddress] = line.data;
          }
        })
      );
    }
  }

  function unload() {
    if (store.programState === 'Idle') return;

    unloadProgram(store);

    setStore(
      produce((draftStore) => {
        draftStore.programState = 'Idle';
        for (const line of store.assembled) {
          draftStore.memory[line.currentAddress] = 0;
        }
      })
    );
  }

  function loadOrUnload() {
    if (store.programState === 'Idle') load();
    else unload();
  }

  function updateState(outputState) {
    setStore(
      produce((draftStore) => {
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
        draftStore.io = outputState.io;
      })
    );
  }

  function run() {
    let outputState;
    let errorStatus = 0;
    try {
      setStore('programState', 'Running');
      outputState = runProgram(store);
      showToaster("success", "Program ran successfully", "Please check the left panel for updated state.");
    } catch (e) {
      if (e.status === 1) showToaster("error", "Program existed with error", "Unknown instruction encountered in the program.");
      else if (e.status === 2) showToaster("error", "Program existed with error", "Infinite loop detected. Did you forget to add HLT.");
      else showToaster("error", "Program existed with error", "We could not identify the error.");
      errorStatus = e.status;
      trackEvent("run failed", {
        code: store.code,
        status: e.status === 1 ? 'UNKNONWN_INSTRUCTION_ERROR' : (e.status === 2 ? 'INFINITE_LOOP' : 'UNKNOWN_RUNTIME_ERROR')
      });
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
    if (store.errors.length === 0) {
      run()
    }
  }

  function runOne() {
    let outputState;
    let errorStatus = 0;
    let status = null;

    if (store.programState === 'Idle') {
      load();
    }

    try {
      if (store.programState === 'Loaded') {
        const pc = store.assembled.length ? store.assembled[0].currentAddress : 0;
        setStore(
          produce(draftStore => {
            draftStore.programState = 'Paused';
            draftStore.programCounter = pc;
          })
        );
        setPC(store, pc);
        startDebug(store);
      } else {
        setStore('programState', 'Running');
        [status, outputState] = runSingleInstruction(store);
        console.log(`program counter after runOne: ${outputState.programCounter}`);

        if (errorStatus > 0) {
          setStore('programState', 'Loaded');
          if (errorStatus === 1) showToaster("error", "Program existed with error", "Unknown instruction encountered in the program.");
          else if (errorStatus === 2) showToaster("error", "Program existed with error", "Infinite loop detected. Did you forget to add HLT.");
          else showToaster("error", "Program existed with error",  "We could not identify the error.");
          trackEvent("run failed", {
            code: store.code,
            status: e.status === 1 ? 'UNKNONWN_INSTRUCTION_ERROR' : (e.status === 2 ? 'INFINITE_LOOP' : 'UNKNOWN_RUNTIME_ERROR')
          });
        } else if (status > 0) {
          updateState(outputState);
          setStore('programState', 'Idle');
        } else {
          updateState(outputState);
          setStore('programState', 'Paused');
        }
      }
    } catch (e) {
      errorStatus = e.status;
      console.error(e);
    }
  }

  const clearFlags = () => {
    setStore(
      "flags",
      produce((flags) => {
        Object.keys(flags).forEach((flagId) => flags[flagId] = false);
      })
    );
    setFlags(store);
  };

  const clearRegisters = () => {
    setStore(
      "accumulator",
      0
    );
    setStore(
      "registers",
      produce((registers) => {
        for(const register of Object.values(registers)) {
          register.high = 0;
          register.low = 0;
        }
      })
    );
    setRegisters(store);
  };

  const resetAllLocations = () => {
    setStore("memory", (memory) => memory.map(() => 0));
    setAllMemoryLocations(store);
    setStore("programState", (programState) => programState === 'Loaded' ? 'Idle' : programState);
  };

  const clearAllDataOrStop = () => {
    if (store.programState === 'Paused') {
      setStore("programState", "Loaded");
      showToaster("info", "Stopped Debugging", "You may clear data to start editing again.");
      return;
    }

    clearFlags();
    clearRegisters();
    resetAllLocations();
    setStore("assembled", []);
    showToaster("info", "Cleared all data", "Registers, Flags & all Memory locations have been cleared.");
  };

  return (
    <div class="flex items-center border border-gray-300 border-t-0 border-b-0 rounded-sm dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
      <ActionButton
        icon={
          store.programState === 'Idle' ? (
            <HiSolidWrench class="text-yellow-400 dark:text-yellow-600" />
          ) : (
            <FaSolidEject class="text-yellow-400 dark:text-yellow-600" />
          )
        }
        onClick={loadOrUnload}
        disabled={false}
        title={store.programState === 'Idle' ? "Assemble & Load" : "Unload program from memory"}
      />
      <ActionButton
        icon={<HiSolidPlay class="text-green-400 dark:text-green-600" />}
        title="Load &amp; Run"
        onClick={loadAndRun}
        disabled={false}
      />
      <ActionButton
        icon={(
          <>
            <VsDebug class={store.programState === 'Loaded' || store.programState === 'Idle' ? 'text-green-400 dark:text-green-600' : 'hidden'} />
            <VsDebugStepOver class={`${store.programState === 'Paused' || store.programState === 'Running' ? 'text-green-400 dark:text-green-600' : 'hidden'}`} />
          </>
        )}
        onClick={runOne}
        disabled={false}
        title={store.programState === 'Loaded' ? 'Step Through' : store.programState === 'Paused' ? 'Execute One Instruction' : 'Load & Debug'}
      />
      <ActionButton
        icon={store.programState === 'Paused' ? (
          <HiSolidStop  class="text-red-400 dark:text-red-600"/>
        ) : (
          <AiOutlineClear class="text-red-400 dark:text-red-600"/>
        )}
        title="Clear All Data"
        onClick={clearAllDataOrStop}
        disabled={false}
      />
      <Portal client:only="solid-js" >
          <Toast.Region>
             	<Toast.List class="toast__list" />
          </Toast.Region>
      </Portal>
    </div>
  )
}

function ActionButton(props) {
  return (
    <Tooltip>
      <Tooltip.Trigger class="tooltip__trigger">
        <button
          type="button"
          class="px-2 py-1 border border-transparent hover:bg-gray-100 dark:hover:bg-gray-800 border-l border-l-gray-300 dark:border-l-gray-700"
          onClick={props.onClick}
          disabled={props.disabled}
        >
          <div class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            {props.icon}
          </div>
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content class="tooltip__content">
          <Tooltip.Arrow />
          <p>{props.title}</p>
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip>
  );
};
