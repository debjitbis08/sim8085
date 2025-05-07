import { FaSolidArrowRightArrowLeft } from "solid-icons/fa";
import { createSignal, createEffect } from "solid-js";

export default function Toolbox() {
    return (
        <div class="h-full flex flex-col gap-4">
            <h2 class="text-xl pb-1 border-b border-b-inactive-border">Toolbox</h2>
            <HexDecimalConverter />
            <div class="border-b border-dashed border-b-secondary-border my-4"></div>
            <BinaryConverter />
            <div class="border-b border-dashed border-b-secondary-border my-4"></div>
            <RimSimRegisterEditor />
        </div>
    );
}

function HexDecimalConverter() {
    const [hex, setHex] = createSignal(0);
    const [dec, setDec] = createSignal(0);

    const setValue = (value, base) => {
        const parsed = Number.parseInt(value, base);

        if (Number.isInteger(parsed)) {
            setHex(parsed);
            setDec(parsed);
        }
    };

    return (
        <div>
            <h2 class="text-lg mb-2 flex items-center gap-2">
                Hex <FaSolidArrowRightArrowLeft class="text-secondary-foreground text-sm" /> Decimal
            </h2>
            <div class="flex items-center gap-2">
                <div class="flex items-center gap-1 border-b border-b-gray-300 min-w-0">
                    <input
                        type="text"
                        class="w-full p-1 bg-transparent outline-none placeholder:text-inactive-foreground font-mono"
                        placeholder="Hex"
                        value={hex().toString(16).toUpperCase()}
                        onInput={(e) => {
                            setValue(e.target.value, 16);
                        }}
                    />
                    <span class="text-secondary-foreground text-sm">Hex</span>
                </div>
                <FaSolidArrowRightArrowLeft class="text-secondary-foreground text-sm" />
                <div class="flex items-center gap-1 border-b border-b-gray-300 min-w-0">
                    <input
                        type="text"
                        class="w-full p-1 bg-transparent outline-none placeholder:text-inactive-foreground font-mono"
                        placeholder="Decimal"
                        value={dec()}
                        onInput={(e) => {
                            setValue(e.target.value, 10);
                        }}
                    />
                    <span class="text-secondary-foreground text-sm">Dec</span>
                </div>
            </div>
        </div>
    );
}

function BinaryConverter() {
    const [bits, setBits] = createSignal(Array(16).fill(0));
    const [outputMode, setOutputMode] = createSignal("dec");
    const [textValue, setTextValue] = createSignal("0");

    // Convert bits array to number
    const getValue = () => parseInt(bits().join(""), 2);

    // Update bits from a numeric value
    const updateBitsFromValue = (value) => {
        const clamped = Math.max(0, Math.min(0xffff, value));
        const binStr = clamped.toString(2).padStart(16, "0");
        setBits(binStr.split("").map((b) => +b));
    };

    // Sync textValue whenever bits change
    createEffect(() => {
        const value = getValue();
        setTextValue(outputMode() === "dec" ? value.toString(10) : value.toString(16).toUpperCase());
    });

    const handleInputChange = (e) => {
        const val = e.target.value.trim();
        setTextValue(val);

        const parsed = outputMode() === "dec" ? parseInt(val, 10) : parseInt(val, 16);

        if (!isNaN(parsed)) {
            updateBitsFromValue(parsed);
        }
    };

    const toggleBit = (index) => {
        setBits((prev) => {
            const copy = [...prev];
            copy[index] = copy[index] ? 0 : 1;
            return copy;
        });
    };

    return (
        <div>
            <h2 class="text-lg mb-2 flex items-center gap-2">
                Binary <FaSolidArrowRightArrowLeft class="text-secondary-foreground text-sm" />
                {outputMode() === "dec" ? "Decimal" : "Hex"}
            </h2>

            <div class="flex flex-wrap gap-1 mb-2">
                {bits()
                    .slice(8, 16)
                    .map((bit, index) => (
                        <div class="flex flex-col items-center">
                            <input
                                type="text"
                                value={bit}
                                maxlength={1}
                                class="font-mono text-sm w-4 p-1 bg-transparent outline-none placeholder:text-inactive-foreground border-b border-b-gray-300 cursor-pointer"
                                onClick={() => toggleBit(8 + index)}
                                readonly
                            />
                            <div class="text-sm text-secondary-foreground">{7 - index}</div>
                        </div>
                    ))}
            </div>

            <div class="flex flex-wrap gap-1 mb-2">
                {bits()
                    .slice(0, 8)
                    .map((bit, index) => (
                        <div class="flex flex-col items-center">
                            <input
                                type="text"
                                value={bit}
                                maxlength={1}
                                class="text-sm w-4 p-1 bg-transparent outline-none placeholder:text-inactive-foreground border-b border-b-gray-300 cursor-pointer"
                                onClick={() => toggleBit(index)}
                                readonly
                            />
                            <div class="text-sm text-secondary-foreground">{8 + 7 - index}</div>
                        </div>
                    ))}
            </div>

            <div class="flex items-end gap-2 border-b">
                <div>
                    <input
                        type="text"
                        class="w-full bg-transparent outline-none font-mono"
                        value={textValue()}
                        onInput={handleInputChange}
                        placeholder={outputMode() === "dec" ? "Decimal" : "Hex"}
                    />
                </div>
                <select
                    class="ml-auto p-1 rounded-md bg-secondary-background text-secondary-foreground text-sm"
                    value={outputMode()}
                    onInput={(e) => setOutputMode(e.target.value)}
                >
                    <option value="dec">Decimal</option>
                    <option value="hex">Hex</option>
                </select>
            </div>
        </div>
    );
}

