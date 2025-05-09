import { AiOutlineClear, AiOutlineEdit, AiOutlineSave } from "solid-icons/ai";
import { createSignal, createEffect } from "solid-js";
import { Tooltip } from "./generic/Tooltip.jsx";
import { produce } from "solid-js/store";
import { toByteString } from "../utils/NumberFormat";
import { store, setStore, REGISTER_KEYS } from "../store/store";
import { FiHelpCircle } from "solid-icons/fi";
import { FaSolidCircleInfo } from "solid-icons/fa";
import { VsInfo } from "solid-icons/vs";

export function Registers() {
    let lazySetRegisters;

    const callSetRegisters = async () => {
        if (!lazySetRegisters) {
            const module = await import("../core/simulator");
            lazySetRegisters = module.setRegisters;
        }
        lazySetRegisters(store);
    };

    const updateRegisterValue = (registerId, high, low) => {
        setStore(
            "registers",
            registerId,
            produce((register) => {
                register.high = high;
                register.low = low;
            }),
        );
        callSetRegisters(store);
    };

    const updateAccumulator = (value) => {
        setStore("accumulator", value);
        callSetRegisters(store);
    };

    const clearRegisters = () => {
        setStore("accumulator", 0);
        setStore(
            "registers",
            produce((registers) => {
                for (const register of Object.values(registers)) {
                    register.high = 0;
                    register.low = 0;
                }
            }),
        );
        callSetRegisters(store);
    };

    return (
        <div>
            <div class="flex items-center gap-2 border-b border-b-inactive-border px-1">
                <h2 class="text-lg pb-1">Registers</h2>
                <Tooltip placement="top">
                    <Tooltip.Trigger class="tooltip__trigger text-left">
                        <span class="font-bold text-sm">
                            <VsInfo />
                        </span>
                    </Tooltip.Trigger>
                    <Tooltip.Portal class="hidden">
                        <Tooltip.Content class="tooltip__content">
                            <Tooltip.Arrow />
                            <p>Double click the row to edit the values Double click the row to edit the values.</p>
                            <p>Values of PSW, SP and PC are non-editable.</p>
                            <p>After editing press Enter to store the values.</p>
                        </Tooltip.Content>
                    </Tooltip.Portal>
                </Tooltip>
                <button title="Clear Registers" class="ml-auto text-red-foreground" onClick={clearRegisters}>
                    <AiOutlineClear />
                </button>
            </div>
            <div>
                <Register
                    name={
                        <div class="flex items-center gap-1">
                            <span>A/PSW</span>
                            <span class="text-sm">
                                <FiHelpCircle />
                            </span>
                        </div>
                    }
                    nameTooltip={
                        <>
                            <p class="mb-2 text-lg">Accumulator or Program Status Word</p>
                            <p class="mb-1">
                                The Program Status Word comprises the contents of the accumulator and the current
                                settings of the condition flags.
                            </p>
                            <p class="mb-1">
                                Since there are only 5 condition flags, the PSW is calculated by filling in bits 3, 5
                                &amp; 1. 8080 uses 0, 0 &amp; 1 for bits 3, 5 &amp; 1, whereas for 8085 these are
                                undefined. I have chosen to use the 8080 convention.
                            </p>
                            <p class="mb-1">
                                This is the reason you see 2 in the lower byte of PSW which is the flags register when
                                all the flags are reset. It cannot be edited. Please use the flags section for that
                                purpose.
                            </p>
                        </>
                    }
                    high={store.accumulator}
                    low={getPSW(store.flags)}
                    canEditHigh={true}
                    canEditLow={false}
                    onSave={updateAccumulator}
                />
                {REGISTER_KEYS.map((registerId) => (
                    <Register
                        name={registerId.toUpperCase()}
                        nameTooltip={<p>General purpose register pair {registerId.toUpperCase()}.</p>}
                        high={store.registers[registerId].high}
                        low={store.registers[registerId].low}
                        canEditHigh={true}
                        canEditLow={true}
                        onSave={(high, low) => updateRegisterValue(registerId, high, low)}
                    />
                ))}
                <Register
                    name="SP"
                    nameTooltip={<p>Stack Pointer</p>}
                    high={(store.stackPointer >> 8) & 0xff}
                    low={store.stackPointer & 0xff}
                    canEditLow={false}
                    canEditHigh={false}
                    onSave={() => {}}
                />
                <Register
                    name="PC"
                    nameTooltip={<p>Program Counter</p>}
                    high={(store.programCounter >> 8) & 0xff}
                    low={store.programCounter & 0xff}
                    canEditLow={false}
                    canEditHigh={false}
                    onSave={() => {}}
                />
            </div>
        </div>
    );
}

