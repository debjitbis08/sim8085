import { Registers } from "./Registers";
import { createStore } from "solid-js/store";
import { StoreContext } from "./StoreContext";
import { Flags } from "./Flags";
import { MemoryGrid } from "./MemoryGrid";
import { CodeMirror } from "./codemirror/CodeMirror";
import { HiOutlineCpuChip } from 'solid-icons/hi';
import { BsMemory } from 'solid-icons/bs';
import { Actions } from "./Actions";
import MemoryList from "./MemoryList";
import { RightPanel } from "./RightPanel";
import './styles.css';
import './tooltip-styles.css';
import { createEffect } from "solid-js";

const INITIAL_CODE =
`
;<Program title>

jmp start

;data

;code
start: nop


hlt
`

export function App() {

  const [store, setStore] = createStore({
    code: INITIAL_CODE,
    assembled: [],
    loadAddress: 0x0800,
    accumulator: 0,
    isEditingAccumulator: false,
    registers: {
      bc: { high: 0, low: 0, isEditing: false },
      de: { high: 0, low: 0, isEditing: false },
      hl: { high: 0, low: 0, isEditing: false },
    },
    stackPointer: 0,
    programCounter: 0,
    statePointer: null,
    flags: {
      s: false,
      z: false,
      ac: false,
      p: false,
      c: false
    },
    memory: Array(65536).fill(0),
    openFiles: [ "main.asm" ]
  });

  createEffect(() => {
    document.getElementById("app-loader")?.classList.add("hidden");
  });

  return (
    <StoreContext.Provider value={{ store, setStore }}>
     	<div class="flex items-start" style={{ height: "calc(100vh - 6rem)" }}>
        <div class="rounded-lg w-[25vw]">
          <RightPanel />
        </div>
        <div class="grow max-w-[800px] border-l border-l-gray-300">
          <div class="flex">
            <div class="grow">
              <div class="flex items-center">
                <div class="flex items-center gap-1 py-1 px-2 border-r border-r-gray-300 dark:border-gray-600 border-t-0 border-b-0 rounded-sm">
                  <span class="text-[0.4rem] text-red-700 dark:text-red-600 pt-1">ASM</span>
                  <span>main.asm</span>
                </div>
              </div>
            </div>
            <Actions />
          </div>
          <CodeMirror />
        </div>
        <div class="grow flex items-center" style={{ height: "calc(100vh - 5rem)" }}>
          <div class="mx-auto">
            <span class="dark:text-gray-600">
              Interactive Terminal Coming Soon!
            </span>
          </div>
        </div>
      </div>
    </StoreContext.Provider>
  );
}
