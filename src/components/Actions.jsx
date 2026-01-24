import { createSignal, onMount, Show } from "solid-js";
import { VsDebug, VsDebugStepOver, VsQuestion } from "solid-icons/vs";
import { HiSolidPlay, HiSolidStop, HiSolidWrench } from "solid-icons/hi";
import { produce } from "solid-js/store";
import {
    initSimulator,
    loadProgram,
    runProgram,
    runSingleInstruction,
    runProgramInSlices,
    setAllMemoryLocations,
    setFlags,
    setPC,
    setRegisters,
    startDebug,
    unloadProgram,
    halt,
    setIOWriteCallback,
    setInterruptLine,
    getInterruptState,
} from "../core/simulator.js";
import { AiOutlineClear } from "solid-icons/ai";
import { Tooltip } from "./generic/Tooltip.jsx";
import { store, setStore } from "../store/store.js";
import { Toast } from "./generic/Toast.jsx";
import { trackEvent } from "./analytics/tracker.js";
import { showToaster } from "./toaster.jsx";
import {
    FaRegularSquare,
    FaSolidAngleDown,
    FaSolidArrowUpRightFromSquare,
    FaSolidBoltLightning,
    FaSolidCheck,
    FaSolidEject,
} from "solid-icons/fa";
import { createShortcut } from "@solid-primitives/keyboard";
import { DropdownMenu } from "./generic/DropdownMenu.jsx";

