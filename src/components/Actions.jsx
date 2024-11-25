import { createSignal, onCleanup, onMount, useContext } from "solid-js";
import { VsClearAll, VsDebug, VsDebugLineByLine, VsDebugStart, VsDebugStepInto, VsDebugStepOver, VsDebugStop, VsInfo, VsPlay, VsQuestion } from 'solid-icons/vs';
import { HiOutlineWrench, HiSolidArrowRight, HiSolidPlay, HiSolidStop, HiSolidWrench } from 'solid-icons/hi';
import Module from '../core/8085.js';
import { produce } from "solid-js/store";
import { initSimulator, loadProgram, runProgram, runSingleInstruction, setAllMemoryLocations, setFlags, setPC, setRegisters, startDebug, unloadProgram } from "../core/simulator.js";
import { AiOutlineClear } from "solid-icons/ai";
import { Tooltip } from "@kobalte/core/tooltip";
import { store, setStore } from '../store/store.js';
import { Toast, toaster } from "@kobalte/core/toast";
import { trackEvent } from "./analytics/tracker.js";
import { showToaster } from "./toaster.jsx";
import { FaSolidEject } from "solid-icons/fa";
import { createShortcut } from "@solid-primitives/keyboard";

export function Actions() {
  const [ isReady, setIsReady ] = createSignal(false);

  onMount(async () => {
    const statePointer = await initSimulator();
    setStore("statePointer", statePointer);
    setIsReady(true);
  });

  function beforeRun() {
    if (store.settings.beforeRun.clearRegisters) {
      clearRegisters();
    }
    if (store.settings.beforeRun.clearFlags) {
      clearFlags();
    }
    if (store.settings.beforeRun.clearAllMemoryLocations) {
      resetAllLocations()
    }
  }

  function load() {
    let result = null;

    setStore("errors", []);
    setStore("codeWithError", '');

    try {
      result = loadProgram(store);
    } catch (e) {
      if (e.name && e.message && e.location) {
        showToaster("error", "Program has errors", "Check the \"Assembled Output\" section for details.");
        const message = e.message.startsWith("{") ? JSON.parse(e.message) : e.message;
        if (typeof message === "string") {
          setStore("errors", [{
            name: e.name,
            msg: message,
            hint: e.hint || [],
            type: "",
            location: e.location,
            line: e.location.start.line,
            column: e.location.start.column
          }]);
        } else {
          setStore("errors", [{
            name: e.name,
            msg: message.message,
            hint: message.hint || [],
            type: message.type || "",
            location: e.location,
            line: e.location.start.line,
            column: e.location.start.column
          }]);
        }
        setStore("assembled", []);
        setStore("codeWithError", store.activeFile.content);
        trackEvent("assemble failed", {
          code: store.activeFile.content,
          name: e.name,
          msg: e.message,
          line: e.location.start.line,
          column: e.location.start.column
        });
        return;
      } else {
        setStore("assembled", []);
        trackEvent("assemble exception", {
          code: store.activeFile.content,
        });
        showToaster("error", "Assemble Failed", "Assemble failed with unknown errors. Please check the syntax of your program.");
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
          draftStore.pcStartValue = result.pcStartValue != null ? result.pcStartValue : store.pcStartValue;
          draftStore.programCounter = result.pcStartValue != null ? result.pcStartValue : store.pcStartValue;
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
      if (store.settings.alert.afterSuccessfulRun) {
        showToaster("success", "Program ran successfully", "Please check the left panel for updated state.");
      }
    } catch (e) {
      if (e.status === 1) showToaster("error", "Program existed with error", "Unknown instruction encountered in the program.");
      else if (e.status === 2) {
        showToaster("error", "Program existed with error", (<InfiniteLoopError code={store.activeFile.content} />));
      }
      else showToaster("error", "Program existed with error", "We could not identify the error.");
      errorStatus = e.status;
      trackEvent("run failed", {
        code: store.activeFile.content,
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
    beforeRun();
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
      beforeRun();
      load();
    }

    try {
      if (store.programState === 'Loaded') {
        // const pc = store.assembled.length ? store.assembled[0].currentAddress : 0;
        const pc = store.pcStartValue;
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
          else if (errorStatus === 2) {
            showToaster("error", "Program existed with error", (<InfiniteLoopError code={store.activeFile.content} />));
          }
          else showToaster("error", "Program existed with error",  "We could not identify the error.");
          trackEvent("run failed", {
            code: store.activeFile.content,
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
      if (store.settings.alert.afterDebugStop) {
        showToaster("info", "Stopped Debugging", "You may clear data to start editing again.");
      }
      return;
    }

    clearFlags();
    clearRegisters();
    resetAllLocations();
    setStore("assembled", []);
    if (store.settings.alert.afterClearAll) {
      showToaster("info", "Cleared all data", "Registers, Flags & all Memory locations have been cleared.");
    }
  };

  const setPCStartValue = (value) => {
    setStore("pcStartValue", parseInt(value || "0", 16) % 65536);
  };

  // Load and Run
  createShortcut(
    ["Control", "F5"],
    loadAndRun,
  );

  // Start Debug
  createShortcut(
    ["Alt", "F5"],
    () => {
      if (store.programState === 'Idle' || store.programState === 'Loaded')  runOne();
    },
  );

  // Step Over
  createShortcut(
    ["F10"],
    () => {
      if (store.programState === 'Paused') runOne();
    },
  );

  // Stop Debug
  createShortcut(
    ["Shift", "F5"],
    () => {
      if (store.programState === 'Paused')  clearAllDataOrStop();
    },
  );

  // Assemble and Load Program
  createShortcut(
    ["Control", "Shift", "B"],
    () => {
      if (store.programState === 'Idle') load();
    },
  );

  // Unload Program
  createShortcut(
    ["Control", "Shift", "U"],
    () => {
      if (store.programState !== 'Idle') unload();
    },
  );


  return (
    <div class="flex items-center md:gap-2 border-l-0 border-t-0 border-b-0 rounded-sm
        flex-row-reverse max-w-sm mx-auto justify-between
        md:flex-row md:w-auto
    ">
      <div class="flex items-center gap-1 text-sm pl-2 rounded border border-active-border">
        <div class="flex items-center gap-1 border-b-0 border-b-gray-300 min-w-0">
          <span class="font-mono text-gray-400">0x</span>
          <input
            type="text"
            class="p-1 w-12 font-mono bg-transparent outline-none placeholder:text-gray-300"
            placeholder="Start PC Value"
            value={store.pcStartValue.toString(16)}
            onInput={(e) => setPCStartValue(e.target.value)}
          />
          <Tooltip>
            <Tooltip.Trigger class="tooltip__trigger">
              <VsQuestion />
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content class="tooltip__content">
                <Tooltip.Arrow />
                <p>
                  Your program will start executing at this address instead of 0h.
                  This is equivalent to the operation of GO &amp; EXEC in <a class="text-blue-foreground" target="_blank" href="https://community.intel.com/cipcp26785/attachments/cipcp26785/processors/59602/1/9800451A.pdf">SDK-85</a>.
                  See page 4-6 in the manual.
                </p>
                <p class="mt-2">
                  This can be also manipulated using the <a class="text-blue-foreground" href="/docs/en/directives/end">END directive</a>.
                </p>
                <p class="mt-2">
                  You must specify this value if your code uses ORG directive.
                </p>
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip>
        </div>
        <ActionButton
          icon={<HiSolidPlay class="text-terminal" />}
          title="Load &amp; Run"
          shortcut="Ctrl + F5"
          onClick={loadAndRun}
          disabled={false}
        />
      </div>
      <ActionButton
        icon={
          store.programState === 'Idle' ? (
            <HiSolidWrench class="text-yellow-foreground" />
          ) : (
            <FaSolidEject class="text-yellow-foreground" />
          )
        }
        onClick={loadOrUnload}
        disabled={false}
        title={store.programState === 'Idle' ? "Assemble & Load" : "Unload program from memory"}
        shortcut={store.programState === 'Idle' ? "Ctrl + Shift + B" : "Ctrl + Shift + U"}
      />
      <ActionButton
        icon={(
          <>
            <VsDebug class={store.programState === 'Loaded' || store.programState === 'Idle' ? 'text-green-foreground' : 'hidden'} />
            <VsDebugStepOver class={`${store.programState === 'Paused' || store.programState === 'Running' ? 'text-green-foreground' : 'hidden'}`} />
          </>
        )}
        onClick={runOne}
        disabled={false}
        title={store.programState === 'Loaded' ? 'Step Through' : store.programState === 'Paused' ? 'Execute One Instruction' : 'Load & Debug'}
        shortcut={store.programState === 'Loaded' ? 'Alt + F5' : store.programState === 'Paused' ? 'F10' : 'Alt + F5'}
      />
      <ActionButton
        icon={store.programState === 'Paused' ? (
          <HiSolidStop  class="text-red-foreground"/>
        ) : (
          <AiOutlineClear class="text-red-foreground"/>
        )}
        title={store.programState === 'Paused' ? 'Stop Debugging' : 'Clear All Data'}
        shortcut={store.programState === 'Paused' ? 'Shift + F5' : ''}
        onClick={clearAllDataOrStop}
        disabled={false}
      />
      <Portal>
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
      <Tooltip.Trigger class="tooltip__trigger rounded hover:bg-active-background border border-transparent hover:border-active-border"
        onClick={props.onClick}
        disabled={props.disabled}
      >
        <div class="px-2 py-2 flex items-center gap-2 text-gray-600 text-xl md:text-base">
          {props.icon}
        </div>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content class="tooltip__content">
          <Tooltip.Arrow />
          <div class="flex items-center gap-2">
            <p>{props.title}</p>
            {props.shortcut ? (
              <span class="text-xs bg-secondary-background py-1 px-2 rounded-sm">{props.shortcut}</span>
            ) : null}
          </div>
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip>
  );
}

function InfiniteLoopError(props) {
  return (
    <>
      <p>Infinite loop detected</p>
      {!props.code.match(/\s+HLT(\s+|$)/i) ? <p class="mt-2">Did you forget to add HLT?</p> :
        props.code.match(/(^|\s+)ORG(\s+|$)/i) ? (
          <>
            <p class="mt-2">
              Using <span class="text-editor-directive">ORG</span> may cause the program to load at a different address.
            </p>
            <div class="mt-2">
              Enter the address where your program begins execution in the text box near the
              <span class="inline text-terminal no-wrap">
                <svg class="inline" fill="none" stroke-width="0" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" viewBox="0 0 24 24" style="overflow: visible; color: currentcolor;" height="1em" width="1em"><path fill="currentColor" fill-rule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clip-rule="evenodd"></path></svg>
                <span class="text-terminal">Run</span>
              </span> button.
            </div>
          </>
        ) : <p>Please check your program for logic errors.</p>
      }
    </>
  );
}
