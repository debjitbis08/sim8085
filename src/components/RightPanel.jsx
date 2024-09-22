import { BsMemory } from "solid-icons/bs";
import { HiOutlineCpuChip } from "solid-icons/hi";
import MemoryList from "./MemoryList";
import { Registers } from "./Registers";
import { Flags } from "./Flags";
import { createSignal } from "solid-js";
import { FiCpu } from 'solid-icons/fi'

export function RightPanel() {
  const [activeTab, setActiveTab] = createSignal('cpu');

  return (
    <div class="flex items-start w-full">
      <div class="flex flex-col gap-8 px-4 pt-4 border-r border-r-gray-600" style={{ height: "calc(100vh - 5rem)" }}>
        <button type="button" onClick={() => setActiveTab('cpu')} class={`${activeTab() === 'cpu' ? 'dark:text-blue-400' : ''} flex flex-col items-center`}>
          <FiCpu class="text-4xl"/>
          <span>CPU</span>
        </button>
        <button type="button" onClick={() => setActiveTab('memory')} class={`${activeTab() === 'memory' ? 'dark:text-blue-400' : ''} flex flex-col items-center`}>
          <BsMemory class="text-4xl" />
          <span>Memory</span>
        </button>
        <div class="grow"></div>
      </div>
      <div class="min-w-60 w-full dark:bg-gray-800 p-4 h-full flex" style={{ height: "calc(100vh - 5rem)" }}>
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
