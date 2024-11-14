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
import { Tooltip } from "@kobalte/core/tooltip";

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

  const isActive = (tab) => {
    return activeTab() === tab && expanded();
  }

  return (
    <div class={`flex items-start ${expanded() ? "w-[25vw] min-w-[295px] flex-shrink-0" : ""}`}>
      <div class="relative z-10 bg-page-background flex flex-col items-center h-sm:gap-4 gap-8 px-4 pt-4 border-r border-r-main-border" style={{ height: "calc(100vh - 6rem)" }}>
        <PanelButton
          icon={<FiCpu class="text-2xl"/>}
          isActive={isActive('cpu')}
          onClick={() => showTab('cpu')}
          title="CPU"
        />
        <PanelButton
          icon={<BsMemory />}
          isActive={isActive('memory')}
          onClick={() => showTab('memory')}
          title="Memory"
        />
        <PanelButton
          icon={(
            <p class="text-md font-bold flex gap-[-1] text-base">
              <span class="text-nowrap whitespace-nowrap">I/O</span>
            </p>
          )}
          isActive={isActive('io')}
          onClick={() => showTab('io')}
          title="Input Output Ports"
        />
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

export function PanelButton (props) {
  return (
    <Tooltip placement="left">
      <Tooltip.Trigger class={`tooltip_trigger ${props.isActive ? 'text-active-foreground' : 'text-inactive-foreground'} flex flex-col items-center`}
        onClick={props.onClick}
        disabled={props.disabled}
      >
        <span class="text-2xl">{props.icon}</span>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content class="tooltip__content">
          <Tooltip.Arrow />
          <div class="flex items-center gap-2">
            <p>{props.title}</p>
          </div>
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip>
  );
}
