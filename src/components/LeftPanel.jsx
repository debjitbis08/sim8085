import { BsMemory } from "solid-icons/bs";
import { Registers } from "./Registers.jsx";
import { Flags } from "./Flags.jsx";
import { createSignal, onMount, onCleanup, Show, Suspense, lazy } from "solid-js";
import { FiCpu, FiFolder } from "solid-icons/fi";
import { AiOutlineQuestionCircle } from "solid-icons/ai";
import { Tooltip } from "./generic/Tooltip.jsx";
import { BiRegularDockLeft, BiSolidDockLeft } from "solid-icons/bi";
import {
    FaRegularLightbulb,
    FaSolidLightbulb,
    FaSolidScrewdriverWrench,
    FaSolidTriangleExclamation,
} from "solid-icons/fa";
import { VsLoading } from "solid-icons/vs";
import DelayedComponent from "./generic/DelayedComponent.jsx";
import InterruptState from "./InterruptState.jsx";
import { onInit, getUser } from "../lib/supabase.js";
import "./LeftPanel.css";
import { KeepAlive } from "./generic/KeepAlive.jsx";

const Workspace = lazy(() => import("./Workspace.jsx"));
const IOPorts = lazy(() => import("./IOPorts.jsx"));
const MemoryList = lazy(() => import("./MemoryList.jsx"));
const Toolbox = lazy(() => import("./Toolbox.jsx"));

