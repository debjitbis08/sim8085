import { AiOutlineClear, AiOutlineEdit, AiOutlineSave } from "solid-icons/ai";
import { createSignal, createEffect } from "solid-js";
import { Tooltip } from "@kobalte/core/tooltip";
import { produce } from "solid-js/store";
import { toByteString } from "../utils/NumberFormat";
import { store, setStore } from "../store/store";
import { setRegisters } from "../core/simulator";

export function Registers() {
    const updateRegisterValue = (registerId, high, low) => {
        setStore(
            "registers",
            registerId,
            produce((register) => {
                register.high = high;
                register.low = low;
            }),
        );
        setRegisters(store);
    };

    const updateAccumulator = (value) => {
        setStore("accumulator", value);
        setRegisters(store);
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
        setRegisters(store);
    };

    return (
        <div>
            <div class="flex border-b border-b-inactive-border px-1">
                <h2 class="text-xl grow pb-1">Registers</h2>
                <button title="Clear Registers" class="text-red-foreground" onClick={clearRegisters}>
                    <AiOutlineClear />
                </button>
            </div>
            <div>
                <Register
                    name="A/PSW"
                    nameTooltip="Accumulator Or Program Status Word"
                    high={store.accumulator}
                    low={getPSW(store.flags)}
                    canEditHigh={true}
                    canEditLow={false}
                    onSave={updateAccumulator}
                />
                {Object.keys(store.registers).map((registerId) => (
                    <Register
                        name={registerId.toUpperCase()}
                        high={store.registers[registerId].high}
                        low={store.registers[registerId].low}
                        canEditHigh={true}
                        canEditLow={true}
                        onSave={(high, low) => updateRegisterValue(registerId, high, low)}
                    />
                ))}
                <Register
                    name="SP"
                    nameTooltip="Stack Pointer"
                    high={(store.stackPointer >> 8) & 0xff}
                    low={store.stackPointer & 0xff}
                    canEditLow={false}
                    canEditHigh={false}
                    onSave={() => {}}
                />
                <Register
                    name="PC"
                    nameTooltip="Program Counter"
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
        <div class="flex items-center gap-1 my-2 p-1 hover:bg-active-background">
            {props.nameTooltip ? (
                <Tooltip placement="top">
                    <Tooltip.Trigger class="tooltip__trigger grow text-left">
                        <span class="font-bold">{props.name}</span>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                        <Tooltip.Content class="tooltip__content">
                            <Tooltip.Arrow />
                            <p>{props.nameTooltip}</p>
                        </Tooltip.Content>
                    </Tooltip.Portal>
                </Tooltip>
            ) : (
                <span class="font-bold grow">{props.name}</span>
            )}
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
                <span class="font-mono cursor-pointer" onDblClick={() => startEditing(() => highRef)}>
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
                <span class="font-mono cursor-pointer" onDblClick={() => startEditing(() => lowRef)}>
                    {toByteString(props.low)}
                </span>
            )}
            {props.canEditHigh || props.canEditLow ? (
                <button type="button" onClick={() => (editing() ? saveValue() : startEditing())}>
                    {editing() ? <AiOutlineSave /> : <AiOutlineEdit />}
                </button>
            ) : (
                <span class="opacity-0 pointer-events-none">
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
