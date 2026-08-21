// Minimal stand-in for <emscripten.h> so src/core/8085.c compiles with a native
// toolchain. The emulator core touches exactly two things from Emscripten, and
// neither means anything outside the browser: the export annotation and the
// async sleep used to pace timed runs. The exerciser runs flat out, so the
// sleep is a no-op here.
#ifndef SIM8085_SHIM_EMSCRIPTEN_H
#define SIM8085_SHIM_EMSCRIPTEN_H

#define EMSCRIPTEN_KEEPALIVE

static inline void emscripten_sleep(int ms) { (void)ms; }

#endif
