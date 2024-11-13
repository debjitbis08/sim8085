import { BsKeyboard, BsMemory, BsSlash, BsSlashLg } from "solid-icons/bs";
import { HiOutlineCpuChip } from "solid-icons/hi";
import MemoryList from "./MemoryList";
import { Registers } from "./Registers";
import { Flags } from "./Flags";
import { createSignal } from "solid-js";
import { FiCpu } from 'solid-icons/fi'
import { AiOutlineQuestionCircle } from "solid-icons/ai";
import { IOPorts } from "./IOPorts";
import { VsSettings, VsSettingsGear } from "solid-icons/vs";
import { Settings } from "./Settings";
import { KeyboardShortcuts } from "./KeyboardShortcuts";

export function RightPanel() {
  const [activeTab, setActiveTab] = createSignal('cpu');
  const [expanded, setExpanded] = createSignal(true);

  const toggleExpanded = () => {
    setExpanded((expanded) => !expanded);
  };

  const showTab = (tab) => {
    if (tab === activeTab()) {
      toggleExpanded();
    } else {
      setExpanded(true);
    }

    setActiveTab(tab);
  };

  return (
    <div class={`flex items-start ${expanded() ? "w-[25vw] min-w-[295px] flex-shrink-0" : ""}`}>
      <div class="relative z-10 bg-page-background flex flex-col items-center h-sm:gap-4 gap-8 px-4 pt-4 border-r border-r-main-border" style={{ height: "calc(100vh - 6rem)" }}>
        <button type="button" onClick={() => showTab('cpu') } class={`${activeTab() === 'cpu' && expanded() ? 'text-active-foreground' : 'text-inactive-foreground'} flex flex-col items-center`}>
          <FiCpu class="text-2xl"/>
              {/*<span>CPU</span>*/}
        </button>
        <button type="button" onClick={() => showTab('memory')} class={`${activeTab() === 'memory' && expanded() ? 'text-active-foreground' : 'text-inactive-foreground'} flex flex-col items-center`}>
          <BsMemory class="text-2xl" />
            {/*<span>Memory</span>*/}
        </button>
        <button type="button" onClick={() => showTab('io')} class={`${activeTab() === 'io' && expanded() ? 'text-active-foreground' : 'text-inactive-foreground'} flex flex-col items-center`}>
          <p class="text-md font-bold flex gap-[-1]">
            <span class="text-nowrap whitespace-nowrap">I/O</span>
            {/* <BsSlash class="text-2xl"/> */}
            {/* <span>O</span> */}
          </p>
        </button>
        <div class="grow"></div>
        <KeyboardShortcuts />
        <Settings />
        <button type="button" class="hidden">
          <AiOutlineQuestionCircle class="text-xl"/>
        </button>
        <div class="pb-1"></div>
      </div>
      <div id="content" class="relative z-5 min-w-60 w-full bg-secondary-background border-l-0 border-t border-b border-r-0 border-main-border rounded-tl-sm rounded-bl-sm p-4 h-full flex overflow-x-hidden overflow-y-auto transform transition-transform duration-300 ease-in-out"
        style={{
          height: "calc(100vh - 6rem)",
          display: expanded() ? "flex" : "none",
        }}>
        <div class={`w-full max-h-full ${activeTab() === 'cpu' ? '' : 'hidden'}`}>
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
        <div class={`w-full ${activeTab() === 'io' ? '' : 'hidden'}`}>
          <IOPorts />
        </div>
        <div class="grow"></div>
      </div>
    </div>
  );
}
