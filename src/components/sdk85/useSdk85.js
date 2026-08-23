import { createSignal, onCleanup } from "solid-js";
import {
    assembleProgram,
    attachSDK85,
    detachSDK85,
    getRegisters,
    initSimulator,
    loadProgram,
    readMemory,
    resetProcessor,
    runMachineSlice,
    runProgramWithBudget,
    sdk85PressKey,
    setInterruptLine,
    setMemoryLocation,
    stepMachine,
} from "../../core/simulator.js";
import { DISPLAY_DIGITS, decodeDisplaySegments } from "../../core/sdk85.js";
import monitorSource from "../../core/sdk85-monitor.src?raw";

// The board runs at 3.072 MHz -- a 6.144 MHz crystal halved by the 8085 -- so
// a slice this long is one tick's worth of real time. The emulator gets
// through it far faster than that, which is what leaves room for the display
// to be redrawn and for keys to be noticed.
const CLOCK_HZ = 3_072_000;
const TICK_MS = 40;
const TICK_TSTATES = Math.floor((CLOCK_HZ * TICK_MS) / 1000);

// Enough for the monitor to clear its RAM, set up the 8279 and reach its idle
// loop, with room to spare.
const BOOT_TSTATES = 3_000_000;

// A queued key is delivered every other tick. The 8279's FIFO would hold eight
// of them and the monitor reads one per interrupt, so they could all go in at
// once -- but then a command would appear on the display fully formed, and the
// point of sending them at all is that you can watch the monitor take them one
// at a time, exactly as it would from a thumb.
const KEY_TICKS = 2;

/** The 8155's 256 bytes, all the RAM an SDK-85 has as it was shipped. */
export const RAM_START = 0x2000;
export const RAM_END = 0x20ff;
/** The monitor keeps its stack and save area at the top of that RAM. */
export const MONITOR_RAM_START = 0x20c0;

const BLANK_DIGITS = Array.from({ length: DISPLAY_DIGITS }, () => ({ segments: 0, dot: false }));

/**
 * Where a program starts.
 *
 * `END` hands its operand back as the user wrote it, so a label arrives here as
 * a name rather than an address. The assembler did place that label, though, so
 * it can be looked up: find the source line it is on and take the address of
 * the first byte assembled from that line. Anything that cannot be resolved
 * falls back to the lowest address the program occupies, which is where it
 * would start anyway.
 */
function startAddress(assembled, lines, pcStartValue) {
    const lowest = Math.min(...assembled.map((byte) => byte.currentAddress));
    const value = typeof pcStartValue === "function" ? pcStartValue() : pcStartValue;
    if (typeof value === "number") return value;
    if (typeof value === "string") {
        const name = value.toUpperCase();
        for (const line of lines ?? []) {
            const labelled = line?.labels?.some((label) => String(label.value).toUpperCase() === name);
            if (!labelled) continue;
            const byte = assembled.find((b) => b.location?.start?.line === line.location?.start?.line);
            if (byte) return byte.currentAddress;
        }
    }
    return lowest;
}

// The processor as the simulator wants it handed over: everything cleared, the
// stack where the monitor puts it, and the program counter at the reset vector.
function coldState(over) {
    return {
        accumulator: 0,
        registers: { bc: { high: 0, low: 0 }, de: { high: 0, low: 0 }, hl: { high: 0, low: 0 } },
        stackPointer: 0x20c0,
        programCounter: 0,
        flags: { z: false, s: false, p: false, c: false, ac: false, v: false, k: false },
        interruptsEnabled: false,
        interruptMasks: { rst55: false, rst65: false, rst75: false },
        pendingInterrupts: { trap: false, rst55: false, rst65: false, rst75: false },
        io: new Array(256).fill(0),
        loadAddress: 0,
        settings: { run: { enableTiming: false } },
        ...over,
    };
}

