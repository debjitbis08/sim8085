import { Show, createSignal, onCleanup, onMount } from "solid-js";
import { SDK85_KEYS } from "../../core/sdk85.js";
import { CodeEditor } from "./CodeEditor.jsx";
import { CommandButton } from "./CommandButton.jsx";
import { KeySequence } from "./KeySequence.jsx";
import { MemoryView } from "./MemoryView.jsx";
import { Registers } from "./Registers.jsx";
import { Sdk85Board } from "./Sdk85Board.jsx";
import { REGISTER_KEYS, done, go, goOn, next, singleStepFrom } from "./commands.js";
import { RAM_END, RAM_START, useSdk85 } from "./useSdk85.js";

// What a physical keyboard sends for the keypad's keys, so the board can be
// used without reaching for the mouse. Only while the editor does not have
// focus -- there, a hex digit is a hex digit.
const TYPED_KEYS = {
    ".": SDK85_KEYS.PERIOD,
    ",": SDK85_KEYS.COMMA,
    Enter: SDK85_KEYS.GO,
};
for (let i = 0; i < 16; i++) {
    TYPED_KEYS[i.toString(16)] = i;
    TYPED_KEYS[i.toString(16).toUpperCase()] = i;
}

const RAM_BYTES = RAM_END - RAM_START + 1;

const hex = (value, digits) => value.toString(16).toUpperCase().padStart(digits, "0") + "H";

const SAMPLE = `; The SDK-85 has 256 bytes of RAM at 2000H, and its monitor
; keeps 20C0H upwards for its stack and register save area.
        ORG     2000H

START:  LXI     H, DATA
        MOV     A, M      ; first number
        INX     H
        ADD     M         ; add the second
        INX     H
        MOV     M, A      ; leave the sum at RESULT
        RST     1         ; back to the monitor

DATA:   DB      2AH, 18H
RESULT: DB      0

        END     START
`;

/**
 * The SDK-85 as something to work on rather than only to look at.
 *
 * There is one machine, and one way to command it. Every control here that
 * says it runs a monitor command queues that command's keys on the 8279, so
 * Intel's own SUBST, EXAM, GOCMD and SSTEP routines are what execute and the
 * display goes through the states it would have anyway. The keypad and these
 * buttons are two interfaces to the same monitor, and either can be used at
 * any point -- including halfway through a command.
 *
 * The two exceptions are honest about themselves: loading assembled bytes
 * writes them into RAM directly, because keying in 192 bytes is the tedium the
 * editor exists to spare you, and Pause and Step stop the emulated processor
 * itself, which no key on a real board could do.
 */
