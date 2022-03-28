import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { setRegisterUseCase } from "../application/set-registers";
import { setFlagUseCase } from "../application/set-flag";
import { Cpu, create as createCpu, Register, Flag } from "../domain/cpu";
import { Memory, create as createMemory } from "../domain/memory";

export interface MachineState {
    cpu: Cpu;
    memory: Memory;
}

const initialState: MachineState = {
  cpu: createCpu(),
  memory: createMemory()
};

export const machineSlice = createSlice({
  name: "machine",
  initialState,
  reducers: {
    setRegister: (state, action: PayloadAction<{ register: Register, value: number }>) => {
      state.cpu = setRegisterUseCase({ cpu: state.cpu, register: action.payload.register, value: action.payload.value });
    },
    setFlag: (state, action: PayloadAction<{ flag: Flag, value: boolean }>) => {
      state.cpu = setFlagUseCase({ cpu: state.cpu, flag: action.payload.flag, value: action.payload.value });
    },
  },
});

export const { setRegister, setFlag } = machineSlice.actions;

export default machineSlice.reducer;
