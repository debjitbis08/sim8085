// Runs the SDK-85 monitor ROM on a modelled SDK-85, so a test can press keys
// and see what the monitor does.
//
// The board is built by sdk85_attach: ROM, RAM and the 8279 are mapped onto the
// bus, and from then on the processor reaches the keyboard the same way it
// reaches anything else. Nothing here decodes instructions or pokes interrupt
// flags; the 8279 drives RST 5.5 and the processor samples it.
#include <fcntl.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

#include "8085.c"
#include "machines/sdk85.h"

void io_write(int address, int value) { (void)address; (void)value; }

static SDK85 board;

static long run(State8085 *cpu, ExecutionStats8085 *stats, long instructions) {
    for (long executed = 0; executed < instructions; executed++) {
        Emulate8085Op(cpu, 0xFFFF, stats);
    }
    return instructions;
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

    sdk85_attach(&board, &cpu->bus, cpu->memory, cpu->io);
    cpu->pc = 0;
    cpu->sp = 0x20c0;
    ExecutionStats8085 stats;
    memset(&stats, 0, sizeof(stats));

    run(cpu, &stats, 2000000);
    printf("BOOT pc=%04X sp=%04X ibuff=%02X\n", cpu->pc, cpu->sp, cpu->memory[IBUFF]);

    // Bytes placed straight into memory, for a program the test wants to run
    // rather than key in one nibble at a time.
    if (argc > 4) {
        char pokes[1024];
        snprintf(pokes, sizeof(pokes), "%s", argv[4]);
        for (char *tok = strtok(pokes, ","); tok; tok = strtok(NULL, ",")) {
            char *colon = strchr(tok, ':');
            if (!colon) continue;
            *colon = 0;
            cpu->memory[(uint16_t)strtol(tok, NULL, 16)] = (uint8_t)strtol(colon + 1, NULL, 16);
        }
    }

    if (argc > 2) {
        char keys[512];
        snprintf(keys, sizeof(keys), "%s", argv[2]);
        for (char *tok = strtok(keys, ","); tok; tok = strtok(NULL, ",")) {
            uint8_t code = (uint8_t)strtol(tok, NULL, 16);
            i8279_press(&board.keyboard, code);
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

    // What the board itself gives us, which a flat 64K of RAM could not.
    uint8_t rom_before = mem_read(cpu, 0x0000);
    mem_write(cpu, 0x0000, (uint8_t)(rom_before ^ 0xff));
    printf("ROM %02X %02X\n", rom_before, mem_read(cpu, 0x0000));
    printf("UNMAPPED %02X\n", mem_read(cpu, 0x8000));
    printf("TIMER reload=%u mode=%02X timeouts=%d\n",
           board.support.reload, board.support.mode, board.support.timeouts);

    printf("DISPLAY");
    for (int i = 0; i < I8279_DISPLAY_BYTES; i++) printf(" %02X", board.keyboard.display[i]);
    printf("\nCOMMANDS %d WRITES %d\n", board.keyboard.commands_seen, board.keyboard.display_writes);
    return 0;
}
