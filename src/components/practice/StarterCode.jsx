import { For, Show, createMemo, createSignal } from "solid-js";
import { store, setStore } from "../../store/store.js";
import { diffLines, isUnchanged } from "../../lib/practice/diff.js";

/**
 * The code the step started you with.
 *
 * Once a step seeds the editor with your own solution to the previous step,
 * the step's own scaffolding is gone from view: the comments marking where the
 * new work goes, the shape it expected you to build on. This puts it back
 * within reach without taking away what you have written.
 */
export function StarterCode(props) {
    const [open, setOpen] = createSignal(false);
    const [mode, setMode] = createSignal("code"); // "code" | "compare"
    const [copied, setCopied] = createSignal(false);
    const [confirmingRestore, setConfirmingRestore] = createSignal(false);

    const starter = () => props.starterCode ?? "";
    const current = () => store.activeFile.content ?? "";

    const diff = createMemo(() => diffLines(starter(), current()));
    const matches = () => isUnchanged(starter(), current());

    async function copy() {
        try {
            await navigator.clipboard.writeText(starter());
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // Clipboard access can be refused; the code is on screen to select.
            setCopied(false);
        }
    }

    function restore() {
        if (!confirmingRestore()) {
            setConfirmingRestore(true);
            setTimeout(() => setConfirmingRestore(false), 4000);
            return;
        }
        setStore("activeFile", "content", starter());
        setConfirmingRestore(false);
    }

    return (
        <div class="border-t border-inactive-border pt-3">
            <button
                type="button"
                class="flex items-center gap-2 text-sm text-inactive-foreground hover:text-terminal cursor-pointer"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open()}
            >
                <span class="text-xs">{open() ? "▾" : "▸"}</span>
                <span>Starting code for this step</span>
                <Show when={!matches()}>
                    <span class="text-xs font-mono">(yours differs)</span>
                </Show>
            </button>

            <Show when={open()}>
                <div class="mt-2">
                    <div class="flex items-center gap-2 mb-2 flex-wrap">
                        <button
                            type="button"
                            class={`text-xs px-2 py-1 rounded border cursor-pointer ${
                                mode() === "code" ? "border-terminal text-terminal" : "border-inactive-border"
                            }`}
                            onClick={() => setMode("code")}
                        >
                            Starting code
                        </button>
                        <button
                            type="button"
                            class={`text-xs px-2 py-1 rounded border cursor-pointer ${
                                mode() === "compare" ? "border-terminal text-terminal" : "border-inactive-border"
                            }`}
                            onClick={() => setMode("compare")}
                        >
                            Compare with mine
                        </button>
                    </div>

                    <Show when={mode() === "code"}>
                        <pre class="text-xs font-mono p-2 rounded border border-inactive-border bg-main-background overflow-x-auto">
                            {starter()}
                        </pre>
                    </Show>

                    <Show when={mode() === "compare"}>
                        <Show
                            when={!matches()}
                            fallback={
                                <p class="text-xs text-inactive-foreground py-2">
                                    Your code is identical to the starting code.
                                </p>
                            }
                        >
                            <div class="text-xs font-mono rounded border border-inactive-border bg-main-background overflow-x-auto">
                                <For each={diff()}>
                                    {(line) => (
                                        <div
                                            class={
                                                line.type === "removed"
                                                    ? "text-red-foreground bg-red-foreground/10 px-2"
                                                    : line.type === "added"
                                                      ? "text-terminal bg-terminal/10 px-2"
                                                      : "text-inactive-foreground px-2"
                                            }
                                        >
                                            <span class="select-none opacity-60">
                                                {line.type === "removed" ? "-" : line.type === "added" ? "+" : " "}
                                            </span>{" "}
                                            {line.text || " "}
                                        </div>
                                    )}
                                </For>
                            </div>
                            <p class="text-xs text-inactive-foreground mt-1">
                                <span class="text-red-foreground">-</span> only in the starting code,{" "}
                                <span class="text-terminal">+</span> only in yours.
                            </p>
                        </Show>
                    </Show>

                    <div class="flex items-center gap-2 mt-2">
                        <button
                            type="button"
                            class="text-xs px-2 py-1 rounded border border-active-border hover:bg-main-background cursor-pointer"
                            onClick={copy}
                        >
                            {copied() ? "Copied" : "Copy"}
                        </button>
                        {/* Two-step, because this throws away whatever they have
                            written and there is no undo across the store. */}
                        <button
                            type="button"
                            class={`text-xs px-2 py-1 rounded border cursor-pointer ${
                                confirmingRestore()
                                    ? "border-red-foreground text-red-foreground"
                                    : "border-active-border hover:bg-main-background"
                            }`}
                            onClick={restore}
                        >
                            {confirmingRestore() ? "Replace my code?" : "Restore into editor"}
                        </button>
                    </div>
                </div>
            </Show>
        </div>
    );
}
