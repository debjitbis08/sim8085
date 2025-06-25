import { createStore } from "solid-js/store";

export const INITIAL_CODE = `;<Program title>

JMP START

;data

;code
START: NOP

;Start writing your code here

HLT
`;

export const REGISTER_KEYS = ["bc", "de", "hl"];

const initialRegisterState = () => {
    return REGISTER_KEYS.reduce(
        (o, registerId) => ({
            ...o,
            [registerId]: { high: 0, low: 0, isEditing: false },
        }),
        {},
    );
};

function getInitialActiveFile() {
    if (typeof window === "undefined") {
        return {
            name: "untitled-1.asm",
            workspaceItemId: null,
            currentVersionId: null,
            content: INITIAL_CODE,
            unsavedChanges: false,
        };
    }

    const savedFileStr = localStorage.getItem("activeFile");
    if (savedFileStr) {
        try {
            const savedFile = JSON.parse(savedFileStr);
            console.log(savedFile);
            return {
                name: savedFile.name ?? "untitled-1.asm",
                workspaceItemId: savedFile.workspaceItemId ?? null,
                currentVersionId: savedFile.currentVersionId ?? null,
                content: savedFile.content ?? INITIAL_CODE,
                unsavedChanges: savedFile.unsavedChanges ?? false,
            };
        } catch (_) {
            // Fall through to create default file
        }
    }

    const mainAsmCode = typeof window !== "undefined" && localStorage.getItem("main.asm");

    const file = {
        name: "untitled-1.asm",
        workspaceItemId: null,
        currentVersionId: null,
        content: mainAsmCode || INITIAL_CODE,
        unsavedChanges: false,
    };

    if (typeof window !== "undefined") {
        localStorage.setItem("activeFile", JSON.stringify(file));
        if (mainAsmCode) localStorage.removeItem("main.asm");
    }

    return file;
}

export const DEFAULT_SETTINGS = {
    run: {
        enableTiming: false,
        clockFrequency: "3072000",
    },
    beforeRun: {
        clearFlags: true,
        clearRegisters: true,
        clearAllMemoryLocations: false,
    },
    alert: {
        afterSuccessfulRun: true,
        afterClearAll: true,
        afterDebugStop: true,
    },
    editor: {
        fontSize: 16,
    },
};

export const [store, setStore] = createStore({
    code: INITIAL_CODE,
    codeWithError: "",
    programState: "Idle", // Idle, Loaded, Running, Paused
    assembled: [],
    loadAddress: 0,
    accumulator: 0,
    isEditingAccumulator: false,
    registers: initialRegisterState(),
    stackPointer: 0xffff,
    programCounter: 0,
    pcStartValue: 0,
    statePointer: null,
    flags: {
        s: false,
        z: false,
        ac: false,
        p: false,
        c: false,
    },
    memory: Array(65536).fill(0),
    io: Array(256).fill(0),
    interruptsEnabled: false,
    interruptMasks: {
        rst55: false,
        rst65: false,
        rst75: false,
    },
    pendingInterrupts: {
        trap: false,
        rst55: false,
        rst65: false,
        rst75: false,
    },
    breakpoints: [],
    errors: [],
    activeFile: getInitialActiveFile(),
    homeFolderId: null,
    settings: structuredClone(DEFAULT_SETTINGS),
});