const SIM_BIT_LABELS = [
    { short: "M5.5", long: "Mask RST5.5" },
    { short: "M6.5", long: "Mask RST6.5" },
    { short: "M7.5", long: "Mask RST7.5" },
    { short: "MSE", long: "Mask Set Enable" },
    { short: "R7.5", long: "Reset RST7.5" },
    { short: "XXX", long: "Ignored" },
    { short: "SDE", long: "Serial Data Enable" },
    { short: "SOD", long: "Serial Out Data" },
];

const RIM_BIT_LABELS = [
    { short: "M5.5", long: " Interrupt Mask" },
    { short: "M6.5", long: " Interrupt Mask" },
    { short: "M7.5", long: " Interrupt Mask" },
    { short: "IE", long: " Interrupt Enable" },
    { short: "P5.5", long: "Pending RST5.5" },
    { short: "P6.5", long: "Pending RST6.5" },
    { short: "P7.5", long: "Pending RST7.5" },
    { short: "SID", long: "Serial Input" },
];

function RimSimRegisterEditor() {
    const [mode, setMode] = createSignal("SIM"); // or "RIM"
    const [bits, setBits] = createSignal(Array(8).fill(0));
    const [textValue, setTextValue] = createSignal("0");
    const [outputMode, setOutputMode] = createSignal("hex");

    const labels = () => (mode() === "SIM" ? SIM_BIT_LABELS : RIM_BIT_LABELS);

    const getValue = () => parseInt(bits().toReversed().join(""), 2);

    const updateBitsFromValue = (value) => {
        const clamped = Math.max(0, Math.min(0xff, value));
        const binStr = clamped.toString(2).padStart(8, "0");
        setBits(
            binStr
                .split("")
                .map((b) => +b)
                .reverse(),
        );
    };

    createEffect(() => {
        const value = getValue();
        setTextValue(outputMode() === "dec" ? value.toString(10) : value.toString(16).toUpperCase());
    });

    const handleInputChange = (e) => {
        const val = e.target.value.trim();
        setTextValue(val);
        const parsed = outputMode() === "dec" ? parseInt(val, 10) : parseInt(val, 16);
        if (!isNaN(parsed)) updateBitsFromValue(parsed);
    };

    const toggleBit = (index) => {
        setBits((prev) => {
            const copy = [...prev];
            copy[index] = copy[index] ? 0 : 1;
            return copy;
        });
    };

    return (
        <div class="space-y-4">
            <h2 class="text-lg mb-2 flex items-center gap-2">
                {mode()} <FaSolidArrowRightArrowLeft class="text-secondary-foreground text-sm" />
                {outputMode() === "dec" ? "Decimal" : "Hex"}
            </h2>
            <div class="flex items-center gap-4">
                <label class="text-sm font-medium">Mode:</label>
                <select
                    class="p-2 rounded-md bg-secondary-background text-primary-foreground text-sm border"
                    value={mode()}
                    onInput={(e) => setMode(e.target.value)}
                >
                    <option value="SIM">SIM</option>
                    <option value="RIM">RIM</option>
                </select>
            </div>

            <div class="flex items-center flex-row-reverse gap-2 justify-center text-center">
                {bits().map((bit, i) => (
                    <div>
                        <input
                            type="text"
                            value={bit}
                            readonly
                            class="text-sm w-4 p-1 bg-transparent outline-none placeholder:text-inactive-foreground border-b border-b-gray-300 cursor-pointer"
                            onClick={() => toggleBit(i)}
                            title={`${labels()[i].short} (${labels()[i].long})`}
                        />
                        <div class="mt-1 text-[11px] text-secondary-foreground" title={labels()[i].long}>
                            {labels()[i].short}
                        </div>
                    </div>
                ))}
            </div>

            <div class="flex items-end gap-2 border-b pb-2">
                <input
                    type="text"
                    class="w-full bg-transparent outline-none font-mono"
                    value={textValue()}
                    onInput={handleInputChange}
                    placeholder={outputMode() === "dec" ? "Decimal" : "Hex"}
                />
                <select
                    class="p-1 rounded-md bg-secondary-background text-secondary-foreground text-sm"
                    value={outputMode()}
                    onInput={(e) => setOutputMode(e.target.value)}
                >
                    <option value="dec">Decimal</option>
                    <option value="hex">Hex</option>
                </select>
            </div>
        </div>
    );
}
