import { For, Show, createMemo, createSignal } from "solid-js";
import { CommandButton } from "./CommandButton.jsx";
import { MONITOR_RAM_START, RAM_END, RAM_START } from "./useSdk85.js";
import { done, examineMemory, next, storeByte } from "./commands.js";

const ROW_BYTES = 16;
const hex = (value, digits) => value.toString(16).toUpperCase().padStart(digits, "0");

/**
 * The board's RAM, all 256 bytes of it, and SUBST MEM.
 *
 * The grid is the emulator's view. The controls are the monitor's command: they
 * queue the keys of `SUBST MEM`, and the address they are working on is the
 * monitor's current address, shown on the board's display at the same time it
 * is highlighted here.
 */
export function MemoryView(props) {
    const [address, setAddress] = createSignal("2000");
    const [value, setValue] = createSignal("");

    const rows = createMemo(() => {
        // Reread whenever the machine has run.
        void props.revision;
        const bytes = props.read(RAM_START, props.length);
        const rows = [];
        for (let offset = 0; offset < bytes.length; offset += ROW_BYTES) {
            rows.push({
                address: RAM_START + offset,
                bytes: [...bytes.slice(offset, offset + ROW_BYTES)],
            });
        }
        return rows;
    });

    const open = () => props.command?.kind === "memory";
    const current = () => props.command?.address;
    const wanted = () => Number.parseInt(address(), 16);
    const canExamine = () => Number.isInteger(wanted()) && wanted() >= 0 && wanted() <= 0xffff;
    const byte = () => Number.parseInt(value(), 16);
    const canStore = () => Number.isInteger(byte()) && byte() >= 0 && byte() <= 0xff;

    return (
        <div class="rounded border border-main-border bg-main-background p-3">
            <h2 class="mb-2 text-xs uppercase tracking-widest text-secondary-foreground">Memory</h2>
            <div class="overflow-x-auto">
                <table class="font-mono text-[11px] leading-5">
                    <tbody>
                        <For each={rows()}>
                            {(row) => (
                                <tr>
                                    <td class="pr-2 text-secondary-foreground">{hex(row.address, 4)}</td>
                                    <For each={row.bytes}>
                                        {(byte, index) => (
                                            <td
                                                class={`px-[3px] ${
                                                    row.address + index() >= MONITOR_RAM_START
                                                        ? "text-secondary-foreground opacity-60"
                                                        : ""
                                                } ${byte === 0 ? "opacity-50" : ""} ${
                                                    open() && row.address + index() === current()
                                                        ? "rounded bg-terminal/20 text-terminal opacity-100"
                                                        : ""
                                                }`}
                                            >
                                                {hex(byte, 2)}
                                            </td>
                                        )}
                                    </For>
                                </tr>
                            )}
                        </For>
                    </tbody>
                </table>
            </div>

            <div class="mt-3 border-t border-inactive-border pt-3">
                <Show
                    when={open()}
                    fallback={
                        <div class="flex flex-wrap items-end gap-2">
                            <label class="flex flex-col gap-1 text-xs text-secondary-foreground">
                                Examine on the board
                                <input
                                    class="w-20 rounded border border-active-border bg-transparent px-2 py-1 font-mono text-sm"
                                    placeholder="2000"
                                    maxLength={4}
                                    value={address()}
                                    onInput={(e) => setAddress(e.currentTarget.value.replace(/[^0-9a-fA-F]/g, ""))}
                                />
                            </label>
                            <CommandButton
                                command={canExamine() ? examineMemory(wanted()) : undefined}
                                disabled={props.disabled || !canExamine()}
                                onSend={(command) => {
                                    props.onSend(command);
                                    props.onOpen(wanted());
                                }}
                            >
                                SUBST MEM
                            </CommandButton>
                        </div>
                    }
                >
                    <p class="mb-2 text-xs text-secondary-foreground">
                        SUBST MEM is open at <span class="font-mono">{hex(current() ?? 0, 4)}H</span>.
                        <Show when={(current() ?? 0) >= MONITOR_RAM_START && (current() ?? 0) <= RAM_END}>
                            {" "}
                            That is the monitor's own RAM — changing it will upset it.
                        </Show>
                    </p>
                    <div class="flex flex-wrap items-end gap-2">
                        <label class="flex flex-col gap-1 text-xs text-secondary-foreground">
                            New byte
                            <input
                                class="w-20 rounded border border-active-border bg-transparent px-2 py-1 font-mono text-sm"
                                placeholder="3E"
                                maxLength={2}
                                value={value()}
                                onInput={(e) => setValue(e.currentTarget.value.replace(/[^0-9a-fA-F]/g, ""))}
                            />
                        </label>
                        <CommandButton
                            command={canStore() ? storeByte(byte()) : undefined}
                            disabled={props.disabled || !canStore()}
                            onSend={(command) => {
                                props.onSend(command);
                                props.onAdvance();
                                setValue("");
                            }}
                        >
                            Store &amp; next
                        </CommandButton>
                        <CommandButton
                            command={next()}
                            disabled={props.disabled}
                            onSend={(command) => {
                                props.onSend(command);
                                props.onAdvance();
                            }}
                        >
                            Next
                        </CommandButton>
                        <CommandButton
                            command={done()}
                            disabled={props.disabled}
                            onSend={(command) => {
                                props.onSend(command);
                                props.onClose();
                                setValue("");
                            }}
                        >
                            Done
                        </CommandButton>
                    </div>
                </Show>
            </div>
        </div>
    );
}
