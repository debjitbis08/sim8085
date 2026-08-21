// A minimal CP/M host for running the 8080 exerciser ROMs against the sim8085
// emulator core.
//
// The ROMs in roms/ are ordinary CP/M .COM files. They need very little of CP/M
// to run: load the image at 0x0100, service BDOS calls 2 (write character) and
// 9 (write $-terminated string), and treat a jump to 0x0000 as the warm boot
// that signals completion. Everything they print goes to stdout, and
// src/tests/exerciser/exerciser.test.js decides pass or fail from that text.
//
// The core is included as a single translation unit rather than linked, so the
// harness sees State8085 without the struct having to be duplicated here.
// src/core/8085.c defines no main(), so there is nothing to collide with.
#include <fcntl.h>
#include <string.h>
#include <unistd.h>

#include "8085.c"

#define TPA        0x0100  // where CP/M loads a .COM image
#define BDOS_ENTRY 0x0005  // BDOS call vector
#define WBOOT      0x0000  // warm boot; reaching it means the ROM is done

// Emulate8085Op resets SP whenever the `offset` it is handed equals the current
// PC -- that is how the browser build re-initialises the stack at a program's
// load address. The exerciser manages its own stack, so we pass an address the
// ROMs never execute at and assert that stays true.
#define NO_RESET   0xFFFF

// Supplied by simulator-library.js in the browser build. The exerciser ROMs are
// plain CP/M programs and never drive an I/O port, so a no-op satisfies the link.
void io_write(int address, int value) { (void)address; (void)value; }

static void service_bdos(State8085 *cpu) {
    if (cpu->c == 2) {
        putchar(cpu->e);
    } else if (cpu->c == 9) {
        uint16_t addr = (uint16_t)((cpu->d << 8) | cpu->e);
        for (int i = 0; i < 0x10000; i++) {
            uint8_t ch = cpu->memory[(uint16_t)(addr + i)];
            if (ch == '$') break;
            putchar(ch);
        }
    }
    // Anything else (console status, and so on) returns with A untouched, which
    // is all these ROMs need.
}

int main(int argc, char **argv) {
    if (argc < 2) {
        fprintf(stderr, "usage: %s <rom.com> [max_instructions]\n", argv[0]);
        return 2;
    }

    // Budget in instructions, so a runaway ROM fails instead of hanging CI.
    // 8080EXM legitimately needs billions; the default covers it with room.
    uint64_t budget = (argc > 2) ? strtoull(argv[2], NULL, 10) : 6000000000ULL;

    FILE *rom = fopen(argv[1], "rb");
    if (!rom) {
        fprintf(stderr, "harness: cannot open %s\n", argv[1]);
        return 2;
    }

    // Init8085 announces its allocations on stdout, which would land in the
    // middle of the ROM's console output. Mute stdout across the call only.
    fflush(stdout);
    int saved_stdout = dup(STDOUT_FILENO);
    int devnull = open("/dev/null", O_WRONLY);
    dup2(devnull, STDOUT_FILENO);
    State8085 *cpu = Init8085();
    fflush(stdout);
    dup2(saved_stdout, STDOUT_FILENO);
    close(devnull);
    close(saved_stdout);

    if (!cpu) {
        fprintf(stderr, "harness: Init8085 failed\n");
        fclose(rom);
        return 2;
    }

    memset(cpu->memory, 0, 0x10000);
    // Init8085 mallocs the port array without clearing it. None of these ROMs
    // executes IN, but leaving it uninitialised would make any that did depend
    // on heap garbage.
    memset(cpu->io, 0, 0x100);
    size_t size = fread(cpu->memory + TPA, 1, 0x10000 - TPA, rom);
    fclose(rom);
    if (size == 0) {
        fprintf(stderr, "harness: %s is empty\n", argv[1]);
        return 2;
    }

    // The ROMs CRC the whole PSW byte and were written for an 8080, so the
    // 8085-only K and V bits and the 8085 auxiliary-carry rule for logical AND
    // have to report 8080 values for the published CRCs to match. See README.md.
    set_8080_compat(1);
    set_timing_enabled(0);

    cpu->memory[WBOOT] = 0xC9;       // RET, in case a ROM calls rather than jumps
    cpu->memory[BDOS_ENTRY] = 0xC9;  // RET, executed after we service the call
    cpu->pc = TPA;
    cpu->sp = 0xF000;

    ExecutionStats8085 stats;
    memset(&stats, 0, sizeof(stats));

    uint64_t executed = 0;
    int status = 0;
    while (1) {
        if (cpu->pc == WBOOT) break;  // ROM finished

        if (cpu->pc == NO_RESET) {
            fprintf(stderr, "\nharness: PC reached the sentinel address %04X\n", NO_RESET);
            status = 3;
            break;
        }
        if (cpu->pc == BDOS_ENTRY) service_bdos(cpu);

        Emulate8085Op(cpu, NO_RESET, &stats);

        if (++executed >= budget) {
            fprintf(stderr, "\nharness: instruction budget %llu exhausted\n",
                    (unsigned long long)budget);
            status = 4;
            break;
        }
    }

    fflush(stdout);
    fprintf(stderr, "harness: %llu instructions, %llu t-states\n",
            (unsigned long long)executed, (unsigned long long)stats.total_tstates);
    return status;
}
