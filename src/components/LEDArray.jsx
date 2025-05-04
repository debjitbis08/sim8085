import { For, createSignal } from "solid-js";
import { Select } from "@kobalte/core/select";
import { FaSolidCheck, FaSolidCaretDown } from "solid-icons/fa";
import { store, setStore } from "../store/store.js";

export function LEDArray() {
    const J3Pins = [
        { pin: 1, port: 1, bit: 6 },
        { pin: 2, port: 1, bit: 7 },
        { pin: 3, port: 1, bit: 4 },
        { pin: 4, port: 1, bit: 5 },
        { pin: 5, port: 1, bit: 2 },
        { pin: 6, port: 1, bit: 3 },
        { pin: 7, port: 1, bit: 0 },
        { pin: 8, port: 1, bit: 1 },
        { pin: 9, port: 0, bit: 6 },
        { pin: 10, port: 0, bit: 7 },
        { pin: 11, port: 0, bit: 4 },
        { pin: 12, port: 0, bit: 5 },
        { pin: 13, port: 0, bit: 2 },
        { pin: 14, port: 0, bit: 3 },
        { pin: 15, port: 0, bit: 0 },
        { pin: 16, port: 0, bit: 1 },
        { pin: 17, port: 9, bit: 6 },
        { pin: 18, port: 9, bit: 7 },
        { pin: 19, port: 9, bit: 4 },
        { pin: 20, port: 9, bit: 5 },
        { pin: 21, port: 9, bit: 2 },
        { pin: 22, port: 9, bit: 3 },
        { pin: 23, port: 9, bit: 0 },
        { pin: 24, port: 9, bit: 1 },
        { pin: 25, port: 8, bit: 6 },
        { pin: 26, port: 8, bit: 7 },
        { pin: 27, port: 8, bit: 4 },
        { pin: 28, port: 8, bit: 5 },
        { pin: 29, port: 8, bit: 2 },
        { pin: 30, port: 8, bit: 3 },
        { pin: 31, port: 8, bit: 0 },
        { pin: 32, port: 8, bit: 1 },
    ];

    const portGroups = [
        { label: "Port 1", pins: J3Pins.slice(0, 8) },
        { label: "Port 0", pins: J3Pins.slice(8, 16) },
        { label: "Port 9", pins: J3Pins.slice(16, 24) },
        { label: "Port 8", pins: J3Pins.slice(24, 32) },
    ];
    const [value, setValue] = createSignal("4×8");
    const getCols = () => {
        const layout = value();
        return parseInt(layout.split("×")[0]);
    };

    const [hoveredLED, setHoveredLED] = createSignal(null);
    const onLEDMouseEnter = (pin) => {
        setHoveredLED(pin);
    };
    const onLEDMouseLeave = () => {
        setHoveredLED(null);
    };
    return (
        <section class="p-4">
            <div class="flex items-center gap-2 mb-8">
                <h2 class={`md:text-xl`}>LED Array</h2>
                <div class="flex-grow"></div>
                <div class="text-sm">LED Layout: </div>
                <Select
                    value={value()}
                    onChange={setValue}
                    options={["2×16", "4×8", "8×4", "16×2"]}
                    placeholder="Select a layout…"
                    itemComponent={(props) => (
                        <Select.Item item={props.item} class="select__item text-secondary-foreground">
                            <Select.ItemLabel>{props.item.rawValue}</Select.ItemLabel>
                            <Select.ItemIndicator class="select__item-indicator">
                                <FaSolidCheck />
                            </Select.ItemIndicator>
                        </Select.Item>
                    )}
                >
                    <Select.Trigger class="select__trigger ml-auto" aria-label="Layout">
                        <Select.Value class="select__value">{(state) => state.selectedOption()}</Select.Value>
                        <Select.Icon class="select__icon">
                            <FaSolidCaretDown />
                        </Select.Icon>
                    </Select.Trigger>
                    <Select.Portal>
                        <Select.Content class="select__content">
                            <Select.Listbox class="select__listbox bg-main-background" />
                        </Select.Content>
                    </Select.Portal>
                </Select>
            </div>
            <div class="mt-4 flex items-start justify-start gap-16">
                <div>
                    <div class="text-xs text-gray-400 mb-8 font-mono flex justify-center items-center border-l border-t border-r border-gray-500">
                        <span class="-mt-2 px-2 bg-main-background">J3</span>
                    </div>
                    <For each={portGroups}>
                        {(group) => (
                            <div class="flex flex-row items-stretch gap-2 mb-2">
                                <div class="text-xs text-gray-400 mb-1 font-mono flex items-center border-l border-t border-b border-gray-500">
                                    <span class="-ml-2 bg-main-background">{group.label}</span>
                                </div>
                                <div class="grid grid-cols-2 gap-2">
                                    <For each={group.pins}>
                                        {(pin) => (
                                            <div class="w-3 h-3 rounded-full border border-slate-400 flex items-center">
                                                <div
                                                    class={`w-1.5 h-1.5 rounded-full  mx-auto ${
                                                        (store.io[pin.port] ?? 0) & (1 << pin.bit)
                                                            ? "border-blue-foreground bg-blue-foreground"
                                                            : hoveredLED() &&
                                                                hoveredLED().port === pin.port &&
                                                                hoveredLED().bit === pin.bit
                                                              ? "border-yellow-foreground bg-yellow-foreground"
                                                              : ""
                                                    }`}
                                                    title={`P${pin.port}-${pin.bit} (Pin ${pin.pin})`}
                                                ></div>
                                            </div>
                                        )}
                                    </For>
                                </div>
                            </div>
                        )}
                    </For>
                    <div class="flex flex-row items-stretch gap-2 mb-2">
                        <div class="text-xs text-gray-400 mb-1 font-mono flex items-center">
                            <span class="bg-main-background">GND&nbsp;&nbsp;</span>
                        </div>
                        <div class="grid grid-cols-2 gap-2">
                            <For each={[0, 1]}>
                                {(pin) => (
                                    <div class="w-3 h-3 rounded-full border border-slate-400 flex items-center">
                                        <div
                                            class={`w-1.5 h-1.5 rounded-full mx-auto`}
                                            title={`Pin ${33 + pin})`}
                                        ></div>
                                    </div>
                                )}
                            </For>
                        </div>
                    </div>
                    <div class="text-xs text-gray-400 mt-8 font-mono flex justify-center items-center border-l border-b border-r border-gray-500">
                        <span class="px-2 bg-main-background">&nbsp;</span>
                    </div>
                </div>
                <div>
                    <div class="text-xs text-gray-400 font-mono mb-6">LED Grid</div>
                    <div
                        class={`grid gap-3`}
                        style={{ "grid-template-columns": `repeat(${getCols()}, minmax(0, 1fr))` }}
                    >
                        <For each={J3Pins}>
                            {(pin) => <LED {...pin} onMouseEnter={onLEDMouseEnter} onMouseLeave={onLEDMouseLeave} />}
                        </For>
                    </div>
                </div>
            </div>
            <p class="mt-12 pt-6 text-xs text-inactive-foreground leading-relaxed max-w-prose border-t border-t-inactive-foreground">
                This panel shows 32 LED indicators connected to the J3 port header of a typical SDK-85 kit. Each LED
                corresponds to a bit in ports 1, 0, 9, and 8, routed via a 34-pin connector (3M 3431-4005). When a bit
                is set to 1, the corresponding LED lights up red. The adjacent port hole lights blue to reflect the
                same. Use the layout selector to view the LEDs in different configurations. See Page 3-10 in the{" "}
                <a
                    class="text-blue-foreground"
                    href="https://community.intel.com/cipcp26785/attachments/cipcp26785/processors/59602/1/9800451A.pdf"
                >
                    SDK-85 User's Manual
                </a>
                .
            </p>
            <div class="pt-6 text-xs text-inactive-foreground leading-relaxed max-w-prose flex items-start gap-4">
                <div class="font-bold">*Note:</div>
                <div>
                    <ul class="list-decimal list-inside">
                        <li>Pn-m stands for PORT n Bit m (e.g. P9-6 means PORT 9H Bit 6).</li>
                        <li>Ports 0 &amp; 1 are Ports A and B of 8355 (A 14).</li>
                        <li>Ports 8 &amp; 9 are Ports A and B of 8755 (A 15).</li>
                    </ul>
                </div>
            </div>
        </section>
    );
}

function LED(props) {
    const on = () => {
        const { port, bit } = props;
        return (store.io[port] ?? 0) & (1 << bit);
    };
    return (
        <div
            class="relative flex items-center gap-0"
            title={`P${props.port}-${props.bit} (Pin ${props.pin})`}
            onMouseEnter={() => props.onMouseEnter({ pin: props.pin, port: props.port, bit: props.bit })}
            onMouseLeave={() => props.onMouseLeave({ pin: props.pin, port: props.port, bit: props.bit })}
        >
            <div
                class={`w-0 h-0 border-l-[10px] border-b-[6px] border-t-[6px] border-b-transparent border-t-transparent ${on() ? "border-l-red-foreground" : "border-l-inactive-foreground hover:border-l-yellow-500"}`}
            ></div>
            <div class="w-0.5 h-3 bg-inactive-foreground"></div>
        </div>
    );
}