/**
 * An SDK-85, powered up and running.
 *
 * The machine keeps its own state inside the emulator and simply keeps going,
 * so nothing here holds a copy of it: this owns the timer that lets it run and
 * the signals that say what it currently shows. Everything the panels display
 * -- the digits, the registers, a window of memory -- is read back out of the
 * machine after each tick.
 *
 * Keys can be pressed one at a time, as a finger would, or queued as a
 * sequence. Either way they go into the 8279 and the monitor reads them on its
 * own interrupt, which is what makes a button in the modern interface and a
 * press on the keypad the same act.
 */
export function useSdk85() {
    const [digits, setDigits] = createSignal(BLANK_DIGITS);
    const [registers, setRegisters] = createSignal(null);
    const [status, setStatus] = createSignal("off");
    const [error, setError] = createSignal(null);
    // Bumped after every tick, so a memory view can depend on it and reread.
    const [revision, setRevision] = createSignal(0);
    // The key the board is being sent right now, for the keypad to light up.
    const [litKey, setLitKey] = createSignal(null);
    // What is left of the sequence being sent, so the interface can show it
    // arriving rather than merely claiming it did.
    const [queued, setQueued] = createSignal([]);

    let machine = null;
    // The monitor's ROM as assembled, kept so powering on can burn it again.
    let image = null;
    let timer = null;
    let keys = [];
    let ticksToNextKey = 0;

    const sample = () => {
        setDigits(status() === "off" ? BLANK_DIGITS : decodeDisplaySegments(machine));
        setRegisters(getRegisters(machine));
        setRevision((n) => n + 1);
    };

    const deliverKey = () => {
        if (keys.length === 0) return;
        if (ticksToNextKey > 0) {
            ticksToNextKey -= 1;
            return;
        }
        const code = keys.shift();
        sdk85PressKey(machine, code);
        setQueued([...keys]);
        setLitKey(code);
        setTimeout(() => setLitKey(null), TICK_MS * KEY_TICKS);
        ticksToNextKey = KEY_TICKS;
    };

    const tick = () => {
        try {
            deliverKey();
            const { halted } = runMachineSlice(machine, TICK_TSTATES);
            sample();
            if (halted) {
                stop();
                setStatus("halted");
            }
        } catch (e) {
            stop();
            setError(e.message ?? String(e));
            setStatus("failed");
        }
    };

    const stop = () => {
        if (!timer) return;
        clearInterval(timer);
        timer = null;
    };

    const run = () => {
        if (!machine || timer || status() === "off" || status() === "failed") return;
        setStatus("running");
        timer = setInterval(tick, TICK_MS);
    };

    const pause = () => {
        if (status() !== "running") return;
        stop();
        setStatus("paused");
        sample();
    };

    const stepInstruction = () => {
        if (!machine || status() === "off" || status() === "failed") return;
        stop();
        const { halted } = stepMachine(machine);
        sample();
        setStatus(halted ? "halted" : "paused");
    };

    /**
     * The RESET key: the processor starts again at 0000H and the peripherals
     * are reset with it, but RAM keeps whatever is in it. A program keyed in or
     * loaded is still there afterwards.
     */
    const reset = () => {
        if (!machine || status() === "off") return;
        stop();
        keys = [];
        setQueued([]);
        setStatus("booting");
        // RESET OUT goes to the 8279 and the 8155 as well as to the processor;
        // reattaching the board is how they are put back to their reset state.
        detachSDK85(machine);
        attachSDK85(machine);
        resetProcessor(machine);
        runMachineSlice(machine, BOOT_TSTATES);
        sample();
        run();
    };

    /** Power on: the ROM is as burned, and RAM comes up empty. */
    const powerOn = () => {
        if (!machine || status() !== "off") return;
        keys = [];
        setQueued([]);
        setStatus("booting");
        attachSDK85(machine);
        runProgramWithBudget(coldState({ ...machine, memory: image }), { maxTstates: BOOT_TSTATES });
        sample();
        run();
    };

    /** Power off: the board stops where it is, the display goes dark, RAM is lost. */
    const powerOff = () => {
        if (!machine || status() === "off") return;
        stop();
        keys = [];
        setQueued([]);
        // Unplugging the board clears the 8279 with everything else, so a key
        // queued on it cannot survive to be read after the next power up.
        detachSDK85(machine);
        setStatus("off");
        setDigits(BLANK_DIGITS);
        setRegisters(getRegisters(machine));
        setRevision((n) => n + 1);
    };

    /** One key, as a finger would press it. */
    const pressKey = (code) => {
        if (!machine || status() !== "running") return;
        sdk85PressKey(machine, code);
        setLitKey(code);
        setTimeout(() => setLitKey(null), 120);
    };

    /**
     * A whole command, queued a key at a time. This is what the modern controls
     * do: the monitor sees the same keys in the same order and runs its own
     * command routine, so the display goes through the same states.
     */
    const sendKeys = (codes) => {
        if (!machine || status() !== "running") return false;
        keys = keys.concat(codes);
        setQueued([...keys]);
        ticksToNextKey = 0;
        return true;
    };

    /** VECT INTR. RST 7.5 is latched on its edge, so a pulse is all the pin needs. */
    const interrupt = () => {
        if (!machine || status() !== "running") return;
        setInterruptLine("rst7.5", true);
        setInterruptLine("rst7.5", false);
    };

    /**
     * Assembles `source` and puts it in the board's RAM.
     *
     * This is the one thing here that does not go through the monitor: keying
     * 192 bytes in through SUBST MEM is exactly the tedium the editor exists to
     * spare you. The bytes are the same bytes.
     *
     * Bytes outside the 8155's RAM are reported rather than written: on a real
     * board they would land in ROM or in empty expansion space, and the program
     * would not be there to run.
     */
    const assembleAndLoad = (source) => {
        const { assembled, lines, pcStartValue } = assembleProgram(source);
        const addresses = assembled.map((byte) => byte.currentAddress);
        const outside = addresses.filter((address) => address < RAM_START || address > RAM_END);
        if (outside.length > 0) {
            const first = outside[0].toString(16).padStart(4, "0").toUpperCase();
            throw new Error(
                `The program reaches ${first}H, which is not RAM on an SDK-85. ` +
                    `Its RAM is 2000H to 20FFH, and the monitor keeps 20C0H upwards for itself.`,
            );
        }
        for (const byte of assembled) setMemoryLocation(machine, byte.currentAddress, byte.data & 0xff);
        sample();
        return {
            start: startAddress(assembled, lines, pcStartValue),
            first: Math.min(...addresses),
            last: Math.max(...addresses),
            size: assembled.length,
        };
    };

    const readWindow = (start, length) => (machine ? readMemory(machine, start, length) : new Uint8Array(length));

    /** Brings the emulator up and powers the board on. */
    const boot = async () => {
        try {
            const statePointer = await initSimulator();
            const loaded = loadProgram({ activeFile: { content: monitorSource }, statePointer, loadAddress: 0 });
            machine = { statePointer: loaded.statePointer };
            image = loaded.memory;
            if (!attachSDK85(machine)) throw new Error("This build of the emulator has no SDK-85 in it.");
            detachSDK85(machine);
            setStatus("off");
            powerOn();
        } catch (e) {
            console.error("Failed to start the SDK-85:", e);
            setError(e.message ?? String(e));
            setStatus("failed");
        }
    };

    onCleanup(stop);

    return {
        digits,
        registers,
        status,
        error,
        revision,
        litKey,
        queued,
        boot,
        powerOn,
        powerOff,
        run,
        pause,
        stepInstruction,
        reset,
        pressKey,
        sendKeys,
        interrupt,
        assembleAndLoad,
        readMemory: readWindow,
    };
}
