#!/bin/bash

set +x

emcc \
    src/core/8085.c \
    -o src/core/8085.js \
    -Oz --closure 0 \
    -s EXPORTED_FUNCTIONS="['_malloc', '_free','_Init8085','_ExecuteProgram', '_ExecuteProgramSlice', '_Emulate8085Op', '_LoadProgram', '_UnloadProgram', '_ExecuteProgramUntil', '_set_timing_enabled', '_InterruptToHalt']" \
    -s EXPORTED_RUNTIME_METHODS="['ccall', 'cwrap', 'getValue', 'setValue']" \
    -s NO_EXIT_RUNTIME=1 \
    -s NO_FILESYSTEM=1 \
    -s MODULARIZE=1 \
    -s WASM=0 \
    -s EXPORT_ES6=1 \
    -s ENVIRONMENT="web,worker" \
    --js-library src/core/simulator-library.js

# --memory-init-file 0 \
