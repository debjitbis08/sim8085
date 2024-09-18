import { Registers } from "./Registers";
import { createStore } from "solid-js/store";
import { StoreContext } from "./StoreContext";
import { Flags } from "./Flags";
import { MemoryGrid } from "./MemoryGrid";
import { CodeMirror } from "./codemirror/CodeMirror";
import { Tabs } from "@kobalte/core/tabs";
import { HiOutlineCpuChip } from 'solid-icons/hi';
import { BsMemory } from 'solid-icons/bs';
import { Actions } from "./Actions";

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
     	<div class="grid grid-cols-1 gap-8 lg:grid-cols-6 lg:gap-8 mt-10">
        {
        /*
        <div class="rounded-lg col-span-2">
          <Tabs orientation="vertical" class="flex items-start">
           	<Tabs.List class="border-r border-r-gray-300 h-full flex flex-col overflow-hidden mr-4 pr-4">
          		<Tabs.Trigger value="cpu" class="text-left">
                <HiOutlineCpuChip class="text-lg"/>
              </Tabs.Trigger>
          		<Tabs.Trigger value="memory" class="text-left">
                <BsMemory />
              </Tabs.Trigger>
          		<Tabs.Indicator />
              <div class="grow h-[100vh]"></div>
           	</Tabs.List>
           	<Tabs.Content value="cpu" class="min-w-60">
            </Tabs.Content>
           	<Tabs.Content value="memory">
              <Memory />
            </Tabs.Content>
          </Tabs>
        </div>
         */
        }
        <div class="h-32 rounded-lg col-span-1 lg:col-span-1">
          <div>
            <Registers />
          </div>
          <div class="mt-10">
            <Flags />
          </div>
        </div>
        <div class="h-32 rounded-lg lg:col-span-3">
          <div class="flex mb-4">
            <div class="grow"></div>
            <Actions />
          </div>
          <CodeMirror />
        </div>
        <div class="h-32 rounded-lg lg:col-span-2">
        <MemoryGrid />
        </div>
      </div>
    </StoreContext.Provider>
  );
}
