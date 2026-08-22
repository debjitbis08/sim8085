#!/bin/bash
# Builds the monitor harness natively. See harness.c for why this does not go
# through the browser build.
set -e
cd "$(dirname "$0")"
gcc -O2 -std=c11 -I ../exerciser/shim -I ../../core -o harness harness.c
