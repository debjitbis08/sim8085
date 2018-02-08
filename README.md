Sim8085
=======

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
3. Do `yarn build-assembler` to build the assembler code.
4. DO `yarn build-emulator` to build the simulator.
5. Do `yarn build` to build the UI.
6. Now you can serve the file inside `dist/` folder to view the application. Use a static file
   server such as, [`http-server`](https://www.npmjs.com/package/http-server).
 