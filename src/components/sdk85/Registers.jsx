import { For, Show, createSignal } from "solid-js";
import { CommandButton } from "./CommandButton.jsx";
import { REGISTER_KEYS, done, examineRegister, next, storeByte } from "./commands.js";

const hex = (value, digits) => value.toString(16).toUpperCase().padStart(digits, "0") + "H";

const FLAGS = [
    { key: "s", label: "S" },
    { key: "z", label: "Z" },
    { key: "ac", label: "AC" },
    { key: "p", label: "P" },
    { key: "cy", label: "CY" },
];

/**
 * What the processor holds, and EXAM REG.
 *
 * The panel above is read straight out of the emulator, which no real SDK-85
 * could do. The controls below are the monitor's own EXAM REG command: they
 * queue its keys, so what you get is the monitor's saved copy of the registers
 * -- the ones it will restore when your program next runs -- shown on the
 * board's own display as you step through them.
 */
export function Registers(props) {
    const [value, setValue] = createSignal("");

    const pairs = () => {
        const r = props.registers;
        return [
            { label: "A", value: hex(r.a, 2) },
            { label: "B, C", value: `${hex(r.b, 2)} ${hex(r.c, 2)}` },
            { label: "D, E", value: `${hex(r.d, 2)} ${hex(r.e, 2)}` },
            { label: "H, L", value: `${hex(r.h, 2)} ${hex(r.l, 2)}` },
            { label: "SP", value: hex(r.sp, 4) },
            { label: "PC", value: hex(r.pc, 4) },
        ];
    };

    const open = () => props.command?.kind === "register";
    const current = () => REGISTER_KEYS[props.command?.index ?? 0];
    const byte = () => Number.parseInt(value(), 16);
    const canStore = () => Number.isInteger(byte()) && byte() >= 0 && byte() <= 0xff;

    const store = () => {
        props.onSend(storeByte(byte()));
        props.onAdvance();
        setValue("");
    };

    return (
        <div class="rounded border border-main-border bg-main-background p-3">
            <h2 class="mb-2 text-xs uppercase tracking-widest text-secondary-foreground">Registers</h2>
            <Show when={props.registers} fallback={<p class="text-sm text-secondary-foreground">Not started.</p>}>
                <div class="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-sm">
                    <For each={pairs()}>
                        {(pair) => (
                            <div class="flex justify-between gap-2">
                                <span class="text-secondary-foreground">{pair.label}</span>
                                <span>{pair.value}</span>
                            </div>
                        )}
                    </For>
                </div>
                <div class="mt-3 flex gap-2 font-mono text-xs">
                    <For each={FLAGS}>
                        {(flag) => (
                            <span
                                class={`rounded border px-1.5 py-0.5 ${
                                    props.registers.flags[flag.key]
                                        ? "border-green-foreground text-green-foreground"
                                        : "border-inactive-border text-secondary-foreground"
                                }`}
                            >
                                {flag.label}
                            </span>
                        )}
                    </For>
                </div>
            </Show>

            <div class="mt-4 border-t border-inactive-border pt-3">
                <Show
                    when={open()}
                    fallback={
                        <div class="flex flex-wrap items-end gap-2">
                            <label class="flex flex-col gap-1 text-xs text-secondary-foreground">
                                Examine on the board
                                <select
                                    class="rounded border border-active-border bg-transparent px-2 py-1 font-mono text-sm"
                                    disabled={props.disabled}
                                    onChange={(e) => props.onSelect(Number(e.currentTarget.value))}
                                    value={props.selected}
                                >
                                    <For each={REGISTER_KEYS}>
                                        {(register, index) => <option value={index()}>{register.name}</option>}
                                    </For>
                                </select>
                            </label>
                            <CommandButton
                                command={examineRegister(REGISTER_KEYS[props.selected].key)}
                                disabled={props.disabled}
                                onSend={(command) => {
                                    props.onSend(command);
                                    props.onOpen();
                                }}
                            >
                                EXAM REG
                            </CommandButton>
                        </div>
                    }
                >
                    <p class="mb-2 text-xs text-secondary-foreground">
                        EXAM REG is open on <span class="font-mono">{current().name}</span>. The display shows its
                        name and its saved contents.
                    </p>
                    <div class="flex flex-wrap items-end gap-2">
                        <label class="flex flex-col gap-1 text-xs text-secondary-foreground">
                            New value
                            <input
                                class="w-20 rounded border border-active-border bg-transparent px-2 py-1 font-mono text-sm"
                                placeholder="FF"
                                maxLength={2}
                                value={value()}
                                onInput={(e) => setValue(e.currentTarget.value.replace(/[^0-9a-fA-F]/g, ""))}
                            />
                        </label>
                        <CommandButton
                            command={canStore() ? storeByte(byte()) : undefined}
                            disabled={props.disabled || !canStore()}
                            onSend={store}
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
