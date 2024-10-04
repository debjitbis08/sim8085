import { createStore } from "solid-js/store";

const INITIAL_CODE =
`
;<Program title>

jmp start

;data

;code
start: nop


hlt
`

export const REGISTER_KEYS = ['bc', 'de', 'hl'];

const initialRegisterState = () => {
  return REGISTER_KEYS.reduce((o, registerId) => ({
    ...o,
    [registerId]: { high: 0, low: 0, isEditing: false }
  }), {});
};

export const [store, setStore] = createStore({
  code: INITIAL_CODE,
  programState: 'Idle', // Idle, Loaded, Running, Paused
  assembled: [],
  loadAddress: 0,
  accumulator: 0,
  isEditingAccumulator: false,
  registers: initialRegisterState(),
  stackPointer: 0,
  programCounter: 0,
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
  openFiles: [ "main.asm" ]
});
