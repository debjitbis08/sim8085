import { createEffect, createSignal, onMount, onCleanup, lazy, Suspense } from "solid-js";
import { Tabs } from "./generic/Tabs";
import { Tooltip } from "./generic/Tooltip.jsx";
import { Assembled } from "./Assembled";
import { BiRegularDockRight, BiSolidDockRight } from "solid-icons/bi";
import { VsLoading } from "solid-icons/vs";
import debounce from "debounce";

const LEDArray = lazy(() => import("./LEDArray.jsx"));

export function RightPanel() {
    let [expanded, setExpanded] = createSignal(true);
    const [width, setWidth] = createSignal(300);

    const toggleExpanded = () => {
        if (window.innerWidth <= 768) {
            setWidth(window.innerWidth * (window.innerWidth > 768 ? 0.3 : 1));
        }
        setExpanded((expanded) => !expanded);
    };

    onMount(() => {
        setWidth(window.innerWidth * (window.innerWidth > 768 ? 0.3 : 1));
        const handleResize = debounce(() => {
            const isMd = window.matchMedia("(min-width: 768px)").matches;
            setExpanded(isMd);
        });

        // Initial check
        handleResize();

        const isMd = window.matchMedia("(min-width: 768px)").matches;

        if (isMd) {
            // Listen for resize events
            window.addEventListener("resize", handleResize);
        }

        window.addEventListener("showRightPanel", () => {
            if (window.innerWidth <= 768) {
                setWidth(window.innerWidth * (window.innerWidth > 768 ? 0.3 : 1));
            }
            setExpanded(true);
        });

        window.addEventListener("showLeftPanel", () => {
            setExpanded(false);
        });

        // Cleanup listener on component unmount
        return () => {
            window.removeEventListener("resize", handleResize);
        };
    });

    const startResize = (event) => {
        event.preventDefault();
        event.stopPropagation();
        const onMouseMove = (e) =>
            setWidth((prev) => {
                e.preventDefault();
                e.stopPropagation();
                let newW = prev - e.movementX;
                if (newW <= 32) {
                    newW = 32;
                    setExpanded(false);
                } else {
                    setExpanded(true);
                }
                return newW;
            });
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
            class={`relative top-0 right-0 ${expanded() ? "w-svw md:auto" : ""} flex border-y-0 md:border-y border-y-main-border ${expanded() ? "md:border-l" : "border-l-0"} border-l-main-border bg-page-background md:bg-main-background h-[calc(100svh-5.6rem)] md:h-[calc(100vh-6.2rem)] ${expanded() ? "shadow-xl" : ""} md:shadow-none`}
            style={{ width: `${expanded() ? `${width()}px` : "auto"}` }}
        >
            <button
                type="button"
                class="w-0 md:min-w-[3px] md:w-[3px] h-[calc(100svh-5.5rem)] md:h-[calc(100vh-6.2rem)] cursor-col-resize hover:bg-terminal active:bg-terminal"
                onMouseDown={startResize}
                style={{
                    display: expanded() ? "block" : "none",
                }}
            ></button>
            <Tabs aria-label="right panel navigation" class={`tabs ${expanded() ? "" : "hidden"} flex flex-col`}>
                <Tabs.List class="tabs__list">
                    <Tabs.Trigger class={`tabs__trigger ${expanded() ? "" : "hidden"}`} value="machine-code">
                        Machine Code
                    </Tabs.Trigger>
                    <Tabs.Trigger class={`tabs__trigger ${expanded() ? "" : "hidden"}`} value="led-array">
                        LED Array
                    </Tabs.Trigger>
                    <Tabs.Indicator class="tabs__indicator" />
                </Tabs.List>
                <Tabs.Content class="tabs__content flex-grow overflow-y-auto overflow-x-auto" value="machine-code">
                    <Assembled />
                </Tabs.Content>
                <Tabs.Content class="tabs__content flex-grow overflow-y-auto overflow-x-auto" value="led-array">
                    <Suspense fallback={<VsLoading class="animate-spin" />}>
                        <LEDArray />
                    </Suspense>
                </Tabs.Content>
            </Tabs>
            <Tooltip placement="left">
                <Tooltip.Trigger
                    class={`tooltip__trigger ${expanded() ? "absolute top-2" : "fixed top-[calc(5rem-7px)]"} right-2 py-1 hidden md:block ml-auto mr-4`}
                    onClick={toggleExpanded}
                >
                    {expanded() ? <BiSolidDockRight /> : <BiRegularDockRight />}
                </Tooltip.Trigger>
                <Tooltip.Portal>
                    <Tooltip.Content class="tooltip__content">
                        <Tooltip.Arrow />
                        <p>{expanded() ? "Collapse Panel" : "Expand Right Panel"}</p>
                    </Tooltip.Content>
                </Tooltip.Portal>
            </Tooltip>
        </div>
    );
}