export default function Actions() {
    const [isReady, setIsReady] = createSignal(false);

    onMount(async () => {
        const statePointer = await initSimulator();
        setStore("statePointer", statePointer);
        setIsReady(true);

        setIOWriteCallback((address, value) => {
            setStore(
                produce((draftStore) => {
                    draftStore.io[address] = value;
                }),
            );
        });
    });

    function beforeRun() {
        if (store.settings.beforeRun.clearRegisters) {
            clearRegisters();
        }
        if (store.settings.beforeRun.clearFlags) {
            clearFlags();
        }
        if (store.settings.beforeRun.clearAllMemoryLocations) {
            resetAllLocations();
        }
    }

    function load() {
        let result = null;

        setStore("errors", []);
        setStore("codeWithError", "");

        try {
            result = loadProgram(store);
        } catch (e) {
            if (e.name && e.message && e.location) {
                showToaster(
                    "error",
                    "Program has errors",
                    'Check the "Assembler Errors" section on the right for details.',
                );
                const message = e.message.startsWith("{") ? JSON.parse(e.message) : e.message;
                if (typeof message === "string") {
                    setStore("errors", [
                        {
                            name: e.name,
                            msg: message,
                            hint: e.hint || [],
                            type: "",
                            location: e.location,
                            line: e.location.start.line,
                            column: e.location.start.column,
                        },
                    ]);
                } else {
                    setStore("errors", [
                        {
                            name: e.name,
                            msg: message.message,
                            hint: message.hint || [],
                            type: message.type || "",
                            location: e.location,
                            line: e.location.start.line,
                            column: e.location.start.column,
                        },
                    ]);
                }
                setStore("assembled", []);
                setStore("codeWithError", store.activeFile.content);
                trackEvent("assemble failed", {
                    code: store.activeFile.content,
                    name: e.name,
                    msg: e.message,
                    line: e.location.start.line,
                    column: e.location.start.column,
                });
                return;
            } else {
                setStore("assembled", []);
                trackEvent("assemble exception", {
                    code: store.activeFile.content,
                });
                showToaster(
                    "error",
                    "Assemble Failed",
                    "Assemble failed with unknown errors. Please check the syntax of your program.",
                );
                return;
            }
        }

        if (result) {
            setStore(
                produce((draftStore) => {
                    draftStore.statePointer = result.statePointer;
                    draftStore.assembled = result.assembled;
                    draftStore.errors = [];
                    draftStore.programState = "Loaded";
                    draftStore.pcStartValue = result.pcStartValue != null ? result.pcStartValue : store.pcStartValue;
                    draftStore.programCounter = result.pcStartValue != null ? result.pcStartValue : store.pcStartValue;
                    for (const line of result.assembled) {
                        draftStore.memory[line.currentAddress] = line.data;
                    }
                }),
            );
        }
    }

    function unload() {
        if (store.programState === "Idle") return;

        unloadProgram(store);

        setStore(
            produce((draftStore) => {
                draftStore.programState = "Idle";
                for (const line of store.assembled) {
                    draftStore.memory[line.currentAddress] = 0;
                }
            }),
        );
    }

    function loadOrUnload() {
        if (store.programState === "Idle") load();
        else unload();
    }

    function updateState(outputState) {
        setStore(
            produce((draftStore) => {
                draftStore.accumulator = outputState.accumulator;
                // registers
                draftStore.registers.bc.high = outputState.registers.bc.high;
                draftStore.registers.bc.low = outputState.registers.bc.low;
                draftStore.registers.de.high = outputState.registers.de.high;
                draftStore.registers.de.low = outputState.registers.de.low;
                draftStore.registers.hl.high = outputState.registers.hl.high;
                draftStore.registers.hl.low = outputState.registers.hl.low;
                // flags
                draftStore.flags.z = outputState.flags.z;
                draftStore.flags.s = outputState.flags.s;
                draftStore.flags.p = outputState.flags.p;
                draftStore.flags.c = outputState.flags.c;
                draftStore.flags.ac = outputState.flags.ac;
                draftStore.stackPointer = outputState.stackPointer;
                draftStore.programCounter = outputState.programCounter;
                draftStore.statePointer = outputState.statePointer;
                draftStore.interruptsEnabled = outputState.interruptsEnabled;
                draftStore.interruptMasks = outputState.interruptMasks;
                draftStore.pendingInterrupts = outputState.pendingInterrupts;
                draftStore.memory = outputState.memory;
                draftStore.io = outputState.io;
            }),
        );
    }

    const createMetricsBaseline = () => ({
        memory: store.memory.slice(),
    });

    const calculateMemoryUsed = (before, after) => {
        let changed = 0;
        for (let i = 0; i < before.length; i++) {
            if (before[i] !== after[i]) changed++;
        }
        return changed;
    };

    const getProgramMetrics = (assembled) => {
        const programAddresses = new Set();
        let programSizeBytes = 0;

        for (const line of assembled) {
            programAddresses.add(line.currentAddress);
            if (line.kind === "code") {
                programSizeBytes += 1;
            }
        }

        return { programAddresses, programSizeBytes };
    };

    const calculateInputSizeBytes = (memory, programAddresses) => {
        let inputSize = 0;
        for (let i = 0; i < memory.length; i++) {
            if (!programAddresses.has(i) && memory[i] !== 0) inputSize++;
        }
        return inputSize;
    };

    const calculateMemoryUsedOutsideProgram = (before, after, programAddresses) => {
        let changed = 0;
        for (let i = 0; i < before.length; i++) {
            if (!programAddresses.has(i) && before[i] !== after[i]) changed++;
        }
        return changed;
    };

    const getRegistersUsedFromAssembled = (assembled) => {
        const used = new Set();
        const registerCodes = ["B", "C", "D", "E", "H", "L", "M", "A"];

        const addRegister = (reg) => {
            if (reg === "M") {
                used.add("H");
                used.add("L");
                return;
            }
            if (reg) used.add(reg);
        };

        const addRegisterPair = (pair) => {
            if (pair === "B") {
                used.add("B");
                used.add("C");
            } else if (pair === "D") {
                used.add("D");
                used.add("E");
            } else if (pair === "H") {
                used.add("H");
                used.add("L");
            } else if (pair === "SP") {
                used.add("SP");
            } else if (pair === "PSW") {
                used.add("A");
                used.add("SP");
            }
        };

        const addStackUsage = () => {
            used.add("SP");
        };

        const addA = () => addRegister("A");

        for (const line of assembled) {
            if (line.kind !== "code") continue;
            const opcode = line.data;

            if (opcode >= 0x40 && opcode <= 0x7f && opcode !== 0x76) {
                addRegister(registerCodes[(opcode >> 3) & 0x7]);
                addRegister(registerCodes[opcode & 0x7]);
                continue;
            }

            if ((opcode & 0xc7) === 0x06) {
                addRegister(registerCodes[(opcode >> 3) & 0x7]);
                continue;
            }

            if ((opcode & 0xc7) === 0x04 || (opcode & 0xc7) === 0x05) {
                addRegister(registerCodes[(opcode >> 3) & 0x7]);
                continue;
            }

            if ((opcode & 0xcf) === 0x01) {
                const rp = (opcode >> 4) & 0x3;
                addRegisterPair(rp === 0 ? "B" : rp === 1 ? "D" : rp === 2 ? "H" : "SP");
                continue;
            }

            if ((opcode & 0xcf) === 0x03 || (opcode & 0xcf) === 0x0b) {
                const rp = (opcode >> 4) & 0x3;
                addRegisterPair(rp === 0 ? "B" : rp === 1 ? "D" : rp === 2 ? "H" : "SP");
                continue;
            }

            if ((opcode & 0xcf) === 0x09) {
                const rp = (opcode >> 4) & 0x3;
                addRegisterPair("H");
                addRegisterPair(rp === 0 ? "B" : rp === 1 ? "D" : rp === 2 ? "H" : "SP");
                continue;
            }

            if (opcode === 0x0a || opcode === 0x02) {
                addRegisterPair("B");
                addA();
                continue;
            }

            if (opcode === 0x1a || opcode === 0x12) {
                addRegisterPair("D");
                addA();
                continue;
            }

            if (opcode === 0x3a || opcode === 0x32) {
                addA();
                continue;
            }

            if (opcode === 0x2a || opcode === 0x22) {
                addRegisterPair("H");
                continue;
            }

            if (opcode === 0xeb) {
                addRegisterPair("D");
                addRegisterPair("H");
                continue;
            }

            if (opcode === 0xe3) {
                addRegisterPair("H");
                used.add("SP");
                continue;
            }

            if (opcode === 0xf9) {
                used.add("SP");
                addRegisterPair("H");
                continue;
            }

            if (opcode === 0xe9) {
                addRegisterPair("H");
                continue;
            }

            if (opcode === 0xdb || opcode === 0xd3) {
                addA();
                continue;
            }

            if ((opcode & 0xcf) === 0xc5) {
                const rp = (opcode >> 4) & 0x3;
                addRegisterPair(rp === 0 ? "B" : rp === 1 ? "D" : rp === 2 ? "H" : "PSW");
                addStackUsage();
                continue;
            }

            if ((opcode & 0xcf) === 0xc1) {
                const rp = (opcode >> 4) & 0x3;
                addRegisterPair(rp === 0 ? "B" : rp === 1 ? "D" : rp === 2 ? "H" : "PSW");
                addStackUsage();
                continue;
            }

            if (opcode >= 0x80 && opcode <= 0xbf) {
                addA();
                addRegister(registerCodes[opcode & 0x7]);
                continue;
            }

            if (
                opcode === 0xc6 ||
                opcode === 0xce ||
                opcode === 0xd6 ||
                opcode === 0xde ||
                opcode === 0xe6 ||
                opcode === 0xee ||
                opcode === 0xf6 ||
                opcode === 0xfe
            ) {
                addA();
                continue;
            }

            if (
                opcode === 0x07 ||
                opcode === 0x0f ||
                opcode === 0x17 ||
                opcode === 0x1f ||
                opcode === 0x2f ||
                opcode === 0x27
            ) {
                addA();
                continue;
            }

            if (
                opcode === 0xcd ||
                opcode === 0xc4 ||
                opcode === 0xcc ||
                opcode === 0xd4 ||
                opcode === 0xdc ||
                opcode === 0xe4 ||
                opcode === 0xec ||
                opcode === 0xf4 ||
                opcode === 0xfc ||
                opcode === 0xc9 ||
                opcode === 0xc0 ||
                opcode === 0xc8 ||
                opcode === 0xd0 ||
                opcode === 0xd8 ||
                opcode === 0xe0 ||
                opcode === 0xe8 ||
                opcode === 0xf0 ||
                opcode === 0xf8
            ) {
                addStackUsage();
                continue;
            }

            if (
                opcode === 0xc7 ||
                opcode === 0xcf ||
                opcode === 0xd7 ||
                opcode === 0xdf ||
                opcode === 0xe7 ||
                opcode === 0xef ||
                opcode === 0xf7 ||
                opcode === 0xff
            ) {
                addStackUsage();
                continue;
            }
        }

        return Array.from(used).sort();
    };

    const updatePerformanceMetrics = (outputState, baseline) => {
        const { programAddresses, programSizeBytes } = getProgramMetrics(store.assembled);
        const inputSizeBytes = calculateInputSizeBytes(baseline.memory, programAddresses);
        const memoryChangedBytes = calculateMemoryUsed(baseline.memory, outputState.memory);
        const memoryChangedOutsideProgramBytes = calculateMemoryUsedOutsideProgram(
            baseline.memory,
            outputState.memory,
            programAddresses,
        );
        const registersUsed = getRegistersUsedFromAssembled(store.assembled);
        const totalTstates = outputState.metrics?.totalTstates ?? null;
        const maxStackBytes = outputState.metrics?.maxStackBytes ?? null;

        setStore("metrics", "performance", {
            totalTstates,
            maxStackBytes,
            programSizeBytes,
            inputSizeBytes,
            memoryChangedBytes,
            memoryChangedOutsideProgramBytes,
            registersUsed,
        });
    };

    const resetPerformanceMetrics = () => {
        setStore("metrics", "performance", {
            totalTstates: null,
            maxStackBytes: null,
            programSizeBytes: 0,
            inputSizeBytes: 0,
            memoryChangedBytes: null,
            memoryChangedOutsideProgramBytes: null,
            registersUsed: [],
        });
    };

    function run() {
        let outputState;
        let errorStatus = 0;
        const metricsBaseline = createMetricsBaseline();
        try {
            setStore("programState", "Running");
            outputState = runProgram(store);
            if (store.settings.alert.afterSuccessfulRun) {
                showToaster("success", "Program ran successfully", "Please check the left panel for updated state.");
            }
        } catch (e) {
            if (e.status === 1)
                showToaster("error", "Program existed with error", "Unknown instruction encountered in the program.");
            else if (e.status === 2) {
                showToaster(
                    "error",
                    "Program existed with error",
                    <InfiniteLoopError code={store.activeFile.content} />,
                );
            } else showToaster("error", "Program existed with error", "We could not identify the error.");
            errorStatus = e.status;
            trackEvent("run failed", {
                code: store.activeFile.content,
                status:
                    e.status === 1
                        ? "UNKNONWN_INSTRUCTION_ERROR"
                        : e.status === 2
                          ? "INFINITE_LOOP"
                          : "UNKNOWN_RUNTIME_ERROR",
            });
            console.error(e);
        } finally {
            setStore("programState", "Idle");
        }
        if (errorStatus === 0) {
            updateState(outputState);
            updatePerformanceMetrics(outputState, metricsBaseline);
        } else {
            // TODO Set errors in store
        }
    }

    function runInSlice() {
        let errorStatus = 0;
        const metricsBaseline = createMetricsBaseline();
        try {
            setStore("programState", "Running");
            runProgramInSlices(store, (isDone, outputState) => {
                if (isDone && store.settings.alert.afterSuccessfulRun) {
                    showToaster(
                        "success",
                        "Program ran successfully",
                        "Please check the left panel for updated state.",
                    );
                    setStore("programState", "Idle");
                }
                updateState(outputState);
                if (isDone) {
                    updatePerformanceMetrics(outputState, metricsBaseline);
                }
            });
        } catch (e) {
            if (e.status === 1)
                showToaster("error", "Program existed with error", "Unknown instruction encountered in the program.");
            else if (e.status === 2) {
                showToaster(
                    "error",
                    "Program existed with error",
                    <InfiniteLoopError code={store.activeFile.content} />,
                );
            } else showToaster("error", "Program existed with error", "We could not identify the error.");
            errorStatus = e.status;
            trackEvent("run failed", {
                code: store.activeFile.content,
                status:
                    e.status === 1
                        ? "UNKNONWN_INSTRUCTION_ERROR"
                        : e.status === 2
                          ? "INFINITE_LOOP"
                          : "UNKNOWN_RUNTIME_ERROR",
            });
            console.error(e);
        }
    }

    async function loadAndRun() {
        beforeRun();
        load();
        if (store.errors.length === 0) {
            setStore("pc", store.pcStartValue);
            if (store.settings.run.enableTiming) {
                runInSlice();
            } else {
                run();
            }
        }
    }

    function runOne() {
        let outputState;
        let errorStatus = 0;
        let status = null;

        if (store.programState === "Idle") {
            beforeRun();
            load();
        }

        try {
            if (store.programState === "Loaded") {
                // const pc = store.assembled.length ? store.assembled[0].currentAddress : 0;
                const pc = store.pcStartValue;
                setStore(
                    produce((draftStore) => {
                        draftStore.programState = "Paused";
                        draftStore.programCounter = pc;
                    }),
                );
                setPC(store, pc);
                startDebug(store);
            } else {
                setStore("programState", "Running");
                [status, outputState] = runSingleInstruction(store);
                console.log(`program counter after runOne: ${outputState.programCounter}`);

                if (errorStatus > 0) {
                    setStore("programState", "Loaded");
                    if (errorStatus === 1)
                        showToaster(
                            "error",
                            "Program existed with error",
                            "Unknown instruction encountered in the program.",
                        );
                    else if (errorStatus === 2) {
                        showToaster(
                            "error",
                            "Program existed with error",
                            <InfiniteLoopError code={store.activeFile.content} />,
                        );
                    } else showToaster("error", "Program existed with error", "We could not identify the error.");
                    trackEvent("run failed", {
                        code: store.activeFile.content,
                        status:
                            e.status === 1
                                ? "UNKNONWN_INSTRUCTION_ERROR"
                                : e.status === 2
                                  ? "INFINITE_LOOP"
                                  : "UNKNOWN_RUNTIME_ERROR",
                    });
                } else if (status > 0) {
                    updateState(outputState);
                    setStore("programState", "Idle");
                } else {
                    updateState(outputState);
                    setStore("programState", "Paused");
                }
            }
        } catch (e) {
            errorStatus = e.status;
            console.error(e);
        }
    }

    const clearFlags = () => {
        setStore(
            "flags",
            produce((flags) => {
                Object.keys(flags).forEach((flagId) => (flags[flagId] = false));
            }),
        );
        setFlags(store);
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

    const resetAllLocations = () => {
        setStore("memory", (memory) => memory.map(() => 0));
        setAllMemoryLocations(store);
        setStore("programState", (programState) => (programState === "Loaded" ? "Idle" : programState));
    };

    const clearAllDataOrStop = () => {
        if (store.programState === "Paused") {
            setStore("programState", "Loaded");
            if (store.settings.alert.afterDebugStop) {
                showToaster("info", "Stopped Debugging", "You may clear data to start editing again.");
            }
            return;
        }

        if (store.programState === "Running") {
            halt(store);
            setStore("programState", "Loaded");
            return;
        }

        clearFlags();
        clearRegisters();
        resetAllLocations();
        setStore("assembled", []);
        resetPerformanceMetrics();
        if (store.settings.alert.afterClearAll) {
            showToaster("info", "Cleared all data", "Registers, Flags & all Memory locations have been cleared.");
        }
    };

    const handleInterrupt = (name, active = true) => {
        const isInterruptEnabled = setInterruptLine(name, active ? 1 : 0);

        const outputState = getInterruptState(store);
        setStore(
            produce((draftStore) => {
                draftStore.interruptsEnabled = outputState.interruptsEnabled;
                draftStore.interruptMasks = outputState.interruptMasks;
                draftStore.pendingInterrupts = outputState.pendingInterrupts;
            }),
        );

        const shouldResume = store.programState === "Idle" && (name === "trap" || isInterruptEnabled);

        if (shouldResume) {
            run();
        }
    };

    const setPCStartValue = (value) => {
        setStore("pcStartValue", parseInt(value || "0", 16) % 65536);
    };

    // Load and Run
    createShortcut(["Control", "F5"], loadAndRun);

    // Start Debug
    createShortcut(["Alt", "F5"], () => {
        if (store.programState === "Idle" || store.programState === "Loaded") runOne();
    });

    // Step Over
    createShortcut(["F10"], () => {
        if (store.programState === "Paused") runOne();
    });

    // Stop Debug
    createShortcut(["Shift", "F5"], () => {
        if (store.programState === "Paused") clearAllDataOrStop();
    });

    // Assemble and Load Program
    createShortcut(["Control", "Shift", "B"], () => {
        if (store.programState === "Idle") load();
    });

    // Unload Program
    createShortcut(["Control", "Shift", "U"], () => {
        if (store.programState !== "Idle") unload();
    });

    return (
        <div
            class="flex items-center gap-1 md:gap-2 border-l-0 border-t-0 border-b-0 rounded-sm
        max-w-sm mx-auto md:mr-0 
        md:flex-row md:w-auto
            justify-center md:justify-end
            flex-row-reverse
    "
        >
            <div
                class={`flex items-center gap-1 text-sm pl-2 rounded border border-active-border ${store.settings.run.enableTiming && store.programState === "Running" ? "hidden" : ""}`}
            >
                <div class="flex items-center gap-1 border-b-0 border-b-gray-300 min-w-0">
                    <span class="font-mono text-gray-400">0x</span>
                    <input
                        type="text"
                        class="px-1 w-12 font-mono bg-transparent outline-none placeholder:text-gray-300"
                        placeholder="Start PC Value"
                        value={store.pcStartValue.toString(16)}
                        onInput={(e) => setPCStartValue(e.target.value)}
                    />
                    <Tooltip>
                        <Tooltip.Trigger class="tooltip__trigger hidden md:block">
                            <VsQuestion />
                        </Tooltip.Trigger>
                        <Tooltip.Portal>
                            <Tooltip.Content class="tooltip__content">
                                <Tooltip.Arrow />
                                <p>
                                    Your program will start executing at this address instead of 0h. This is equivalent
                                    to the operation of GO &amp; EXEC in{" "}
                                    <a
                                        class="text-blue-foreground"
                                        target="_blank"
                                        href="https://community.intel.com/cipcp26785/attachments/cipcp26785/processors/59602/1/9800451A.pdf"
                                    >
                                        SDK-85
                                    </a>
                                    . See page 4-6 in the manual.
                                </p>
                                <p class="mt-2">
                                    This can be also manipulated using the{" "}
                                    <a class="text-blue-foreground" href="/docs/en/directives/end/">
                                        END directive
                                    </a>
                                    .
                                </p>
                                <p class="mt-2">You must specify this value if your code uses ORG directive.</p>
                            </Tooltip.Content>
                        </Tooltip.Portal>
                    </Tooltip>
                </div>
                <ActionButton
                    class="border-0 rounded-none rounded-r"
                    icon={<HiSolidPlay class="text-terminal" />}
                    title="Load &amp; Run"
                    shortcut="Ctrl + F5"
                    onClick={loadAndRun}
                    disabled={false}
                    isHidden={store.settings.run.enableTiming && store.programState === "Running"}
                />
            </div>
            <DropdownMenu>
                <DropdownMenu.Trigger class="dropdown-menu__trigger">
                    <span>
                        <FaSolidBoltLightning class="text-sm text-yellow-foreground" />
                    </span>
                    <DropdownMenu.Icon class="dropdown-menu__trigger-icon text-secondary-foreground">
                        <FaSolidAngleDown />
                    </DropdownMenu.Icon>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                    <DropdownMenu.Content class="dropdown-menu__content z-[99]">
                        <DropdownMenu.CheckboxItem
                            class="dropdown-menu__checkbox-item pl-2"
                            checked={store.pendingInterrupts.trap}
                            onChange={(value) => handleInterrupt("trap", value)}
                        >
                            <span class="flex items-center gap-2">
                                <span>{store.pendingInterrupts.trap ? <FaSolidCheck /> : <FaRegularSquare />}</span>
                                <span>TRAP</span>
                            </span>
                        </DropdownMenu.CheckboxItem>
                        <DropdownMenu.CheckboxItem
                            class="dropdown-menu__checkbox-item pl-2"
                            checked={store.pendingInterrupts.rst55}
                            onChange={(value) => handleInterrupt("rst5.5", value)}
                        >
                            <span class="flex items-center gap-2">
                                <span>{store.pendingInterrupts.rst55 ? <FaSolidCheck /> : <FaRegularSquare />}</span>
                                <span>RST 5.5</span>
                            </span>
                        </DropdownMenu.CheckboxItem>
                        <DropdownMenu.CheckboxItem
                            class="dropdown-menu__checkbox-item pl-2"
                            checked={store.pendingInterrupts.rst65}
                            onChange={(value) => handleInterrupt("rst6.5", value)}
                        >
                            <span class="flex items-center gap-2">
                                <span>{store.pendingInterrupts.rst65 ? <FaSolidCheck /> : <FaRegularSquare />}</span>
                                <span>RST 6.5</span>
                            </span>
                        </DropdownMenu.CheckboxItem>
                        <DropdownMenu.Item
                            class="dropdown-menu__item pl-8"
                            onClick={() => handleInterrupt("rst7.5", true)}
                        >
                            RST 7.5
                        </DropdownMenu.Item>
                    </DropdownMenu.Content>
                </DropdownMenu.Portal>
            </DropdownMenu>
            <ActionButton
                icon={
                    store.programState === "Idle" ? (
                        <HiSolidWrench class="text-yellow-foreground" />
                    ) : (
                        <FaSolidEject class="text-yellow-foreground" />
                    )
                }
                onClick={loadOrUnload}
                disabled={false}
                isHidden={store.settings.run.enableTiming && store.programState === "Running"}
                title={store.programState === "Idle" ? "Assemble & Load" : "Unload program from memory"}
                shortcut={store.programState === "Idle" ? "Ctrl + Shift + B" : "Ctrl + Shift + U"}
            />
            <ActionButton
                icon={
                    <>
                        <VsDebug
                            class={
                                store.programState === "Loaded" || store.programState === "Idle"
                                    ? "text-green-foreground"
                                    : "hidden"
                            }
                        />
                        <VsDebugStepOver
                            class={`${store.programState === "Paused" || store.programState === "Running" ? "text-green-foreground" : "hidden"}`}
                        />
                    </>
                }
                onClick={runOne}
                disabled={false}
                isHidden={store.settings.run.enableTiming && store.programState === "Running"}
                title={
                    store.programState === "Loaded"
                        ? "Step Through"
                        : store.programState === "Paused"
                          ? "Execute One Instruction"
                          : "Load & Debug"
                }
                shortcut={
                    store.programState === "Loaded" ? "Alt + F5" : store.programState === "Paused" ? "F10" : "Alt + F5"
                }
            />
            <ActionButton
                icon={
                    store.programState === "Paused" || store.programState === "Running" ? (
                        <>
                            <HiSolidStop class="text-red-foreground" />
                            {store.programState === "Running" ? (
                                <span class="text-gray-300">Stop Execution</span>
                            ) : null}
                        </>
                    ) : (
                        <AiOutlineClear class="text-red-foreground" />
                    )
                }
                title={
                    store.programState === "Paused"
                        ? "Stop Debugging"
                        : store.programState === "Running"
                          ? "Stop Execution"
                          : "Clear All Data"
                }
                shortcut={store.programState === "Paused" ? "Shift + F5" : ""}
                onClick={clearAllDataOrStop}
                disabled={false}
                isHidden={false}
            />
            <Portal>
                <Toast.Region>
                    <Toast.List class="toast__list" />
                </Toast.Region>
            </Portal>
        </div>
    );
}

function ActionButton(props) {
    return (
        <Tooltip>
            <Tooltip.Trigger
                class={`${props.isHidden ? "hidden" : ""} tooltip__trigger rounded hover:bg-active-background border border-transparent hover:border-active-border cursor-pointer ${props.class}`}
                onClick={props.onClick}
                disabled={props.disabled || props.isHidden}
            >
                <div class="px-2 py-2 flex items-center gap-2 text-gray-600 text-lg md:text-base">{props.icon}</div>
            </Tooltip.Trigger>
            <Tooltip.Portal>
                <Tooltip.Content class="tooltip__content">
                    <Tooltip.Arrow />
                    <div class="flex items-center gap-2">
                        <p>{props.title}</p>
                        {props.shortcut ? (
                            <span class="text-xs bg-secondary-background py-1 px-2 rounded-sm">{props.shortcut}</span>
                        ) : null}
                    </div>
                </Tooltip.Content>
            </Tooltip.Portal>
        </Tooltip>
    );
}

function InfiniteLoopError(props) {
    return (
        <>
            <p>Infinite loop detected</p>
            {!props.code.match(/\s+HLT(\s+|$)/i) ? (
                <p class="mt-2">Did you forget to add HLT?</p>
            ) : props.code.match(/(^|\s+)ORG(\s+|$)/i) ? (
                <>
                    <p class="mt-2">
                        Using <span class="text-editor-directive">ORG</span> may cause the program to load at a
                        different address.
                    </p>
                    <div class="mt-2">
                        Enter the address where your program begins execution in the text box near the
                        <span class="inline text-terminal no-wrap">
                            <svg
                                class="inline"
                                fill="none"
                                stroke-width="0"
                                xmlns="http://www.w3.org/2000/svg"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                style="overflow: visible; color: currentcolor;"
                                height="1em"
                                width="1em"
                            >
                                <path
                                    fill="currentColor"
                                    fill-rule="evenodd"
                                    d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653Z"
                                    clip-rule="evenodd"
                                ></path>
                            </svg>
                            <span class="text-terminal">Run</span>
                        </span>{" "}
                        button.
                    </div>
                </>
            ) : (
                <p>Please check your program for logic errors.</p>
            )}
            <p class="mt-2">
                If you are trying to write a program with explicit infinite loop, enable the Simulate Instruction Timing
                option in Settings.
            </p>
            <div class="mt-2">
                <a
                    href="/docs/en/infinite-loop-reasons/"
                    target="_blank"
                    class="flex items-center gap-2 text-blue-foreground"
                >
                    <span>Read docs</span>
                    <span class="text-sm">
                        <FaSolidArrowUpRightFromSquare />
                    </span>
                </a>
            </div>
        </>
    );
}
