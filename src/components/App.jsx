import { Registers } from "./Registers";
import { createStore } from "solid-js/store";
import { StoreContext } from "./StoreContext";
import { Flags } from "./Flags";
import { MemoryGrid } from "./MemoryGrid";
import { CodeMirror } from "./codemirror/CodeMirror";
import { HiOutlineCpuChip } from "solid-icons/hi";
import { BsMemory } from "solid-icons/bs";
import Actions from "./Actions";
import MemoryList from "./MemoryList";
import { LeftPanel } from "./LeftPanel";
import "./styles.css";
import { createEffect } from "solid-js";

const INITIAL_CODE = `
;<Program title>

jmp start

;data

;code
start: nop


hlt
`;

export function App() {
    return (
        <StoreContext.Provider value={{ store, setStore }}>
            <div class="flex items-start" style={{ height: "calc(100vh - 6rem)" }}>
                <div class="rounded-lg w-[25vw]">
                    <LeftPanel />
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
                    <div class="mx-auto flex flex-col justify-center items-center gap-4">
                        <div class="text-gray-400 dark:text-gray-600 flex items-center gap-2">
                            <span class="dark:text-gray-400 font-bold">$&gt;</span>
                            <div
                                class="bg-gray-600 dark:bg-gray-400 w-2 h-4"
                                style={{ animation: "blink 1200ms", "animation-iteration-count": 10 }}
                            ></div>
                        </div>
                        <div class="bg-gray-200 dark:bg-gray-800 p-2 rounded-sm">Coming Soon!</div>
                    </div>
                </div>
            </div>
        </StoreContext.Provider>
    );
}
