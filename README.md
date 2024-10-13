Sim8085
=======

Sim8085 is a online development environment for Intel 8085 microprocessor. It is
hosted at https://www.sim8085.com.

## Features

1. Editor with syntax highlighting.
2. Viewing and editing of registers, flags and memory.
3. Line by line execution.
4. Opcode listing view.

## Screenshot

<img src="public/images/screen.png" width="60%"/>

## Development

### Steps

1. Follow the instructions on the Emscripten [Download and install](https://emscripten.org/docs/getting_started/downloads.html) page.
2. Do `pnpm install`.
3. Do `pnpm dev` to start the development server.

### Building Assembler and Simulator changes
4. Do `pnpm build-emulator` to build the simulator.
5. Commit the changed files.

### Production Build

1. Build assembler and simulator code.
2. Do `pnpm build` to build the UI.
3. Built code should be available in `dist`.
