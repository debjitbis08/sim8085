#!/bin/bash
# Builds the CP/M exerciser harness natively. See README.md for why this does
# not go through Emscripten.
set -e
cd "$(dirname "$0")"
gcc -O2 -std=c11 -Ishim -I../../core -o harness harness.c