export function LeftPanel() {
    const [activeTab, setActiveTab] = createSignal("cpu");
    const [expanded, setExpanded] = createSignal(true);
    const [width, setWidth] = createSignal(300);
    const [isOnline, setIsOnline] = createSignal(false);
    const [workspaceEnabled, setWorkspaceEnabled] = createSignal(true);
    const [noSession, setNoSession] = createSignal(true);

    onMount(() => {
        onInit(async () => {
            const result = await getUser();

            const error = result.error;

            if (error && error.name === "AuthSessionMissingError") {
                setNoSession(true);
            } else {
                setNoSession(false);
            }
        });

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

        window.addEventListener("showRightPanel", () => {
            setExpanded(false);
        });

        setIsOnline(navigator.onLine);
        const updateOnlineStatus = () => setIsOnline(navigator.onLine);
        window.addEventListener("online", updateOnlineStatus);
        window.addEventListener("offline", updateOnlineStatus);

        // Cleanup listener on component unmount
        return () => {
            window.removeEventListener("resize", handleResize);
            window.removeEventListener("online", updateOnlineStatus);
            window.removeEventListener("offline", updateOnlineStatus);
        };
    });

    const toggleExpanded = () => {
        setExpanded((expanded) => !expanded);
    };

    const showTab = (tab) => {
        setExpanded(true);
        setActiveTab(tab);
    };

    const isActive = (tab) => {
        return activeTab() === tab && expanded();
    };

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
        <div
            class={`flex items-start ${expanded() ? "" : ""}`}
            style={{ width: `${expanded() ? `${width()}px` : "auto"}` }}
        >
            <div
                class="
                    md:relative z-10 bg-page-background flex md:flex-col items-center h-sm:gap-4 gap-4 pt-2 md:pt-4 border-r-0 md:border-r border-r-main-border md:h-[calc(100vh-6.2rem)]
                    fixed bottom-[5.5rem] left-0 h-auto flex-row w-full text-xl pl-2 content-evenly justify-evenly
                    md:bottom-0 md:left-0 md:pl-0 md:w-auto
                "
            >
                <div class="hidden md:block">
                    <PanelButton
                        icon={expanded() ? <BiSolidDockLeft /> : <BiRegularDockLeft />}
                        isActive={true}
                        onClick={() => toggleExpanded()}
                        title="Expand or Collapse this panel"
                    />
                </div>
                <div class="h-[0.1rem] bg-secondary-foreground w-5 hidden md:block"></div>

                <div>
                    <PanelButton
                        icon={<FiFolder />}
                        isActive={isActive("workspace")}
                        onClick={() => showTab("workspace")}
                        title="Files & Folders"
                    />
                </div>
                <PanelButton icon={<FiCpu />} isActive={isActive("cpu")} onClick={() => showTab("cpu")} title="CPU" />
                <PanelButton
                    icon={<BsMemory />}
                    isActive={isActive("memory")}
                    onClick={() => showTab("memory")}
                    title="Memory"
                />
                <PanelButton
                    icon={
                        <p class="font-bold flex gap-[-1] text-sm md:text-md">
                            <span class="text-nowrap whitespace-nowrap">I/O</span>
                        </p>
                    }
                    isActive={isActive("io")}
                    onClick={() => showTab("io")}
                    title="Input Output Ports"
                />
                <PanelButton
                    icon={<FaSolidScrewdriverWrench class="text-[18px]" />}
                    isActive={isActive("toolbox")}
                    onClick={() => showTab("toolbox")}
                    title="Toolbox"
                />
                <div class="grow"></div>
                <Show when={isOnline()}>
                    <PanelButton
                        class="hidden md:flex"
                        icon={
                            <span class="hover:text-yellow-foreground group">
                                <FaRegularLightbulb class="group-hover:hidden" />
                                <FaSolidLightbulb class="hidden group-hover:block" />
                            </span>
                        }
                        isActive={false}
                        disabled={false}
                        onClick={() => {
                            window.dispatchEvent(
                                new CustomEvent("showTips", {
                                    detail: {},
                                }),
                            );
                        }}
                        title="Show Tips"
                    />
                </Show>
                <div class="py-1 md:py-2">
                    <DelayedComponent
                        delayInMs={4000}
                        fn={() => import("./KeyboardShortcuts.jsx")}
                        fallback={<VsLoading class="animate-spin" />}
                    />
                </div>
                <div class="py-1 md:py-2">
                    <DelayedComponent
                        delayInMs={4000}
                        fn={() => import("./Settings.jsx")}
                        fallback={<VsLoading class="animate-spin" />}
                    />
                </div>
                <button type="button" class="hidden">
                    <AiOutlineQuestionCircle class="text-xl" />
                </button>
                <div class="pb-1"></div>
            </div>
            <div
                id="content"
                class="shadow-xl md:shadow-none text-sm md:text-base relative z-5 min-w-60 w-full bg-secondary-background border-l-0 border-t border-b border-r md:border-r-0 border-main-border rounded-tl-sm rounded-bl-sm py-4  h-[calc(100svh-10.3rem)] md:h-[calc(100vh-6.2rem)] flex overflow-x-hidden overflow-y-auto transform transition-transform duration-300 ease-in-out"
                style={{
                    display: expanded() ? "block" : "none",
                }}
            >
                <div class={`w-full max-h-full px-2 md:px-4`}>
                    <KeepAlive active={activeTab() === "cpu"}>
                        <div class="flex flex-col items-center justify-start gap-6">
                            <div class="w-full">
                                <Registers />
                            </div>
                            <div class="w-full">
                                <Flags />
                            </div>
                            <div class="w-full">
                                <InterruptState />
                            </div>
                        </div>
                    </KeepAlive>
                    <Suspense fallback={<PanelLoader />}>
                        <KeepAlive active={activeTab() === "memory"}>
                            <MemoryList />
                        </KeepAlive>
                    </Suspense>
                    <Suspense fallback={<PanelLoader />}>
                        <KeepAlive active={activeTab() === "io"}>
                            <IOPorts />
                        </KeepAlive>
                    </Suspense>
                    <Suspense fallback={<PanelLoader />}>
                        <KeepAlive active={activeTab() === "workspace"}>
                            <Workspace />
                        </KeepAlive>
                    </Suspense>
                    <Suspense fallback={<PanelLoader />}>
                        <KeepAlive active={activeTab() === "toolbox"}>
                            <Toolbox />
                        </KeepAlive>
                    </Suspense>
                </div>
                <div class="grow"></div>
            </div>
            <div
                class="w-0 md:min-w-[3px] md:w-[3px] h-[calc(100dvh-4rem)] md:h-[calc(100vh-6.2rem)] cursor-col-resize bg-secondary-background hover:bg-terminal active:bg-terminal border-y border-y-main-border"
                onMouseDown={startResize}
                style={{
                    display: expanded() ? "flex" : "none",
                }}
            ></div>
        </div>
    );
}

export function PanelButton(props) {
    return (
        <Tooltip placement="left">
            <Tooltip.Trigger
                class={`${props.class} tooltip_trigger ${props.isActive ? "text-active-foreground" : "text-inactive-foreground"} hover:text-active-foreground transition-colors flex flex-col items-center cursor-pointer`}
                onClick={props.onClick}
                disabled={props.disabled}
            >
                <span class="sm:text-xl md:text-xl lg:text-2xl py-1 md:py-2 px-2 lg:px-4">{props.icon}</span>
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

function PanelLoader() {
    return (
        <div class="h-24 text-center pt-10">
            <div class="w-full flex items-center justify-center mx-auto mb-2">
                <VsLoading class="animate-spin" />
            </div>
            Loading Panel...
        </div>
    );
}
