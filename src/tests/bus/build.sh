#!/bin/bash
set -e
cd "$(dirname "$0")"
gcc -O2 -std=c11 -I ../exerciser/shim -I ../../core -o bustest bustest.c
