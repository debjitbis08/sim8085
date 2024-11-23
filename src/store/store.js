import {createStore} from "solid-js/store";

export const INITIAL_CODE =
    `;<Program title>

JMP START

;data

;code
START: NOP

;Start writing your code here

HLT
`

export const REGISTER_KEYS = ['bc', 'de', 'hl'];

const initialRegisterState = () => {
    return REGISTER_KEYS.reduce((o, registerId) => ({
        ...o,
        [registerId]: {high: 0, low: 0, isEditing: false}
    }), {});
};

export const DEFAULT_SETTINGS = {
    beforeRun: {
        clearFlags: true,
        clearRegisters: true,
        clearAllMemoryLocations: false
    },
    alert: {
        afterSuccessfulRun: true,
        afterClearAll: true,
        afterDebugStop: true
    },
    editor: {
        fontSize: 16
    }
};

export const [store, setStore] = createStore({
    code: INITIAL_CODE,
    codeWithError: '',
    programState: 'Idle', // Idle, Loaded, Running, Paused
    assembled: [],
    loadAddress: 0,
    accumulator: 0,
    isEditingAccumulator: false,
    registers: initialRegisterState(),
    stackPointer: 0,
    programCounter: 0,
    pcStartValue: 0,
    statePointer: null,
    flags: {
        s: false,
        z: false,
        ac: false,
        p: false,
        c: false
    },
    memory: Array(65536).fill(0),
    io: Array(256).fill(0),
    breakpoints: [],
    errors: [],
    activeFile: {
        name: "untitled-1.asm",
        workspaceItemId: null,
        currentVersionId: null,
        content: INITIAL_CODE,
    },
    homeFolderId: null,
    settings: structuredClone(DEFAULT_SETTINGS)
});