function Register(props) {
    const [editing, setEditing] = createSignal(false);
    const [highValue, setHighValue] = createSignal(toByteString(props.high));
    const [lowValue, setLowValue] = createSignal(toByteString(props.low));
    let highRef;
    let lowRef;

    createEffect(() => {
        if (!editing()) {
            setHighValue(toByteString(props.high));
            setLowValue(toByteString(props.low));
        }
    });

    const startEditing = (getInputRef) => {
        setEditing(true);
        setTimeout(() => {
            if (getInputRef) {
                const inputRef = getInputRef();
                if (inputRef) {
                    inputRef.focus();
                }
            } else {
                highRef.focus();
            }
        });
    };

    // Function to handle input change
    const handleInputChange = (setter) => (e) => {
        const newValue = e.target.value.toUpperCase();
        if (/^[0-9A-F]{0,2}$/.test(newValue)) {
            setter(newValue);
        }
    };

    // Function to handle saving the value
    const saveValue = () => {
        const high = parseInt(highValue(), 16);
        const low = parseInt(lowValue(), 16);
        if (!isNaN(high) && !isNaN(low)) {
            props.onSave(high, low);
        }
        setEditing(false);
    };

    let isFocused = false;

    // Handle Enter key and blur event
    const handleKeyOrBlur = (e) => {
        if (e.key === "Enter") {
            saveValue();
        } else if (e.key === "Escape") {
            setEditing(false);
        } else if (e.type === "blur") {
            isFocused = false;
            setTimeout(() => {
                if (!isFocused) saveValue();
            }, 100);
        }
    };

    return (
        <div
            class="flex items-center gap-1 my-2 p-1 hover:bg-active-background group relative"
            onDblClick={() => startEditing(() => highRef)}
        >
            <Tooltip placement="top">
                <Tooltip.Trigger class="tooltip__trigger grow text-left">
                    <span class="font-bold">{props.name}</span>
                </Tooltip.Trigger>
                <Tooltip.Portal class="hidden">
                    <Tooltip.Content class="tooltip__content">
                        <Tooltip.Arrow />
                        {typeof props.nameTooltip === "string" ? (
                            <p>
                                {props.nameTooltip}
                                {props.canEditHigh || props.canEditLow ? "Double click to edit." : ""}
                            </p>
                        ) : (
                            <>
                                {props.nameTooltip}
                                <p>{props.canEditHigh || props.canEditLow ? "Double click to edit." : ""}</p>
                            </>
                        )}
                    </Tooltip.Content>
                </Tooltip.Portal>
            </Tooltip>
            <span class="font-mono text-secondary-foreground">0x</span>
            {editing() && props.canEditHigh ? (
                <input
                    class="font-mono w-5 border-b border-b-primary-border bg-main-background"
                    value={highValue()}
                    onInput={handleInputChange(setHighValue)}
                    onKeyDown={handleKeyOrBlur}
                    onFocus={(e) => {
                        isFocused = true;
                        e.target.select();
                    }}
                    onBlur={handleKeyOrBlur}
                    maxlength="2"
                    autofocus={true}
                    ref={highRef}
                />
            ) : (
                <span
                    class={`font-mono cursor-pointer ${props.high > 0 && props.canEditHigh ? "text-yellow-foreground font-bold" : ""}`}
                    onDblClick={() => startEditing(() => highRef)}
                >
                    {toByteString(props.high)}
                </span>
            )}
            {editing() && props.canEditLow ? (
                <input
                    class="font-mono w-5 border-b border-b-primary-border bg-main-background"
                    value={lowValue()}
                    onInput={handleInputChange(setLowValue)}
                    onKeyDown={handleKeyOrBlur}
                    onBlur={handleKeyOrBlur}
                    onFocus={(e) => {
                        isFocused = true;
                        e.target.select();
                    }}
                    maxlength="2"
                    ref={lowRef}
                />
            ) : (
                <span
                    class={`font-mono cursor-pointer ${props.low > 0 && props.canEditLow ? "text-yellow-foreground font-bold" : ""}`}
                    onDblClick={() => startEditing(() => lowRef)}
                >
                    {toByteString(props.low)}
                </span>
            )}
            {props.canEditHigh || props.canEditLow ? (
                <button
                    type="button"
                    class="visible md:invisible md:group-hover:visible static md:absolute -right-5 bg-none md:bg-active-background py-2 px-1"
                    title="Edit"
                    onClick={() => (editing() ? saveValue() : startEditing())}
                >
                    {editing() ? <AiOutlineSave /> : <AiOutlineEdit />}
                </button>
            ) : (
                <span class="invisible md:hidden p-1">
                    <AiOutlineEdit />
                </span>
            )}
        </div>
    );
}

function getPSW(flags) {
    // Convert booleans to 1 (true) or 0 (false)
    return (
        ((flags.s ? 1 : 0) << 7) | // Sign flag at bit 7
        ((flags.z ? 1 : 0) << 6) | // Zero flag at bit 6
        (0 << 5) | // Bit 5 is always 0
        ((flags.ac ? 1 : 0) << 4) | // Auxiliary carry flag at bit 4
        (0 << 3) | // Bit 3 is always 0
        ((flags.p ? 1 : 0) << 2) | // Parity flag at bit 2
        (1 << 1) | // Bit 1 is always 1
        (flags.c ? 1 : 0)
    ); // Carry flag at bit 0
}