export function Sdk85Workbench() {
    const machine = useSdk85();
    const [source, setSource] = createSignal(SAMPLE);
    const [message, setMessage] = createSignal(null);
    const [loaded, setLoaded] = createSignal(null);
    // Which monitor command is part way through, so the interface can offer
    // what the monitor will actually accept next -- and refuse to start a
    // second command while the first one has the display.
    const [command, setCommand] = createSignal(null);
    const [register, setRegister] = createSignal(0);

    onMount(() => machine.boot());

    const running = () => machine.status() === "running";
    // A command cannot be keyed into a board that is not running its monitor,
    // and not while the keys of the last one are still going in.
    const canCommand = () => running() && machine.queued().length === 0;
    const send = (issued) => machine.sendKeys(issued.keys);
    // A command that is not the one already open cannot be started: the monitor
    // is inside SUBST MEM or EXAM REG and would read the keys as its own.
    const canStart = (kind) => canCommand() && (command() === null || command().kind === kind);

    const assembleAndLoad = () => {
        try {
            const result = machine.assembleAndLoad(source());
            setLoaded(result);
            setMessage({
                kind: "ok",
                text: `${result.size} bytes written to ${hex(result.first, 4)}–${hex(result.last, 4)}. GO starts at ${hex(result.start, 4)}.`,
            });
        } catch (e) {
            setLoaded(null);
            setMessage({ kind: "error", text: e.message ?? String(e) });
        }
    };

    const onKeyDown = (event) => {
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        if (event.target?.closest?.(".cm-editor, input, textarea, select, [contenteditable='true']")) return;
        const code = TYPED_KEYS[event.key];
        if (code === undefined) return;
        event.preventDefault();
        machine.pressKey(code);
    };
    window.addEventListener("keydown", onKeyDown);
    onCleanup(() => window.removeEventListener("keydown", onKeyDown));

    const statusLabel = () => {
        switch (machine.status()) {
            case "off":
                return "powered off";
            case "booting":
                return "booting…";
            case "paused":
                return "paused — the processor is stopped";
            case "halted":
                return "halted";
            case "failed":
                return "failed";
            default:
                return "running";
        }
    };

    return (
        <div class="grid w-full gap-6 lg:grid-cols-[minmax(0,1fr)_29rem]">
            <div class="flex min-w-0 flex-col">
                <div class="flex flex-wrap items-start gap-2 border-b border-main-border pb-3">
                    <button
                        type="button"
                        class="rounded border border-active-border px-3 py-1 text-sm hover:bg-secondary-background disabled:opacity-50"
                        disabled={machine.status() === "booting" || machine.status() === "failed"}
                        onClick={assembleAndLoad}
                    >
                        Assemble &amp; Load
                    </button>
                    <CommandButton
                        command={loaded() ? go(loaded().start) : goOn()}
                        disabled={!canStart(null)}
                        onSend={(issued) => {
                            send(issued);
                            setMessage({
                                kind: "ok",
                                text: loaded()
                                    ? `GO ${hex(loaded().start, 4)} — the monitor restores your registers and runs it.`
                                    : "GO with no address — the monitor carries on from its saved program counter.",
                            });
                        }}
                    >
                        Run on the board
                    </CommandButton>
                    <Show
                        when={command()?.kind === "step"}
                        fallback={
                            <CommandButton
                                command={singleStepFrom(loaded()?.start ?? RAM_START)}
                                disabled={!canStart(null)}
                                onSend={(issued) => {
                                    send(issued);
                                    setCommand({ kind: "step" });
                                }}
                            >
                                Single step
                            </CommandButton>
                        }
                    >
                        <CommandButton command={next()} disabled={!canCommand()} onSend={send}>
                            Step again
                        </CommandButton>
                        <CommandButton
                            command={done()}
                            disabled={!canCommand()}
                            onSend={(issued) => {
                                send(issued);
                                setCommand(null);
                            }}
                        >
                            Finish stepping
                        </CommandButton>
                    </Show>
                </div>

                <div class="min-h-[24rem] flex-grow border-b border-main-border">
                    <CodeEditor value={source()} onChange={setSource} />
                </div>

                <Show when={message()}>
                    <p
                        class={`mt-3 rounded border px-3 py-2 font-mono text-xs ${
                            message().kind === "error"
                                ? "border-red-foreground text-red-foreground"
                                : "border-inactive-border text-secondary-foreground"
                        }`}
                    >
                        {message().text}
                    </p>
                </Show>
                <Show when={machine.error()}>
                    <p class="mt-3 rounded border border-red-foreground px-3 py-2 text-sm text-red-foreground">
                        {machine.error()}
                    </p>
                </Show>
            </div>

            <div class="flex flex-col gap-4">
                <div class="rounded border border-main-border bg-main-background p-3">
                    <div class="mb-2 flex items-baseline justify-between gap-2">
                        <h2 class="text-xs uppercase tracking-widest text-secondary-foreground">Machine</h2>
                        <span class="font-mono text-xs text-secondary-foreground">{statusLabel()}</span>
                    </div>
                    <div class="flex flex-wrap gap-2">
                        <button
                            type="button"
                            class="rounded border border-active-border px-3 py-1 text-sm hover:bg-secondary-background disabled:opacity-50"
                            disabled={machine.status() === "booting" || machine.status() === "failed"}
                            onClick={() => {
                                setCommand(null);
                                machine.status() === "off" ? machine.powerOn() : machine.powerOff();
                            }}
                        >
                            {machine.status() === "off" ? "Power on" : "Power off"}
                        </button>
                        <button
                            type="button"
                            class="rounded border border-active-border px-3 py-1 text-sm hover:bg-secondary-background disabled:opacity-50"
                            title="The RESET key: the processor and the peripherals start again, RAM keeps what is in it"
                            disabled={machine.status() === "off" || machine.status() === "failed"}
                            onClick={() => {
                                setCommand(null);
                                machine.reset();
                            }}
                        >
                            RESET
                        </button>
                        <button
                            type="button"
                            class="rounded border border-active-border px-3 py-1 text-sm hover:bg-secondary-background disabled:opacity-50"
                            title="VECT INTR: raises RST 7.5, which takes control back from a running program"
                            disabled={!running()}
                            onClick={machine.interrupt}
                        >
                            VECT INTR
                        </button>
                        <span class="mx-1 w-px self-stretch bg-inactive-border" />
                        <button
                            type="button"
                            class="rounded border border-active-border px-3 py-1 text-sm hover:bg-secondary-background disabled:opacity-50"
                            title="Stops the emulated processor itself. No key on a real board does this."
                            disabled={machine.status() === "off" || machine.status() === "failed"}
                            onClick={() => (running() ? machine.pause() : machine.run())}
                        >
                            {running() ? "Pause" : "Resume"}
                        </button>
                        <button
                            type="button"
                            class="rounded border border-active-border px-3 py-1 text-sm hover:bg-secondary-background disabled:opacity-50"
                            title="One instruction of the emulated processor, wherever it is — including inside the monitor"
                            disabled={machine.status() === "off" || machine.status() === "failed"}
                            onClick={machine.stepInstruction}
                        >
                            Step one instruction
                        </button>
                    </div>
                    <p class="mt-2 text-xs text-secondary-foreground">
                        Power off loses RAM; RESET keeps it. Pause and Step are the simulator's, not the board's —
                        everything else here is a key on the keypad.
                    </p>
                </div>

                <Sdk85Board
                    digits={machine.digits()}
                    status={statusLabel()}
                    disabled={!running()}
                    litKey={machine.litKey()}
                    onKey={machine.pressKey}
                    onReset={machine.reset}
                    onInterrupt={machine.interrupt}
                />

                <KeySequence
                    keys={machine.queued()}
                    idle={
                        command()
                            ? "A command is open on the board. Finish it, or press . on the keypad."
                            : "Commands sent from this page arrive as keypresses, and appear here."
                    }
                />

                <Registers
                    registers={machine.registers()}
                    command={command()}
                    selected={register()}
                    disabled={!canStart("register")}
                    onSelect={setRegister}
                    onSend={send}
                    onOpen={() => setCommand({ kind: "register", index: register() })}
                    onAdvance={() =>
                        setCommand((open) => ({
                            ...open,
                            index: Math.min(open.index + 1, REGISTER_KEYS.length - 1),
                        }))
                    }
                    onClose={() => setCommand(null)}
                />

                <MemoryView
                    read={machine.readMemory}
                    revision={machine.revision()}
                    length={RAM_BYTES}
                    command={command()}
                    disabled={!canStart("memory")}
                    onSend={send}
                    onOpen={(address) => setCommand({ kind: "memory", address })}
                    onAdvance={() => setCommand((open) => ({ ...open, address: (open.address + 1) & 0xffff }))}
                    onClose={() => setCommand(null)}
                />
            </div>
        </div>
    );
}
