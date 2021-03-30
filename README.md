Sim8085
=======

   
> :warning: Major refactor in progress. **All issues and bugs will be handled with the refactoring**.

---------------------------------------------------------------------------------------

Sim8085 is a online development environment for Intel 8085 microprocessor. It is
hosted at https://www.sim8085.com.

## Features

1. Editor with syntax highlighting.
2. Viewing and editing of registers, flags and memory.
3. Debugging code with breakpoints.
4. Opcode listing view.

## Screenshot

<img src="src/static/screen.png" width="60%"/>

## Development

### Steps

1. Download and install emscripten prerequisites using the instructions [here](https://kripken.github.io/emscripten-site/docs/getting_started/downloads.html#platform-notes-installation-instructions-sdk).
2. Do `yarn install`.
3. Do `yarn start` to start the development server.

### Building Assembler and Simulator changes
3. Do `yarn build-assembler` to build the assembler code.
4. Do `yarn build-emulator` to build the simulator.
5. Commit the changed files.

### Production Build

1. Build assembler and simulator code.
2. Do `yarn build` to build the UI.
3. Built code should be available in `dist`.
 
