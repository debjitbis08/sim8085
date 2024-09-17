import { Registers } from "./Registers";
import { createStore } from "solid-js/store";
import { StoreContext } from "./StoreContext";
import { Flags } from "./Flags";
import { Memory } from "./Memory";

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

  return (
    <StoreContext.Provider value={{ store, setStore }}>
     	<div class="grid grid-cols-1 gap-4 lg:grid-cols-6 lg:gap-8 mt-10">
        <div class="rounded-lg col-span-1">
          <div>
            <Registers />
          </div>
          <div class="mt-10">
            <Flags />
          </div>
        </div>
        <div class="h-32 rounded-lg bg-gray-200 lg:col-span-3"></div>
        <div class="h-32 rounded-lg lg:col-span-2">
          <Memory />
        </div>
      </div>
    </StoreContext.Provider>
  );
}
