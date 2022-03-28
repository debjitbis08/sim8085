import { configureStore, ThunkAction, Action } from '@reduxjs/toolkit';
import machineReducer from './modules/machine/presentation/machine-slice';
import editorReducer from './modules/editor/presentation/editor-slice';

export const store = configureStore({
  reducer: {
    machine: machineReducer,
    editor: editorReducer
  },
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
