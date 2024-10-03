import { BsKeyboard, BsMemory } from "solid-icons/bs";
import { HiOutlineCpuChip } from "solid-icons/hi";
import MemoryList from "./MemoryList";
import { Registers } from "./Registers";
import { Flags } from "./Flags";
import { createSignal } from "solid-js";
import { FiCpu } from 'solid-icons/fi'
import { AiOutlineQuestionCircle } from "solid-icons/ai";

export function RightPanel() {
  const [activeTab, setActiveTab] = createSignal('cpu');

  return (
    <div class="flex items-start w-full">
      <div class="flex flex-col gap-8 px-4 pt-4 border-r border-r-gray-300 dark:border-r-gray-600" style={{ height: "calc(100vh - 6rem)" }}>
        <button type="button" onClick={() => setActiveTab('cpu')} class={`${activeTab() === 'cpu' ? 'text-blue-600 dark:text-blue-400' : ''} flex flex-col items-center`}>
          <FiCpu class="text-2xl"/>
              {/*<span>CPU</span>*/}
        </button>
        <button type="button" onClick={() => setActiveTab('memory')} class={`${activeTab() === 'memory' ? 'text-blue-600 dark:text-blue-400' : ''} flex flex-col items-center`}>
          <BsMemory class="text-2xl" />
            {/*<span>Memory</span>*/}
        </button>
        <div class="grow"></div>
        <button type="button" class="hidden">
          <AiOutlineQuestionCircle class="text-xl"/>
        </button>
        <button type="button" class="hidden">
          <BsKeyboard class="text-xl"/>
        </button>
        <div class="pb-1"></div>
      </div>
      <div class="min-w-60 w-full bg-gray-100 dark:bg-gray-800 p-4 h-full flex" style={{ height: "calc(100vh - 6rem)" }}>
        <div class={`w-full ${activeTab() === 'cpu' ? '' : 'hidden'}`}>
          <div>
            <Registers />
          </div>
          <div class="mt-10">
            <Flags />
          </div>
        </div>
        <div class={`w-full ${activeTab() === 'memory' ? '' : 'hidden'}`}>
          <MemoryList />
        </div>
        <div class="grow"></div>
      </div>
    </div>
  );
}
