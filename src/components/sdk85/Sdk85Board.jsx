import { For, Show, createSignal } from "solid-js";
import { SDK85_KEYS } from "../../core/sdk85.js";
import { SevenSegmentDigit } from "./SevenSegmentDigit.jsx";

// The keypad, in the four rows of six it has on the board. RESET and VECT INTR
// are wired to the processor rather than to the 8279, so they carry no key
// code and are handled separately.
const KEYPAD = [
    [
        { label: "RESET", kind: "reset", tone: "red" },
        { label: "VECT", sub: "INTR", kind: "interrupt", tone: "red" },
        { label: "C", code: SDK85_KEYS.C, tone: "hex" },
        { label: "D", code: SDK85_KEYS.D, tone: "hex" },
        { label: "E", code: SDK85_KEYS.E, tone: "hex" },
        { label: "F", code: SDK85_KEYS.F, tone: "hex" },
    ],
    [
        { label: "SINGLE", sub: "STEP", code: SDK85_KEYS.SINGLE_STEP },
        { label: "GO", code: SDK85_KEYS.GO },
        { label: "8", code: SDK85_KEYS[8], tone: "hex" },
        { label: "9", code: SDK85_KEYS[9], tone: "hex" },
        { label: "A", code: SDK85_KEYS.A, tone: "hex" },
        { label: "B", code: SDK85_KEYS.B, tone: "hex" },
    ],
    [
        { label: "SUBST", sub: "MEM", code: SDK85_KEYS.SUBST_MEM },
        { label: "EXAM", sub: "REG", code: SDK85_KEYS.EXAM_REG },
        { label: "4", code: SDK85_KEYS[4], tone: "hex" },
        { label: "5", code: SDK85_KEYS[5], tone: "hex" },
        { label: "6", code: SDK85_KEYS[6], tone: "hex" },
        { label: "7", code: SDK85_KEYS[7], tone: "hex" },
    ],
    [
        { label: ".", sub: "EXEC", code: SDK85_KEYS.PERIOD },
        { label: ",", sub: "NEXT", code: SDK85_KEYS.COMMA },
        { label: "0", code: SDK85_KEYS[0], tone: "hex" },
        { label: "1", code: SDK85_KEYS[1], tone: "hex" },
        { label: "2", code: SDK85_KEYS[2], tone: "hex" },
        { label: "3", code: SDK85_KEYS[3], tone: "hex" },
    ],
].flat();

// The display is one row of six digits, read as two fields.
const FIELDS = [
    { label: "Address", from: 0, to: 4 },
    { label: "Data", from: 4, to: 6 },
];

/**
 * The front panel: six digits and twenty-four keys, drawn from what the
 * machine currently shows. It holds no state of its own -- pressing a key
 * queues it on the 8279 and the monitor decides what happens next.
 */
export function Sdk85Board(props) {
    const [pressed, setPressed] = createSignal(null);

    const press = (key) => {
        setPressed(key.label + (key.sub ?? ""));
        setTimeout(() => setPressed(null), 120);
        if (key.kind === "reset") return props.onReset();
        if (key.kind === "interrupt") return props.onInterrupt();
        props.onKey(key.code);
    };

    // A key lights up whether it was clicked here or sent by a command from
    // elsewhere in the interface: from the board's point of view they are the
    // same press, and it should look like it.
    const isLit = (key) =>
        pressed() === key.label + (key.sub ?? "") || (key.code !== undefined && props.litKey === key.code);

    return (
        <div class="rounded-lg border border-main-border bg-[#1c1c1e] p-4 shadow-lg">
            <div class="flex items-center justify-between gap-4">
                <span class="font-mono text-xs uppercase tracking-widest text-[#9a9a9e]">Intel SDK-85</span>
                <span class="font-mono text-xs text-[#9a9a9e]">{props.status}</span>
            </div>

            <div class="mt-3 flex justify-center gap-8 rounded bg-black px-4 py-4">
                {/* The four address digits and the two data digits are separate fields
                    on the board, each labelled on the panel beneath it. */}
                <For each={FIELDS}>
                    {(field) => (
                        <div class="flex flex-col items-center gap-2">
                            <div class="flex gap-2">
                                <For each={props.digits.slice(field.from, field.to)}>
                                    {(digit) => <SevenSegmentDigit segments={digit.segments} dot={digit.dot} />}
                                </For>
                            </div>
                            <span class="font-mono text-[10px] uppercase tracking-widest text-[#6b6b70]">
                                {field.label}
                            </span>
                        </div>
                    )}
                </For>
            </div>

            <div class="mt-4 grid grid-cols-6 gap-1.5">
                <For each={KEYPAD}>
                    {(key) => (
                        <button
                            type="button"
                            class={`flex h-12 flex-col items-center justify-center rounded border font-mono text-xs leading-tight transition-colors
                                ${key.tone === "red" ? "border-[#7a2a24] bg-[#43201d] text-[#f0b8b2]" : ""}
                                ${key.tone === "hex" ? "border-[#4a4a4f] bg-[#2c2c30] text-[#e8e8ea]" : ""}
                                ${!key.tone ? "border-[#3f4a5a] bg-[#252a33] text-[#c7d2e0]" : ""}
                                ${isLit(key) ? "brightness-150 ring-1 ring-[#ff9c8f]" : ""}
                                hover:brightness-125 active:brightness-150 disabled:opacity-50`}
                            disabled={props.disabled}
                            onClick={() => press(key)}
                        >
                            <span class="text-sm">{key.label}</span>
                            <Show when={key.sub}>
                                <span class="text-[10px] text-current opacity-80">{key.sub}</span>
                            </Show>
                        </button>
                    )}
                </For>
            </div>
        </div>
    );
}
