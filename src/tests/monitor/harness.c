// Runs the SDK-85 monitor ROM with a modelled 8279 attached, so a test can
// press keys and see what the monitor does.
//
// The SDK-85's 8279 is memory mapped, and src/core/8085.c reads and writes
// memory inline everywhere rather than through an accessor, so there is no hook
// to hang a device off. Instead the loop below looks at the instruction about
// to run: if it is one the monitor uses to touch 1800h or 1900h, the device is
// consulted just before a read and told just after a write. The monitor only
// ever reaches the 8279 with MOV A,M, MOV M,r and MVI M, which is what makes
// that narrow test sufficient here.
//
// Doing this in the emulator core would mean routing every memory access
// through an accessor. That is the change the UI would need; it is deliberately
// not made yet, so nothing user facing moves.
#include <fcntl.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

#include "8085.c"
#include "i8279.h"

void io_write(int address, int value) { (void)address; (void)value; }

static I8279 kbd;

// Works out whether the instruction about to run touches memory through an
// address the device answers to, and which way. The monitor reaches the 8279
// with MOV A,M and MVI M through HL, and with STA and LDA using a direct
// address, so those are the forms decoded here.
static int device_access(const State8085 *cpu, uint16_t *address, int *is_read) {
    uint8_t op = cpu->memory[cpu->pc];
    uint16_t hl = (uint16_t)((cpu->h << 8) | cpu->l);
    uint16_t direct = (uint16_t)(cpu->memory[(uint16_t)(cpu->pc + 1)] |
                                 (cpu->memory[(uint16_t)(cpu->pc + 2)] << 8));

    if (op == 0x7e)                                   { *address = hl; *is_read = 1; }
    else if (op == 0x36 || (op >= 0x70 && op <= 0x77 && op != 0x76))
                                                      { *address = hl; *is_read = 0; }
    else if (op == 0x3a)                              { *address = direct; *is_read = 1; }
    else if (op == 0x32)                              { *address = direct; *is_read = 0; }
    else return 0;

    return *address == I8279_DATA || *address == I8279_COMMAND;
}

static long run(State8085 *cpu, ExecutionStats8085 *stats, long instructions) {
    long executed = 0;
    for (; executed < instructions; executed++) {
        // The interrupt line is level sensitive: high exactly while a key is
        // waiting. Recomputing it every instruction is what stops one keypress
        // from being delivered over and over.
        cpu->pending_r5 = (uint8_t)i8279_irq(&kbd);

        uint16_t address = 0;
        int is_read = 0;
        int device = device_access(cpu, &address, &is_read);

        if (device && is_read) cpu->memory[address] = i8279_read(&kbd, address);
        Emulate8085Op(cpu, 0xFFFF, stats);
        if (device && !is_read) i8279_write(&kbd, address, cpu->memory[address]);
    }
    return executed;
}

#define CURAD 0x20f6
#define CURDT 0x20f8
#define IBUFF 0x20fe

int main(int argc, char **argv) {
    if (argc < 2) {
        fprintf(stderr, "usage: %s <rom.bin> [key,key,...]\n", argv[0]);
        return 2;
    }

    fflush(stdout);
    int saved = dup(STDOUT_FILENO), devnull = open("/dev/null", O_WRONLY);
    dup2(devnull, STDOUT_FILENO);
    State8085 *cpu = Init8085();
    fflush(stdout);
    dup2(saved, STDOUT_FILENO);
    close(devnull);
    close(saved);

    memset(cpu->memory, 0, 0x10000);
    memset(cpu->io, 0, 0x100);
    FILE *rom = fopen(argv[1], "rb");
    if (!rom) { fprintf(stderr, "cannot open %s\n", argv[1]); return 2; }
    if (fread(cpu->memory, 1, 0x10000, rom) == 0) { fclose(rom); return 2; }
    fclose(rom);

    i8279_reset(&kbd);
    cpu->pc = 0;
    cpu->sp = 0x20c0;
    ExecutionStats8085 stats;
    memset(&stats, 0, sizeof(stats));

    run(cpu, &stats, 2000000);
    printf("BOOT pc=%04X sp=%04X ibuff=%02X\n", cpu->pc, cpu->sp, cpu->memory[IBUFF]);

    if (argc > 2) {
        char keys[512];
        snprintf(keys, sizeof(keys), "%s", argv[2]);
        for (char *tok = strtok(keys, ","); tok; tok = strtok(NULL, ",")) {
            uint8_t code = (uint8_t)strtol(tok, NULL, 16);
            i8279_press(&kbd, code);
            run(cpu, &stats, 400000);
            printf("KEY %02X pc=%04X curad=%04X curdt=%02X\n", code, cpu->pc,
                   cpu->memory[CURAD] | (cpu->memory[CURAD + 1] << 8), cpu->memory[CURDT]);
        }
    }

    // Addresses the caller wants to see, so a test can check that a command
    // actually changed memory and not merely the display.
    if (argc > 3) {
        char dumps[512];
        snprintf(dumps, sizeof(dumps), "%s", argv[3]);
        for (char *tok = strtok(dumps, ","); tok; tok = strtok(NULL, ",")) {
            uint16_t address = (uint16_t)strtol(tok, NULL, 16);
            printf("MEM %04X %02X\n", address, cpu->memory[address]);
        }
    }

    printf("DISPLAY");
    for (int i = 0; i < I8279_DISPLAY_BYTES; i++) printf(" %02X", kbd.display[i]);
    printf("\nCOMMANDS %d WRITES %d\n", kbd.commands_seen, kbd.display_writes);
    return 0;
}
