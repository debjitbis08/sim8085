import {BsArrowBarLeft, BsArrowBarRight, BsMemory} from "solid-icons/bs";
import MemoryList from "./MemoryList";
import {Registers} from "./Registers";
import {Flags} from "./Flags";
import {createSignal, onMount, onCleanup} from "solid-js";
import {FiCpu, FiFolder} from 'solid-icons/fi'
import {AiOutlineQuestionCircle} from "solid-icons/ai";
import {IOPorts} from "./IOPorts";
import {Settings} from "./Settings";
import {KeyboardShortcuts} from "./KeyboardShortcuts";
import {Tooltip} from "@kobalte/core/tooltip";
import {Workspace} from "./Workspace.jsx";
import {BiRegularDockLeft, BiSolidDockLeft} from "solid-icons/bi";

export function RightPanel() {
    const [activeTab, setActiveTab] = createSignal('cpu');
    const [expanded, setExpanded] = createSignal(true);
    const [width, setWidth] = createSignal(300);

    onMount(() => {
        const handleResize = () => {
            const isMd = window.matchMedia("(min-width: 768px)").matches;
            setExpanded(isMd);
        };

        // Initial check
        handleResize();

        // Listen for resize events
        window.addEventListener("resize", handleResize);

        window.addEventListener("showLeftPanel", () => {
            setExpanded(true);
        });

        // Cleanup listener on component unmount
        return () => {
            window.removeEventListener("resize", handleResize);
        };
    });

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

    const startResize = (event) => {
        event.stopPropagation();
        event.preventDefault();
        const onMouseMove = (e) => {
            e.stopPropagation();
            e.preventDefault();
            setWidth((prev) => Math.max(300, prev + e.movementX));
        };
        const onMouseUp = () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
        };
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
        onCleanup(() => onMouseUp()); // Cleanup when SolidJS destroys the component
    };

    return (
        <div class={`flex items-start ${expanded() ? "" : ""}`}
             style={{width: `${expanded() ? `${width()}px` : 'auto'}`}}>
            <div
                class="
                    md:relative z-10 bg-page-background flex md:flex-col items-center h-sm:gap-4 gap-4 pt-2 md:pt-4 border-r-0 md:border-r border-r-main-border md:h-[calc(100vh-6.2rem)]
                    fixed bottom-[5.5rem] left-0 h-auto flex-row w-full text-xl pl-2 content-evenly justify-evenly
                    md:bottom-0 md:left-0 md:pl-0 md:w-auto
                ">
                <div class="hidden md:block">
                    <PanelButton
                        icon={expanded() ? <BiSolidDockLeft /> : <BiRegularDockLeft />}
                        isActive={true}
                        onClick={() => toggleExpanded()}
                        title="Expand or Collapse this panel"
                    />
                </div>
                <div class="h-[0.1rem] bg-secondary-foreground w-5 hidden md:block"></div>
                {/*<PanelButton*/}
                {/*  icon={<FiFolder />}*/}
                {/*  isActive={isActive('workspace')}*/}
                {/*  onClick={() => showTab('workspace')}*/}
                {/*  title="Files & Folders"*/}
                {/*/>*/}
                <PanelButton
                    icon={<FiCpu/>}
                    isActive={isActive('cpu')}
                    onClick={() => showTab('cpu')}
                    title="CPU"
                />
                <PanelButton
                    icon={<BsMemory/>}
                    isActive={isActive('memory')}
                    onClick={() => showTab('memory')}
                    title="Memory"
                />
                <PanelButton
                    icon={(
                        <p class="font-bold flex gap-[-1] text-sm md:text-md">
                            <span class="text-nowrap whitespace-nowrap">I/O</span>
                        </p>
                    )}
                    isActive={isActive('io')}
                    onClick={() => showTab('io')}
                    title="Input Output Ports"
                />
                <div class="grow"></div>
                <KeyboardShortcuts/>
                <Settings/>
                <button type="button" class="hidden">
                    <AiOutlineQuestionCircle class="text-xl"/>
                </button>
                <div class="pb-1"></div>
            </div>
            <div id="content"
                 class="shadow-xl md:shadow-none text-sm md:text-base relative z-5 min-w-60 w-full bg-secondary-background border-l-0 border-t border-b border-r md:border-r-0 border-main-border rounded-tl-sm rounded-bl-sm py-4  h-[calc(100svh-10rem)] md:h-[calc(100vh-6.2rem)] flex overflow-x-hidden overflow-y-auto transform transition-transform duration-300 ease-in-out"
                 style={{
                     display: expanded() ? "block" : "none",
                 }}>
                <div class={`w-full ${activeTab() === 'workspace' ? '' : 'hidden'}`}>
                    <Workspace/>
                </div>
                <div class={`w-full max-h-full ${activeTab() === 'cpu' ? '' : 'hidden'} px-2 md:px-4`}>
                    <div>
                        <Registers/>
                    </div>
                    <div class="mt-10">
                        <Flags/>
                    </div>
                </div>
                <div class={`w-full ${activeTab() === 'memory' ? '' : 'hidden'} px-2 md:px-4`}>
                    <MemoryList/>
                </div>
                <div class={`w-full ${activeTab() === 'io' ? '' : 'hidden'} px-2 md:px-4`}>
                    <IOPorts/>
                </div>
                <div class="grow"></div>
            </div>
            <div
                class="w-0 md:min-w-[3px] md:w-[3px] h-[calc(100dvh-4rem)] md:h-[calc(100vh-6.2rem)] cursor-col-resize bg-secondary-background hover:bg-terminal active:bg-terminal border-y border-y-main-border"
                onMouseDown={startResize}
                style={{
                    display: expanded() ? "flex" : "none",
                }}
            >
            </div>
        </div>
    );
}

export function PanelButton(props) {
    return (
        <Tooltip placement="left">
            <Tooltip.Trigger
                class={`tooltip_trigger ${props.isActive ? 'text-active-foreground' : 'text-inactive-foreground'} hover:text-active-foreground transition-colors flex flex-col items-center`}
                onClick={props.onClick}
                disabled={props.disabled}
            >
                <span class="sm:text-xl md:text-xl lg:text-2xl py-1 md:py-2 px-2 lg:px-4">{props.icon}</span>
            </Tooltip.Trigger>
            <Tooltip.Portal>
                <Tooltip.Content class="tooltip__content">
                    <Tooltip.Arrow/>
                    <div class="flex items-center gap-2">
                        <p>{props.title}</p>
                    </div>
                </Tooltip.Content>
            </Tooltip.Portal>
        </Tooltip>
    );
}
