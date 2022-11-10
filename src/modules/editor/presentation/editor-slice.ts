import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ProgramState } from "../domain/program-state";
import { DEFAULT_CODE } from "./default-code";
import * as Assembler from "../domain/assembler";
import * as either from "fp-ts/Either";
import { word } from "modules/common/domain/word";

export interface EditorSlice {
    code: string;
    assembled: Assembler.Assembled[];
    assembleError: Assembler.AssemblerError | null;
    loadAddr: number;
    programState: ProgramState;
}

const initialState = {
    code: DEFAULT_CODE,
    assembled: [],
    assembleError: null,
    loadAddr: 0x0800,
    programState: ProgramState.Idle,
};

export const editorSlice = createSlice({
    name: "machine",
    initialState,
    reducers: {
        updateCode: (state, action: PayloadAction<string>) => {
            state.code = action.payload;
        },
        updateLoadAddr: (state, action: PayloadAction<word>) => {
            state.loadAddr = action.payload;
        },
        assemble: (state) => {
            either.fold(
                (error: Assembler.AssemblerError) => {
                    state.assembleError = error;
                },
                (assembledCode: Assembled[]) => {
                    state.assembled = assembledCode;
                }
            )(Assembler.assemble(state.code, state.loadAddr));
        },
    },
});


export const { assemble, updateCode, updateLoadAddr } = editorSlice.actions;

export default editorSlice.reducer;
