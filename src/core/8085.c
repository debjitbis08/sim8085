#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <stdbool.h>
#include <emscripten.h>

#include "bus.h"
#include "machines/sdk85.h"

#define MACHINE_PLAIN 0
#define MACHINE_SDK85 1

typedef struct {
    bool timing_enabled;
    float clock_frequency_hz;
    // In future, add more options like:
    // int speed_multiplier;
    // bool logging_enabled;
} SimulatorOptions;

SimulatorOptions sim_options = {
    .timing_enabled = false,
    .clock_frequency_hz = 3072000.0f, // default 3.072 MHz
};

// Intel 8080 compatibility. The CP/M exerciser ROMs CRC the whole PSW byte and
// were written against an 8080, so the two places the 8085 diverges -- the K
// and V flag bits in PSW, and the auxiliary carry set by logical AND -- have to
// report 8080 values while they run. Off in normal operation; see
// src/tests/exerciser/README.md.
static bool i8080_compat = false;

EMSCRIPTEN_KEEPALIVE
void set_8080_compat(int enabled) {
    i8080_compat = (enabled != 0);
}

EMSCRIPTEN_KEEPALIVE
int get_8080_compat() {
    return i8080_compat ? 1 : 0;
}

// --- Setter Functions ---
EMSCRIPTEN_KEEPALIVE
void set_timing_enabled(int enabled) {
    sim_options.timing_enabled = (enabled != 0);
}

EMSCRIPTEN_KEEPALIVE
void set_clock_frequency(float hz) {
    if (hz > 0.0f) {
        sim_options.clock_frequency_hz = hz;
    }
}

// Example future setter
// EMSCRIPTEN_KEEPALIVE
// void set_speed_multiplier(int multiplier) {
//     sim_options.speed_multiplier = multiplier;
// }

// --- Getter Functions (optional) ---
EMSCRIPTEN_KEEPALIVE
int get_timing_enabled() {
    return sim_options.timing_enabled ? 1 : 0;
}

EMSCRIPTEN_KEEPALIVE
void delay_ms(int ms) {
    emscripten_sleep(ms);
}

typedef struct Flags
{
	uint8_t z : 1;
	uint8_t s : 1;
	uint8_t p : 1;
	uint8_t cy : 1;
	uint8_t ac : 1;
	uint8_t v : 1;
	uint8_t k : 1;
	uint8_t pad : 1;
} Flags;

Flags CC_ZSPAC = {0, 0, 0, 0, 0, 0, 0};

typedef struct State8085
{
	uint8_t a;
	uint8_t b;
	uint8_t c;
	uint8_t d;
	uint8_t e;
	uint8_t h;
	uint8_t l;
	uint16_t sp;
	uint16_t pc;
	struct Flags cc;
	uint8_t int_enable;
    uint8_t r5_mask, r6_mask, r7_mask;
    uint8_t pending_trap, pending_r5, pending_r6, r7_latch;
    uint8_t sod_line;
    uint8_t hlt_enable;
    uint8_t ei_delay;
    // The first RIM executed after TRAP reports the interrupt-enable state
    // that existed immediately before TRAP was accepted.
    uint8_t trap_ie_copy;
    uint8_t trap_ie_valid;
    // The interrupt pins as driven from outside the processor, kept apart from
    // the pending and latched state above. A device on the bus and a caller
    // using triggerInterrupt are both driving the same pin, so neither may
    // overwrite the other; the processor combines them when it samples.
    uint8_t host_trap;
    uint8_t host_r5;
    uint8_t host_r6;
    uint8_t host_r75;
    // The RST 7.5 level the devices drove last sample, so that a rising edge
    // can be told from a line that is simply still high.
    uint8_t dev_r75;
    // Which machine the processor is plugged into. Allocating a board is not
    // the same as being attached to one.
    uint8_t machine;
	uint8_t *memory;
	uint8_t *io;
	// Appended deliberately: cpuState.js reads the fields above by fixed
	// offset, so nothing may be inserted ahead of them.
	Bus bus;
	// The board this processor is plugged into, if it is plugged into one.
	// NULL is the plain machine: 64K of RAM and no peripherals.
	void *board;
} State8085;

// Every memory access the processor makes goes through the bus, so that a page
// can be plain memory, read-only, a peripheral, or nothing at all.
static inline uint8_t mem_read(State8085 *state, uint16_t address) {
	return bus_read(&state->bus, address);
}

static inline void mem_write(State8085 *state, uint16_t address, uint8_t value) {
	bus_write(&state->bus, address, value);
}

typedef struct ExecutionStats8085 {
    uint64_t total_tstates;
    uint16_t min_sp;
    bool min_sp_set;
    // future fields: total_instructions, memory_reads, etc.
} ExecutionStats8085;

static uint64_t last_total_tstates = 0;
static uint16_t last_min_sp = 0xFFFF;
static uint16_t last_start_sp = 0xFFFF;

EMSCRIPTEN_KEEPALIVE
uint64_t get_last_total_tstates() {
    return last_total_tstates;
}

EMSCRIPTEN_KEEPALIVE
uint32_t get_last_max_stack_bytes() {
    return last_start_sp >= last_min_sp ? (uint32_t)(last_start_sp - last_min_sp) : 0;
}


int parity(int x, int size)
{
	int i;
	int p = 0;
	x = (x & ((1 << size) - 1));
	for (i = 0; i < size; i++)
	{
		if (x & 0x1)
			p++;
		x = x >> 1;
	}
	return (0 == (p & 0x1));
}

int Disassemble8085Op(unsigned char *codebuffer, int pc)
{
	unsigned char *code = &codebuffer[pc];
	int opbytes = 1;
	printf("%04x ", pc);
	switch (*code)
	{
	case 0x00:
		printf("NOP");
		break;
	case 0x01:
		printf("LXI    B,#$%02x%02x", code[2], code[1]);
		opbytes = 3;
		break;
	case 0x02:
		printf("STAX   B");
		break;
	case 0x03:
		printf("INX    B");
		break;
	case 0x04:
		printf("INR    B");
		break;
	case 0x05:
		printf("DCR    B");
		break;
	case 0x06:
		printf("MVI    B,#$%02x", code[1]);
		opbytes = 2;
		break;
	case 0x07:
		printf("RLC");
		break;
	case 0x08:
		printf("DSUB");
		break;
	case 0x09:
		printf("DAD    B");
		break;
	case 0x0a:
		printf("LDAX   B");
		break;
	case 0x0b:
		printf("DCX    B");
		break;
	case 0x0c:
		printf("INR    C");
		break;
	case 0x0d:
		printf("DCR    C");
		break;
	case 0x0e:
		printf("MVI    C,#$%02x", code[1]);
		opbytes = 2;
		break;
	case 0x0f:
		printf("RRC");
		break;

	case 0x10:
		printf("ARHL");
		break;
	case 0x11:
		printf("LXI    D,#$%02x%02x", code[2], code[1]);
		opbytes = 3;
		break;
	case 0x12:
		printf("STAX   D");
		break;
	case 0x13:
		printf("INX    D");
		break;
	case 0x14:
		printf("INR    D");
		break;
	case 0x15:
		printf("DCR    D");
		break;
	case 0x16:
		printf("MVI    D,#$%02x", code[1]);
		opbytes = 2;
		break;
	case 0x17:
		printf("RAL");
		break;
	case 0x18:
		printf("RDEL");
		break;
	case 0x19:
		printf("DAD    D");
		break;
	case 0x1a:
		printf("LDAX   D");
		break;
	case 0x1b:
		printf("DCX    D");
		break;
	case 0x1c:
		printf("INR    E");
		break;
	case 0x1d:
		printf("DCR    E");
		break;
	case 0x1e:
		printf("MVI    E,#$%02x", code[1]);
		opbytes = 2;
		break;
	case 0x1f:
		printf("RAR");
		break;

	case 0x20:
		printf("NOP");
		break;
	case 0x21:
		printf("LXI    H,#$%02x%02x", code[2], code[1]);
		opbytes = 3;
		break;
	case 0x22:
		printf("SHLD   $%02x%02x", code[2], code[1]);
		opbytes = 3;
		break;
	case 0x23:
		printf("INX    H");
		break;
	case 0x24:
		printf("INR    H");
		break;
	case 0x25:
		printf("DCR    H");
		break;
	case 0x26:
		printf("MVI    H,#$%02x", code[1]);
		opbytes = 2;
		break;
	case 0x27:
		printf("DAA");
		break;
	case 0x28:
		printf("LDHI   #$%02x", code[1]);
		opbytes = 2;
		break;
	case 0x29:
		printf("DAD    H");
		break;
	case 0x2a:
		printf("LHLD   $%02x%02x", code[2], code[1]);
		opbytes = 3;
		break;
	case 0x2b:
		printf("DCX    H");
		break;
	case 0x2c:
		printf("INR    L");
		break;
	case 0x2d:
		printf("DCR    L");
		break;
	case 0x2e:
		printf("MVI    L,#$%02x", code[1]);
		opbytes = 2;
		break;
	case 0x2f:
		printf("CMA");
		break;
	case 0x30:
		printf("SIM");
		break;
	case 0x31:
		printf("LXI    SP,#$%02x%02x", code[2], code[1]);
		opbytes = 3;
		break;
	case 0x32:
		printf("STA    $%02x%02x", code[2], code[1]);
		opbytes = 3;
		break;
	case 0x33:
		printf("INX    SP");
		break;
	case 0x34:
		printf("INR    M");
		break;
	case 0x35:
		printf("DCR    M");
		break;
	case 0x36:
		printf("MVI    M,#$%02x", code[1]);
		opbytes = 2;
		break;
	case 0x37:
		printf("STC");
		break;
	case 0x38:
		printf("LDSI   #$%02x", code[1]);
		opbytes = 2;
		break;
	case 0x39:
		printf("DAD    SP");
		break;
	case 0x3a:
		printf("LDA    $%02x%02x", code[2], code[1]);
		opbytes = 3;
		break;
	case 0x3b:
		printf("DCX    SP");
		break;
	case 0x3c:
		printf("INR    A");
		break;
	case 0x3d:
		printf("DCR    A");
		break;
	case 0x3e:
		printf("MVI    A,#$%02x", code[1]);
		opbytes = 2;
		break;
	case 0x3f:
		printf("CMC");
		break;

	case 0x40:
		printf("MOV    B,B");
		break;
	case 0x41:
		printf("MOV    B,C");
		break;
	case 0x42:
		printf("MOV    B,D");
		break;
	case 0x43:
		printf("MOV    B,E");
		break;
	case 0x44:
		printf("MOV    B,H");
		break;
	case 0x45:
		printf("MOV    B,L");
		break;
	case 0x46:
		printf("MOV    B,M");
		break;
	case 0x47:
		printf("MOV    B,A");
		break;
	case 0x48:
		printf("MOV    C,B");
		break;
	case 0x49:
		printf("MOV    C,C");
		break;
	case 0x4a:
		printf("MOV    C,D");
		break;
	case 0x4b:
		printf("MOV    C,E");
		break;
	case 0x4c:
		printf("MOV    C,H");
		break;
	case 0x4d:
		printf("MOV    C,L");
		break;
	case 0x4e:
		printf("MOV    C,M");
		break;
	case 0x4f:
		printf("MOV    C,A");
		break;

	case 0x50:
		printf("MOV    D,B");
		break;
	case 0x51:
		printf("MOV    D,C");
		break;
	case 0x52:
		printf("MOV    D,D");
		break;
	case 0x53:
		printf("MOV    D.E");
		break;
	case 0x54:
		printf("MOV    D,H");
		break;
	case 0x55:
		printf("MOV    D,L");
		break;
	case 0x56:
		printf("MOV    D,M");
		break;
	case 0x57:
		printf("MOV    D,A");
		break;
	case 0x58:
		printf("MOV    E,B");
		break;
	case 0x59:
		printf("MOV    E,C");
		break;
	case 0x5a:
		printf("MOV    E,D");
		break;
	case 0x5b:
		printf("MOV    E,E");
		break;
	case 0x5c:
		printf("MOV    E,H");
		break;
	case 0x5d:
		printf("MOV    E,L");
		break;
	case 0x5e:
		printf("MOV    E,M");
		break;
	case 0x5f:
		printf("MOV    E,A");
		break;

	case 0x60:
		printf("MOV    H,B");
		break;
	case 0x61:
		printf("MOV    H,C");
		break;
	case 0x62:
		printf("MOV    H,D");
		break;
	case 0x63:
		printf("MOV    H.E");
		break;
	case 0x64:
		printf("MOV    H,H");
		break;
	case 0x65:
		printf("MOV    H,L");
		break;
	case 0x66:
		printf("MOV    H,M");
		break;
	case 0x67:
		printf("MOV    H,A");
		break;
	case 0x68:
		printf("MOV    L,B");
		break;
	case 0x69:
		printf("MOV    L,C");
		break;
	case 0x6a:
		printf("MOV    L,D");
		break;
	case 0x6b:
		printf("MOV    L,E");
		break;
	case 0x6c:
		printf("MOV    L,H");
		break;
	case 0x6d:
		printf("MOV    L,L");
		break;
	case 0x6e:
		printf("MOV    L,M");
		break;
	case 0x6f:
		printf("MOV    L,A");
		break;

	case 0x70:
		printf("MOV    M,B");
		break;
	case 0x71:
		printf("MOV    M,C");
		break;
	case 0x72:
		printf("MOV    M,D");
		break;
	case 0x73:
		printf("MOV    M.E");
		break;
	case 0x74:
		printf("MOV    M,H");
		break;
	case 0x75:
		printf("MOV    M,L");
		break;
	case 0x76:
		printf("HLT");
		break;
	case 0x77:
		printf("MOV    M,A");
		break;
	case 0x78:
		printf("MOV    A,B");
		break;
	case 0x79:
		printf("MOV    A,C");
		break;
	case 0x7a:
		printf("MOV    A,D");
		break;
	case 0x7b:
		printf("MOV    A,E");
		break;
	case 0x7c:
		printf("MOV    A,H");
		break;
	case 0x7d:
		printf("MOV    A,L");
		break;
	case 0x7e:
		printf("MOV    A,M");
		break;
	case 0x7f:
		printf("MOV    A,A");
		break;

	case 0x80:
		printf("ADD    B");
		break;
	case 0x81:
		printf("ADD    C");
		break;
	case 0x82:
		printf("ADD    D");
		break;
	case 0x83:
		printf("ADD    E");
		break;
	case 0x84:
		printf("ADD    H");
		break;
	case 0x85:
		printf("ADD    L");
		break;
	case 0x86:
		printf("ADD    M");
		break;
	case 0x87:
		printf("ADD    A");
		break;
	case 0x88:
		printf("ADC    B");
		break;
	case 0x89:
		printf("ADC    C");
		break;
	case 0x8a:
		printf("ADC    D");
		break;
	case 0x8b:
		printf("ADC    E");
		break;
	case 0x8c:
		printf("ADC    H");
		break;
	case 0x8d:
		printf("ADC    L");
		break;
	case 0x8e:
		printf("ADC    M");
		break;
	case 0x8f:
		printf("ADC    A");
		break;

	case 0x90:
		printf("SUB    B");
		break;
	case 0x91:
		printf("SUB    C");
		break;
	case 0x92:
		printf("SUB    D");
		break;
	case 0x93:
		printf("SUB    E");
		break;
	case 0x94:
		printf("SUB    H");
		break;
	case 0x95:
		printf("SUB    L");
		break;
	case 0x96:
		printf("SUB    M");
		break;
	case 0x97:
		printf("SUB    A");
		break;
	case 0x98:
		printf("SBB    B");
		break;
	case 0x99:
		printf("SBB    C");
		break;
	case 0x9a:
		printf("SBB    D");
		break;
	case 0x9b:
		printf("SBB    E");
		break;
	case 0x9c:
		printf("SBB    H");
		break;
	case 0x9d:
		printf("SBB    L");
		break;
	case 0x9e:
		printf("SBB    M");
		break;
	case 0x9f:
		printf("SBB    A");
		break;

	case 0xa0:
		printf("ANA    B");
		break;
	case 0xa1:
		printf("ANA    C");
		break;
	case 0xa2:
		printf("ANA    D");
		break;
	case 0xa3:
		printf("ANA    E");
		break;
	case 0xa4:
		printf("ANA    H");
		break;
	case 0xa5:
		printf("ANA    L");
		break;
	case 0xa6:
		printf("ANA    M");
		break;
	case 0xa7:
		printf("ANA    A");
		break;
	case 0xa8:
		printf("XRA    B");
		break;
	case 0xa9:
		printf("XRA    C");
		break;
	case 0xaa:
		printf("XRA    D");
		break;
	case 0xab:
		printf("XRA    E");
		break;
	case 0xac:
		printf("XRA    H");
		break;
	case 0xad:
		printf("XRA    L");
		break;
	case 0xae:
		printf("XRA    M");
		break;
	case 0xaf:
		printf("XRA    A");
		break;

	case 0xb0:
		printf("ORA    B");
		break;
	case 0xb1:
		printf("ORA    C");
		break;
	case 0xb2:
		printf("ORA    D");
		break;
	case 0xb3:
		printf("ORA    E");
		break;
	case 0xb4:
		printf("ORA    H");
		break;
	case 0xb5:
		printf("ORA    L");
		break;
	case 0xb6:
		printf("ORA    M");
		break;
	case 0xb7:
		printf("ORA    A");
		break;
	case 0xb8:
		printf("CMP    B");
		break;
	case 0xb9:
		printf("CMP    C");
		break;
	case 0xba:
		printf("CMP    D");
		break;
	case 0xbb:
		printf("CMP    E");
		break;
	case 0xbc:
		printf("CMP    H");
		break;
	case 0xbd:
		printf("CMP    L");
		break;
	case 0xbe:
		printf("CMP    M");
		break;
	case 0xbf:
		printf("CMP    A");
		break;

	case 0xc0:
		printf("RNZ");
		break;
	case 0xc1:
		printf("POP    B");
		break;
	case 0xc2:
		printf("JNZ    $%02x%02x", code[2], code[1]);
		opbytes = 3;
		break;
	case 0xc3:
		printf("JMP    $%02x%02x", code[2], code[1]);
		opbytes = 3;
		break;
	case 0xc4:
		printf("CNZ    $%02x%02x", code[2], code[1]);
		opbytes = 3;
		break;
	case 0xc5:
		printf("PUSH   B");
		break;
	case 0xc6:
		printf("ADI    #$%02x", code[1]);
		opbytes = 2;
		break;
	case 0xc7:
		printf("RST    0");
		break;
	case 0xc8:
		printf("RZ");
		break;
	case 0xc9:
		printf("RET");
		break;
	case 0xca:
		printf("JZ     $%02x%02x", code[2], code[1]);
		opbytes = 3;
		break;
	case 0xcb:
		printf("RSTV");
		break;
	case 0xcc:
		printf("CZ     $%02x%02x", code[2], code[1]);
		opbytes = 3;
		break;
	case 0xcd:
		printf("CALL   $%02x%02x", code[2], code[1]);
		opbytes = 3;
		break;
	case 0xce:
		printf("ACI    #$%02x", code[1]);
		opbytes = 2;
		break;
	case 0xcf:
		printf("RST    1");
		break;

	case 0xd0:
		printf("RNC");
		break;
	case 0xd1:
		printf("POP    D");
		break;
	case 0xd2:
		printf("JNC    $%02x%02x", code[2], code[1]);
		opbytes = 3;
		break;
	case 0xd3:
		printf("OUT    #$%02x", code[1]);
		opbytes = 2;
		break;
	case 0xd4:
		printf("CNC    $%02x%02x", code[2], code[1]);
		opbytes = 3;
		break;
	case 0xd5:
		printf("PUSH   D");
		break;
	case 0xd6:
		printf("SUI    #$%02x", code[1]);
		opbytes = 2;
		break;
	case 0xd7:
		printf("RST    2");
		break;
	case 0xd8:
		printf("RC");
		break;
	case 0xd9:
		printf("SHLX");
		break;
	case 0xda:
		printf("JC     $%02x%02x", code[2], code[1]);
		opbytes = 3;
		break;
	case 0xdb:
		printf("IN     #$%02x", code[1]);
		opbytes = 2;
		break;
	case 0xdc:
		printf("CC     $%02x%02x", code[2], code[1]);
		opbytes = 3;
		break;
	case 0xdd:
		printf("JNX5   $%02x%02x", code[2], code[1]);
		opbytes = 3;
		break;
	case 0xde:
		printf("SBI    #$%02x", code[1]);
		opbytes = 2;
		break;
	case 0xdf:
		printf("RST    3");
		break;

	case 0xe0:
		printf("RPO");
		break;
	case 0xe1:
		printf("POP    H");
		break;
	case 0xe2:
		printf("JPO    $%02x%02x", code[2], code[1]);
		opbytes = 3;
		break;
	case 0xe3:
		printf("XTHL");
		break;
	case 0xe4:
		printf("CPO    $%02x%02x", code[2], code[1]);
		opbytes = 3;
		break;
	case 0xe5:
		printf("PUSH   H");
		break;
	case 0xe6:
		printf("ANI    #$%02x", code[1]);
		opbytes = 2;
		break;
	case 0xe7:
		printf("RST    4");
		break;
	case 0xe8:
		printf("RPE");
		break;
	case 0xe9:
		printf("PCHL");
		break;
	case 0xea:
		printf("JPE    $%02x%02x", code[2], code[1]);
		opbytes = 3;
		break;
	case 0xeb:
		printf("XCHG");
		break;
	case 0xec:
		printf("CPE     $%02x%02x", code[2], code[1]);
		opbytes = 3;
		break;
	case 0xed:
		printf("LHLX");
		break;
	case 0xee:
		printf("XRI    #$%02x", code[1]);
		opbytes = 2;
		break;
	case 0xef:
		printf("RST    5");
		break;

	case 0xf0:
		printf("RP");
		break;
	case 0xf1:
		printf("POP    PSW");
		break;
	case 0xf2:
		printf("JP     $%02x%02x", code[2], code[1]);
		opbytes = 3;
		break;
	case 0xf3:
		printf("DI");
		break;
	case 0xf4:
		printf("CP     $%02x%02x", code[2], code[1]);
		opbytes = 3;
		break;
	case 0xf5:
		printf("PUSH   PSW");
		break;
	case 0xf6:
		printf("ORI    #$%02x", code[1]);
		opbytes = 2;
		break;
	case 0xf7:
		printf("RST    6");
		break;
	case 0xf8:
		printf("RM");
		break;
	case 0xf9:
		printf("SPHL");
		break;
	case 0xfa:
		printf("JM     $%02x%02x", code[2], code[1]);
		opbytes = 3;
		break;
	case 0xfb:
		printf("EI");
		break;
	case 0xfc:
		printf("CM     $%02x%02x", code[2], code[1]);
		opbytes = 3;
		break;
	case 0xfd:
		printf("JX5    $%02x%02x", code[2], code[1]);
		opbytes = 3;
		break;
	case 0xfe:
		printf("CPI    #$%02x", code[1]);
		opbytes = 2;
		break;
	case 0xff:
		printf("RST    7");
		break;
	}
    printf("\n");

	return opbytes;
}

typedef enum { PRESERVE_CARRY, UPDATE_CARRY } should_preserve_carry;

void LogicFlagsA(State8085 *state, uint8_t ac)
{
    // Carry is always reset by the logical instructions. Auxiliary carry is
    // not: OR and exclusive-OR reset it, but AND sets it (see ana()), so the
    // caller passes the value in.
	state->cc.cy = 0;
	state->cc.ac = ac;
	state->cc.z = (state->a == 0);
	state->cc.s = (0x80 == (state->a & 0x80));
	state->cc.p = parity(state->a, 8);
	state->cc.v = 0;
	state->cc.k = state->cc.s;
}

// Logical AND of the accumulator with `operand`.
//
// The auxiliary carry is the one documented 8080/8085 incompatibility in the
// logical group. Per the Intel 8080/8085 Assembly Language Programming Manual:
// "The 8085 logical AND instructions always set the auxiliary flag ON. The 8080
// logical AND instructions set the flag to reflect the logical OR of bit 3 of
// the values involved in the AND operation."
void ana(State8085 *state, uint8_t operand)
{
	uint8_t ac = i8080_compat ? (((state->a | operand) >> 3) & 1) : 1;
	state->a = state->a & operand;
	LogicFlagsA(state, ac);
}

void ArithFlagsA(State8085 *state, uint16_t res, should_preserve_carry preserveCarry)
{
	if (preserveCarry == UPDATE_CARRY)
		state->cc.cy = (res > 0xff);
	state->cc.z = ((res & 0xff) == 0);
	state->cc.s = (0x80 == (res & 0x80));
	state->cc.p = parity(res & 0xff, 8);
}

// The 8085 carries two flags Intel never documented: V (overflow, PSW bit 1)
// and K (PSW bit 5). RSTV branches on V, JX5/JNX5 on K.
//
// Sources consulted, and where they disagree:
//
//   * Wolfgang Dehnhardt and Villy M. Sorensen, "Unspecified 8085 op codes
//     enhance programming" (Electronics, January 1979). The original
//     publication of these opcodes, and the primary source. Gives the condition
//     code format as S Z X5 AC 0 P V C, the per-instruction flag lists and the
//     T-state counts used below, and states that X5's only known use is as an
//     unsigned overflow indicator on INX (FFFF to 0000) and underflow on DCX
//     (0000 to FFFF). Its published X5 formula, a majority function over the
//     operand and result signs, agrees with V xor sign for subtraction.
//   * Ken Shirriff's silicon reverse-engineering of the 8085 flag circuits
//     (righto.com, Feb 2013). States V is "the exclusive-or of the carry into
//     the top bit and the carry out of the top bit", K is "the exclusive-or of
//     the V flag and the sign bit of the result", V is 0 for RRC/RAR/AND/OR/
//     XOR, RLC and RAL behave as A+A, and DAD sets V from 16-bit overflow.
//     This is the model implemented below.
//   * MAME's 8085 core (src/devices/cpu/i8085/i8085.cpp). Agrees on the PSW
//     bit positions, on INX/DCX setting K from the incrementer carry, and on
//     clearing V for the logical operations. It disagrees twice: it sets V on
//     every subtract-type operation and clears it on adds rather than computing
//     signed overflow, and it leaves parity untouched and K clear after DSUB.
//     The two documentation sources are followed over MAME on both counts.
//   * Intel's own manuals document none of this: neither the MCS-80/85 Family
//     User's Manual nor the 8080/8085 Assembly Language Programming Manual
//     mentions these opcodes or flags, and Intel never published them later.
//     The instructions were documented by Sehnhardt and Sorensen in Electronics
//     magazine, January 1979.
//
// Where no source states a behaviour, nothing is updated here rather than
// guessing: ARHL and the rotates leave K alone, and DAD leaves K alone.
void setVKFlags(State8085 *state, uint8_t carryIn, uint8_t carryOut, uint8_t res)
{
	state->cc.v = (carryIn ^ carryOut) & 1;
	state->cc.k = state->cc.v ^ ((res & 0x80) ? 1 : 0);
}

// DAD runs the same carry chain sixteen bits wide, so V is 16-bit signed
// overflow. K is left alone: no source documents DAD touching it.
void setDadV(State8085 *state, uint32_t lhs, uint32_t rhs, uint32_t res)
{
	uint8_t carryIn = (((lhs & 0x7fff) + (rhs & 0x7fff)) >> 15) & 1;
	state->cc.v = carryIn ^ ((res >> 16) & 1);
}

void UnimplementedInstruction(State8085 *state)
{
	// PC will have advanced one, so undo that
	printf("Error: Unimplemented instruction\n");
	state->pc--;
	Disassemble8085Op(state->memory, state->pc);
	printf("\n");
	exit(1);
}

void InvalidInstruction(State8085 *state)
{
	//pc will have advanced one, so undo that
	printf("Error: Invalid instruction\n");
	printf("PC: %u\n", state->pc);
	printf("Memory at PC: %u\n", mem_read(state, state->pc));
	state->pc--;
	exit(1);
}

uint8_t addByte(State8085 *state, uint8_t lhs, uint8_t rhs, should_preserve_carry preserveCarry)
{
	uint16_t res = lhs + rhs;
	state->cc.ac = (lhs & 0xf) + (rhs & 0xf) > 0xf;
	setVKFlags(state, ((lhs & 0x7f) + (rhs & 0x7f)) >> 7, res >> 8, (uint8_t)res);
	ArithFlagsA(state, res, preserveCarry);
	return (uint8_t)res;
}

uint8_t addByteWithCarry(State8085 *state, uint8_t lhs, uint8_t rhs, should_preserve_carry preserveCarry)
{
    uint8_t carry = state->cc.cy ? 1 : 0;
	uint16_t res = lhs + rhs + carry;
	state->cc.ac = (lhs & 0xf) + (rhs & 0xf) + carry > 0xf;
	setVKFlags(state, ((lhs & 0x7f) + (rhs & 0x7f) + carry) >> 7, res >> 8, (uint8_t)res);
	ArithFlagsA(state, res, preserveCarry);
	return (uint8_t)res;
}

uint8_t subtractByte(State8085 *state, uint8_t lhs, uint8_t rhs, should_preserve_carry preserveCarry)
{
	uint16_t res = lhs - rhs;
	// The 8085 subtracts by adding the one's complement of rhs plus one.
	// AC is the carry out of bit 3 from that addition. Keep the +1 outside
	// the nibble mask: folding it into (~rhs + 1) loses the carry whenever
	// rhs has a zero low nibble (for example, 42H - 10H).
	state->cc.ac = (lhs & 0xf) + ((~rhs) & 0xf) + 1 > 0xf;
	setVKFlags(state, ((lhs & 0x7f) + ((uint8_t)~rhs & 0x7f) + 1) >> 7,
	           ((uint16_t)lhs + (uint8_t)~rhs + 1) >> 8, (uint8_t)res);
	ArithFlagsA(state, res, preserveCarry);
	return (uint8_t)res;
}

uint8_t subtractByteWithBorrow(State8085 *state, uint8_t lhs, uint8_t rhs, should_preserve_carry preserveCarry)
{
	uint16_t res = lhs - rhs - (state->cc.cy ? 1 : 0);
    uint8_t carry = state->cc.cy ? 1 : 0;
	// A - rhs - borrow is A + ~rhs + (1 - borrow). This is the same
	// carry-chain model used below for V/K and avoids dropping the bit-3
	// carry when masking the complemented operand to a nibble.
	state->cc.ac = (lhs & 0x0f) + ((~rhs) & 0x0f) + (1 - carry) > 0x0f;
	setVKFlags(state, ((lhs & 0x7f) + ((uint8_t)~rhs & 0x7f) + (1 - carry)) >> 7,
	           ((uint16_t)lhs + (uint8_t)~rhs + (1 - carry)) >> 8, (uint8_t)res);
	ArithFlagsA(state, res, preserveCarry);
	return (uint8_t)res;
}

void call(State8085 *state, uint16_t offset, uint16_t addr)
{
	uint16_t pc = state->pc + 2;
	mem_write(state, (uint16_t)(state->sp - 1), (pc >> 8) & 0xff);
	mem_write(state, (uint16_t)(state->sp - 2), (pc & 0xff));
	state->sp = state->sp - 2;
	state->pc = addr;
}

void returnToCaller(State8085 *state, uint16_t offset)
{
	state->pc = (mem_read(state, state->sp) | (mem_read(state, (uint16_t)(state->sp + 1)) << 8));
	state->sp += 2;
}

void rst(State8085 *state, uint8_t rst_number, uint8_t half)
{
    uint16_t pc = state->pc;  // PC has already been incremented by Emulate8085Op
    mem_write(state, (uint16_t)(state->sp - 1), (pc >> 8) & 0xff);
    mem_write(state, (uint16_t)(state->sp - 2), (pc & 0xff));
    state->sp = state->sp - 2;
    state->pc = rst_number * 8 + half * 4;
}

// Samples the interrupt inputs as the devices on the bus are driving them.
//
// RST 5.5 and 6.5 are level sensitive: the input simply is whatever the device
// is asserting, so a device that has stopped asking is no longer pending. That
// is what stops one keypress being read over and over. RST 7.5 latches on an
// edge and TRAP latches when it arrives, so both are set here and cleared by
// the processor when it takes them.
//
// With no devices mapped the fields keep whatever was written to them, which is
// how the simulator has always let a caller raise an interrupt by hand.
static void sampleInterruptLines(State8085 *state)
{
    uint8_t lines = state->bus.device_count ? bus_irq(&state->bus) : 0;

    // RST 5.5 and 6.5 are levels, and a pin is high if anything is driving it.
    // Taking the devices' output alone would drop a line a caller had asserted
    // by hand, which is what happens the moment any device is attached.
    state->pending_r5 = (uint8_t)(state->host_r5 || (lines & IRQ_RST55));
    state->pending_r6 = (uint8_t)(state->host_r6 || (lines & IRQ_RST65));

    // RST 7.5 latches on a rising edge. Setting the latch while the line is
    // merely still high would re-arm it after every service, turning one edge
    // into an interrupt on each pass round the caller's loop.
    uint8_t r75 = (uint8_t)((lines & IRQ_RST75) ? 1 : 0);
    if (r75 && !state->dev_r75) state->r7_latch = 1;
    state->dev_r75 = r75;
    if (state->host_r75) {
        state->r7_latch = 1;
        state->host_r75 = 0;
    }

    // TRAP latches when it arrives, from either source.
    if (lines & IRQ_TRAP) state->pending_trap = 1;
    if (state->host_trap) {
        state->pending_trap = 1;
        state->host_trap = 0;
    }
}

void checkInterrupts(State8085 *state)
{
    sampleInterruptLines(state);

    // TRAP is non-maskable and is recognized regardless of INTE. The caller
    // separately protects the execution of DI and EI themselves, as required
    // by the Intel manual.
    if (state->pending_trap) {
        state->pending_trap = 0;
        state->trap_ie_copy = state->int_enable;
        state->trap_ie_valid = 1;
        state->int_enable = 0;
        state->ei_delay = 0;
        rst(state, 4, 1); // RST 4.5 = 0x24
        return;
    }

    if (state->int_enable == 0 || state->ei_delay != 0)
        return;

    // Highest maskable priority first

    if (state->r7_latch && !state->r7_mask) {
        state->r7_latch = 0;
        state->int_enable = 0;
        state->ei_delay = 0;
        rst(state, 7, 1); // RST 7.5 = 0x3C
        return;
    }

    if (state->pending_r6 && !state->r6_mask) {
        state->int_enable = 0;
        state->ei_delay = 0;
        rst(state, 6, 1); // RST 6.5 = 0x34
        return;
    }

    if (state->pending_r5 && !state->r5_mask) {
        state->int_enable = 0;
        state->ei_delay = 0;
        rst(state, 5, 1); // RST 5.5 = 0x2C
        return;
    }
}

extern void io_write(int address, int value);

int Emulate8085Op(State8085 *state, uint16_t offset, ExecutionStats8085 *stats)
{
	if (offset == state->pc) {
		state->sp = 0xFFFF;
    }

    // No interrupt, including TRAP, may interrupt DI or EI itself. Peek at
    // the next opcode before allowing recognition; checkInterrupts may change
    // PC to a vector, so the opcode pointer is built afterwards.
    uint8_t next_opcode = mem_read(state, state->pc);
    if (next_opcode != 0xf3 && next_opcode != 0xfb)
        checkInterrupts(state);

    uint8_t current_opcode = mem_read(state, state->pc);

    int states = 4; // default fallback
    int done = 0;

	// Disassemble8085Op(state->memory, state->pc);

	state->pc += 1;
	// Where this instruction's operand bytes live. They are fetched through
	// the bus only when the instruction actually has them, so a one-byte
	// instruction never reads the two addresses that follow it.
	uint16_t operand_pc = state->pc;

	switch (current_opcode)
	{
	case 0x00: // NOP
		break;
	case 0x01: // LXI B,word
		state->c = mem_read(state, operand_pc);
		state->b = mem_read(state, (uint16_t)(operand_pc + 1));
		state->pc += 2;
		states = 10;
		break;
	case 0x02: // STAX B
		mem_write(state, (state->b << 8) | state->c, state->a);
        states = 7;
		break;
	case 0x03: // INX B
		state->c++;
		if (state->c == 0)
			state->b++;
		state->cc.k = (state->b == 0 && state->c == 0);
        states = 6;
		break;
	case 0x04: //INR B
		state->b = addByte(state, state->b, 1, PRESERVE_CARRY);
        states = 4;
		break;
	case 0x05: //DCR B
		state->b = subtractByte(state, state->b, 1, PRESERVE_CARRY);
        states = 4;
		break;
	case 0x06: // MVI B, byte
		state->b = mem_read(state, operand_pc);
		state->pc++;
        states = 7;
		break;
	case 0x07: //RLC
	{
		uint8_t x = state->a;
		state->a = ((x & 0x80) >> 7) | (x << 1);
		state->cc.cy = (1 == ((x & 0x80) >> 7));
		state->cc.v = ((x >> 7) ^ (x >> 6)) & 1;
        states = 4;
	}
	break;
	case 0x08: // DSUB (undocumented): HL = HL - BC
	{
		// Dehnhardt and Sorensen, who first published these opcodes
		// (Electronics, January 1979), list DSUB as affecting Z, S, P, CY, AC,
		// X5 and V — every flag. The 8085 performs it as two byte subtractions
		// through the same ALU, so the surviving S, P, AC, CY, V and K are
		// those of the high-byte pass, while Z covers the full 16-bit result.
		// MAME's core additionally leaves parity untouched and clears K; the
		// primary source is followed here instead.
		uint16_t lowResult = (uint16_t)(state->l - state->c);
		uint8_t resLow = lowResult & 0xff;
		uint8_t borrow = (lowResult >> 8) & 1;
		state->l = resLow;

		uint16_t highResult = (uint16_t)(state->h - state->b - borrow);
		uint8_t resHigh = highResult & 0xff;
		state->cc.cy = (highResult >> 8) & 1;
		state->cc.ac = ((state->h ^ resHigh ^ state->b) & 0x10) != 0;
		state->cc.s = (resHigh & 0x80) != 0;
		state->cc.p = parity(resHigh, 8);
		state->cc.v = (((state->b ^ state->h) & (state->h ^ resHigh) & 0x80) != 0);
		state->cc.k = state->cc.v ^ (state->cc.s ? 1 : 0);
		state->h = resHigh;

		state->cc.z = ((state->h | state->l) == 0);
        states = 10;
	}
	break;
	case 0x09: // DAD B
	{
		uint32_t hl = (state->h << 8) | state->l;
		uint32_t bc = (state->b << 8) | state->c;
		uint32_t res = hl + bc;
		state->h = (res & 0xff00) >> 8;
		state->l = res & 0xff;
		state->cc.cy = ((res & 0xffff0000) > 0);
		setDadV(state, hl, bc, res);
        states = 10;
	}
	break;
	case 0x0a: //LDAX B
	{
		uint16_t offset = (state->b << 8) | state->c;
		state->a = mem_read(state, offset);
        states = 7;
	}
	break;
	case 0x0b: //DCX B
		state->c--;
		if (state->c == 0xFF)
			state->b--;
		state->cc.k = (state->b == 0xff && state->c == 0xff);
        states = 6;
		break;
	case 0x0c: //INR C
	{
		state->c = addByte(state, state->c, 1, PRESERVE_CARRY);
        states = 4;
	}
	break;
	case 0x0d: //DCR    C
		state->c = subtractByte(state, state->c, 1, PRESERVE_CARRY);
        states = 4;
		break;
	case 0x0e: // MVI C, byte
		state->c = mem_read(state, operand_pc);
		state->pc++;
        states = 7;
		break;
	case 0x0f: //RRC
	{
		uint8_t x = state->a;
		state->a = ((x & 1) << 7) | (x >> 1);
		state->cc.cy = (1 == (x & 1));
		state->cc.v = 0;
        states = 4;
	}
	break;
	case 0x10: // ARHL (undocumented): HL >>= 1, arithmetic, sign preserved
	{
		uint16_t hl = (state->h << 8) | state->l;
		state->cc.cy = hl & 0x1;
		hl = (hl >> 1) | (hl & 0x8000);
		state->h = (hl >> 8) & 0xff;
		state->l = hl & 0xff;
        states = 7;
	}
	break;
	case 0x11: //LXI	D,word
		state->e = mem_read(state, operand_pc);
		state->d = mem_read(state, (uint16_t)(operand_pc + 1));
		state->pc += 2;
		states = 10;
		break;
	case 0x12:  // STAX D
		mem_write(state, (state->d << 8) + state->e, state->a);
        states = 7;
		break;
	case 0x13: //INX    D
		state->e++;
		if (state->e == 0)
			state->d++;
		state->cc.k = (state->d == 0 && state->e == 0);
        states = 6;
		break;
	case 0x14: //INR D
		state->d = addByte(state, state->d, 1, PRESERVE_CARRY);
        states = 4;
		break;
	case 0x15: //DCR D
		state->d = subtractByte(state, state->d, 1, PRESERVE_CARRY);
        states = 4;
		break;
	case 0x16: // MVI D, byte
		state->d = mem_read(state, operand_pc);
		state->pc++;
        states = 7;
		break;
	case 0x17: // RAL
	{
		uint8_t x = state->a;
		state->a = state->cc.cy | (x << 1);
		state->cc.cy = (1 == ((x & 0x80) >> 7));
		state->cc.v = ((x >> 7) ^ (x >> 6)) & 1;
        states = 4;
	}
	break;
	case 0x18: // RDEL (undocumented): rotate DE left through carry
	{
		uint16_t de = (state->d << 8) | state->e;
		uint8_t carryOut = (de & 0x8000) ? 1 : 0;
		uint16_t res = (de << 1) | (state->cc.cy ? 1 : 0);
		state->cc.cy = carryOut;
		state->cc.v = carryOut ^ ((de & 0x4000) ? 1 : 0);
		state->d = (res >> 8) & 0xff;
		state->e = res & 0xff;
        states = 10;
	}
	break;
	case 0x19: //DAD D
	{
		uint32_t hl = (state->h << 8) | state->l;
		uint32_t de = (state->d << 8) | state->e;
		uint32_t res = hl + de;
		state->h = (res & 0xff00) >> 8;
		state->l = res & 0xff;
		state->cc.cy = ((res & 0xffff0000) != 0);
		setDadV(state, hl, de, res);
        states = 10;
	}
	break;
	case 0x1a: //LDAX D
	{
		uint16_t offset = (state->d << 8) | state->e;
		state->a = mem_read(state, offset);
        states = 7;
	}
	break;
	case 0x1b: //DCX D
		state->e--;
		if (state->e == 0xFF)
			state->d--;
		state->cc.k = (state->d == 0xff && state->e == 0xff);
        states = 6;
		break;
	case 0x1c: //INR E
		state->e = addByte(state, state->e, 1, PRESERVE_CARRY);
        states = 4;
		break;
	case 0x1d: //DCR E
		state->e = subtractByte(state, state->e, 1, PRESERVE_CARRY);
        states = 4;
		break;
	case 0x1e: //MVI E, byte
		state->e = mem_read(state, operand_pc);
		state->pc++;
        states = 7;
		break;
	case 0x1f: // RAR
	{
		uint8_t x = state->a;
		state->a = (x >> 1) | (state->cc.cy << 7); /* From a number with higest bit as carry value */
		state->cc.cy = (1 == (x & 1));
		state->cc.v = 0;
        states = 4;
	}
	break;
	case 0x20: // RIM
    {
        uint8_t result = 0;

        // D7 is SID (not currently modelled); D6-D4 are pending
        // RST7.5/RST6.5/RST5.5 requests, D3 is IE, and D2-D0 are masks.
        // Keeping the masks in the low three bits makes RIM -> set MSE -> SIM
        // a lossless read-modify-write sequence.
        result |= (state->r7_latch ? 1 : 0) << 6;
        result |= (state->pending_r6 ? 1 : 0) << 5;
        result |= (state->pending_r5 ? 1 : 0) << 4;
        uint8_t reported_ie = state->trap_ie_valid ? state->trap_ie_copy : state->int_enable;
        result |= (reported_ie ? 1 : 0) << 3;
        result |= (state->r7_mask ? 1 : 0) << 2;
        result |= (state->r6_mask ? 1 : 0) << 1;
        result |= (state->r5_mask ? 1 : 0) << 0;

        state->a = result;
        state->trap_ie_valid = 0;
        states = 4;
    }
    break;
	case 0x21: // LXI H,word
		state->l = mem_read(state, operand_pc);
		state->h = mem_read(state, (uint16_t)(operand_pc + 1));
		state->pc += 2;
		states = 10;
		break;
	case 0x22: //SHLD word
	{
		uint16_t offset = (mem_read(state, (uint16_t)(operand_pc + 1)) << 8) | mem_read(state, operand_pc);
		mem_write(state, offset, state->l);
		mem_write(state, (uint16_t)(offset + 1), state->h);
		state->pc += 2;
        states = 16;
	}
	break;
	case 0x23: //INX H
		state->l++;
		if (state->l == 0)
			state->h++;
		state->cc.k = (state->h == 0 && state->l == 0);
        states = 6;
		break;
	case 0x24: //INR H
		state->h = addByte(state, state->h, 1, PRESERVE_CARRY);
        states = 4;
		break;
	break;
	case 0x25: //DCR H
		state->h = subtractByte(state, state->h, 1, PRESERVE_CARRY);
        states = 4;
		break;
	case 0x26: //MVI H, byte
		state->h = mem_read(state, operand_pc);
		state->pc++;
        states = 7;
		break;
	case 0x27: // DAA
	{
		uint8_t accBeforeAdjust = state->a;
		uint16_t res = state->a;
		// printf("value of a %d\n", res);

		uint8_t least_four_bits = state->a & 0x0f;
		// printf("least four bits %d\n", least_four_bits);

		// DAA is the one instruction whose auxiliary carry reports the carry
		// out of bit 3 of the adjustment itself. When no six is added to the
		// low nibble there is no half-carry, so AC is cleared rather than left
		// holding whatever the previous instruction put there.
		uint8_t half_carry = 0;
		if (state->cc.ac == 1 || least_four_bits > 9) {
		    // printf("Adding 6 to a\n");
			res = state->a + 6;

    		half_carry = (least_four_bits + 6) > 0xf;
		}
		state->cc.ac = half_carry;

		// DAA only ever sets the carry; a carry already standing on entry
		// survives the instruction, so it is tracked here rather than being
		// recomputed from the result.
		uint8_t carry_out = state->cc.cy;
		if (res > 0xff) {
		    // printf("Setting carry flag\n");
    		carry_out = 1;
		}

		res = res & 0xff;

		least_four_bits = res & 0x0f;
		uint8_t most_four_bits = (res >> 4) & 0x0f;

		if (carry_out == 1 || most_four_bits > 9) {
		    // printf("Adding 6 to high bits %d\n", res);
    		res = ((uint16_t)(most_four_bits + 6) << 4) | least_four_bits;
		}

		if (res > 0xff)
			carry_out = 1;

		// printf("Final value %d\n", res);
		{
			uint8_t adjustment = (uint8_t)(res - accBeforeAdjust);
			setVKFlags(state, ((accBeforeAdjust & 0x7f) + (adjustment & 0x7f)) >> 7,
			           ((uint16_t)accBeforeAdjust + adjustment) >> 8, (uint8_t)res);
		}
		ArithFlagsA(state, res, PRESERVE_CARRY);
		state->cc.cy = carry_out;
		state->a = (uint8_t)res;
        states = 4;
	}
	break;
	case 0x28: // LDHI d8 (undocumented): DE = HL + d8
	{
		uint16_t res = ((state->h << 8) | state->l) + mem_read(state, operand_pc);
		state->d = (res >> 8) & 0xff;
		state->e = res & 0xff;
		state->pc++;
        states = 10;
	}
	break;
	case 0x29: // DAD H
	{
		uint32_t hl = (state->h << 8) | state->l;
		uint32_t res = hl + hl;
		state->h = (res & 0xff00) >> 8;
		state->l = res & 0xff;
		state->cc.cy = ((res & 0xffff0000) != 0);
		setDadV(state, hl, hl, res);
        states = 10;
	}
	break;
	case 0x2a: // LHLD Addr
	{
		uint16_t offset = (mem_read(state, (uint16_t)(operand_pc + 1)) << 8) | (mem_read(state, operand_pc));
		uint8_t l = mem_read(state, offset);
		uint8_t h = mem_read(state, (uint16_t)(offset + 1));
		uint16_t v = h << 8 | l;
		state->h = v >> 8 & 0xFF;
		state->l = v & 0xFF;
		state->pc += 2;
        states = 16;
	}
	break;
	case 0x2b: //DCX H
		state->l--;
		if (state->l == 0xFF)
			state->h--;
		state->cc.k = (state->h == 0xff && state->l == 0xff);
        states = 6;
		break;
	case 0x2c: //INR L
		state->l = addByte(state, state->l, 1, PRESERVE_CARRY);
        states = 4;
		break;
	break;
	case 0x2d: //DCR L
		state->l = subtractByte(state, state->l, 1, PRESERVE_CARRY);
        states = 4;
		break;
	case 0x2e: // MVI L,byte
		state->l = mem_read(state, operand_pc);
		state->pc++;
        states = 7;
		break;
	case 0x2f: // CMA
		state->a ^= 0xFF;
        states = 4;
		break;
	case 0x30:  // SIM
    {
        uint8_t acc = state->a;

        // Bit 6: SDE (Serial Data Enable)
        // Bit 7: SOD (Serial Output Data)
        if ((acc & 0x40) != 0) { // SDE bit set
            uint8_t sod = (acc & 0x80) ? 1 : 0;
            state->sod_line = sod;
            // TODO Notify on SOD line
        }

        // Bit 4: Reset RST 7.5 latch (edge-triggered flip-flop)
        if (acc & 0x10) {
            state->r7_latch = 0; // Clear the latched interrupt
        }

        // Bit 3: MSE (Mask Set Enable)
        if (acc & 0x08) {
            state->r7_mask = (acc >> 2) & 1; // Bit 2 → RST 7.5
            state->r6_mask = (acc >> 1) & 1; // Bit 1 → RST 6.5
            state->r5_mask = (acc >> 0) & 1; // Bit 0 → RST 5.5
        }

        states = 4;
    }
    break;
	case 0x31: // LXI SP, word
		state->sp = (mem_read(state, (uint16_t)(operand_pc + 1)) << 8) | mem_read(state, operand_pc);
		state->pc += 2;
        states = 10;
		break;
	case 0x32: // STA word
	{
		uint16_t offset = (mem_read(state, (uint16_t)(operand_pc + 1)) << 8) | (mem_read(state, operand_pc));
		mem_write(state, offset, state->a);
		state->pc += 2;
        states = 13;
	}
	break;
	case 0x33: // INX SP
		state->sp++;
		state->cc.k = (state->sp == 0);
        states = 6;
		break;
	case 0x34: // INR M
	{
		uint16_t offset = (state->h << 8) | state->l;
		mem_write(state, offset, addByte(state, mem_read(state, offset), 1, PRESERVE_CARRY));
        states = 10;
	}
	break;
	case 0x35: // DCR M
	{
		uint16_t offset = (state->h << 8) | state->l;
		mem_write(state, offset, subtractByte(state, mem_read(state, offset), 1, PRESERVE_CARRY));
        states = 10;
	}
	break;
	case 0x36: // MVI M, byte
	{
		//AC set if lower nibble of h was zero prior to dec
		uint16_t offset = (state->h << 8) | state->l;
		mem_write(state, offset, mem_read(state, operand_pc));
		state->pc++;
        states = 10;
	}
	break;
	case 0x37:
		state->cc.cy = 1;
        states = 4;
		break; // STC
	case 0x38: // LDSI d8 (undocumented): DE = SP + d8
	{
		uint16_t res = state->sp + mem_read(state, operand_pc);
		state->d = (res >> 8) & 0xff;
		state->e = res & 0xff;
		state->pc++;
        states = 10;
	}
	break;
	case 0x39: // DAD SP
	{
		uint16_t hl = (state->h << 8) | state->l;
		uint16_t sp = state->sp;
		uint32_t res = hl + sp;
		state->h = (res & 0xff00) >> 8;
		state->l = res & 0xff;
		state->cc.cy = ((res & 0xffff0000) > 0);
		setDadV(state, hl, sp, res);
        states = 10;
	}
	break;
		break;
	case 0x3a: // LDA word
	{
		uint16_t offset = (mem_read(state, (uint16_t)(operand_pc + 1)) << 8) | (mem_read(state, operand_pc));
		state->a = mem_read(state, offset);
		state->pc += 2;
        states = 13;
	}
	break;
	case 0x3b: // DCX SP
		state->sp--;
		state->cc.k = (state->sp == 0xffff);
        states = 6;
		break;
	case 0x3c: // INR A
		state->a = addByte(state, state->a, 1, PRESERVE_CARRY);
        states = 4;
		break;
	case 0x3d: // DCR A
		state->a = subtractByte(state, state->a, 1, PRESERVE_CARRY);
        states = 4;
		break;
	case 0x3e: // MVI A, byte
		state->a = mem_read(state, operand_pc);
		state->pc++;
        states = 7;
		break;
	case 0x3f: // CMC
		if (0 == state->cc.cy)
			state->cc.cy = 1;
		else
			state->cc.cy = 0;
        states = 4;
		break;
	case 0x40:
		state->b = state->b;
        states = 4;
		break; // MOV B, B
	case 0x41:
		state->b = state->c;
        states = 4;
		break; // MOV B, C
	case 0x42:
		state->b = state->d;
        states = 4;
		break; // MOV B, D
	case 0x43:
		state->b = state->e;
        states = 4;
		break; // MOV B, E
	case 0x44:
		state->b = state->h;
        states = 4;
		break; // MOV B, H
	case 0x45:
		state->b = state->l;
        states = 4;
		break; // MOV B, L
	case 0x46: // MOV B, M
	{
		uint16_t offset = (state->h << 8) | (state->l);
		state->b = mem_read(state, offset);
        states = 7;
	}
	break;
	case 0x47:
		state->b = state->a;
        states = 4;
		break; // MOV B, A
	case 0x48:
		state->c = state->b;
        states = 4;
		break; // MOV C, B
	case 0x49:
		state->c = state->c;
        states = 4;
		break; // MOV C, C
	case 0x4a:
		state->c = state->d;
        states = 4;
		break; // MOV C, D
	case 0x4b:
		state->c = state->e;
        states = 4;
		break; // MOV C, E
	case 0x4c:
		state->c = state->h;
        states = 4;
		break; // MOV C, H
	case 0x4d:
		state->c = state->l;
        states = 4;
		break; // MOV C, L
	case 0x4e: // MOV C, M
	{
		uint16_t offset = (state->h << 8) | (state->l);
		state->c = mem_read(state, offset);
        states = 7;
	}
	break;
	case 0x4f:
		state->c = state->a;
        states = 4;
		break; // MOV C, A
	case 0x50:
		state->d = state->b;
        states = 4;
		break; // MOV D, B
	case 0x51: // MOV D, C
		state->d = state->c;
        states = 4;
		break;
	case 0x52: // MOV D, D
		state->d = state->d;
        states = 4;
		break;
	case 0x53: // MOV D, E
		state->d = state->e;
        states = 4;
		break;
	case 0x54:
		state->d = state->h;
        states = 4;
		break; // MOV D, H
	case 0x55:
		state->d = state->l;
        states = 4;
		break; // MOV D, B
	case 0x56: // MOV D, M
	{
		uint16_t offset = (state->h << 8) | (state->l);
		state->d = mem_read(state, offset);
        states = 7;
	}
	break;
	case 0x57:
		state->d = state->a;
        states = 4;
		break; // MOV D, A
	case 0x58:
		state->e = state->b;
        states = 4;
		break; // MOV E, B
	case 0x59:
		state->e = state->c;
        states = 4;
		break; // MOV E, C
	case 0x5a:
		state->e = state->d;
        states = 4;
		break; // MOV E, D
	case 0x5b:
		state->e = state->e;
        states = 4;
		break; // MOV E, E
	case 0x5c:
		state->e = state->h;
        states = 4;
		break; // MOV E, H
	case 0x5d:
		state->e = state->l;
        states = 4;
		break; // MOV E, L
	case 0x5e: // MOV E, M
	{
		uint16_t offset = (state->h << 8) | (state->l);
		state->e = mem_read(state, offset);
        states = 7;
	}
	break;
	case 0x5f:
		state->e = state->a;
        states = 4;
		break; // MOV E, A
	case 0x60:
		state->h = state->b;
        states = 4;
		break; // MOV H, B
	case 0x61:
		state->h = state->c;
        states = 4;
		break; // MOV H, C
	case 0x62:
		state->h = state->d;
        states = 4;
		break; // MOV H, D
	case 0x63:
		state->h = state->e;
        states = 4;
		break; // MOV H, E
	case 0x64:
		state->h = state->h;
        states = 4;
		break; // MOV H, H
	case 0x65:
		state->h = state->l;
        states = 4;
		break; // MOV H, L
	case 0x66: // MOV H, M
	{
		uint16_t offset = (state->h << 8) | (state->l);
		state->h = mem_read(state, offset);
        states = 7;
	}
	break;
	case 0x67:
		state->h = state->a;
        states = 4;
		break; // MOV H, A
	case 0x68:
		state->l = state->b;
        states = 4;
		break; // MOV L, B
	case 0x69:
		state->l = state->c;
        states = 4;
		break; // MOV L, C
	case 0x6a:
		state->l = state->d;
        states = 4;
		break; // MOV L, D
	case 0x6b:
		state->l = state->e;
        states = 4;
		break; // MOV L, E
	case 0x6c:
		state->l = state->h;
        states = 4;
		break; // MOV L, H
	case 0x6d:
		state->l = state->l;
        states = 4;
		break; // MOV L, L
	case 0x6e: // MOV L, M
	{
		uint16_t offset = (state->h << 8) | (state->l);
		state->l = mem_read(state, offset);
        states = 7;
	}
	break;
	case 0x6f:
		state->l = state->a;
        states = 4;
		break; // MOV L, A
	case 0x70: // MOV M, B
	{
		uint16_t offset = (state->h << 8) | (state->l);
		mem_write(state, offset, state->b);
        states = 7;
	}
	break;
	case 0x71: // MOV M, C
	{
		uint16_t offset = (state->h << 8) | (state->l);
		mem_write(state, offset, state->c);
        states = 7;
	}
	break;
	case 0x72: // MOV M, D
	{
		uint16_t offset = (state->h << 8) | (state->l);
		mem_write(state, offset, state->d);
        states = 7;
	}
	break;
	case 0x73: // MOV M, E
	{
		uint16_t offset = (state->h << 8) | (state->l);
		mem_write(state, offset, state->e);
        states = 7;
	}
	break;
	case 0x74: // MOV M, H
	{
		uint16_t offset = (state->h << 8) | (state->l);
		mem_write(state, offset, state->h);
        states = 7;
	}
	break;
	case 0x75: // MOV M, L
	{
		uint16_t offset = (state->h << 8) | (state->l);
		mem_write(state, offset, state->l);
        states = 7;
	}
	break;
	case 0x76:  // HLT
        states = 5;
        // TODO Add delay right here.
		done = 1;
		break;
	case 0x77: // MOV M, A
	{
		uint16_t offset = (state->h << 8) | (state->l);
		mem_write(state, offset, state->a);
        states = 7;
	}
	break;
	case 0x78:
		state->a = state->b;
        states = 4;
		break; // MOV A, B
	case 0x79:
		state->a = state->c;
        states = 4;
		break; // MOV A, C
	case 0x7a:
		state->a = state->d;
        states = 4;
		break; // MOV A, D
	case 0x7b:
		state->a = state->e;
        states = 4;
		break; // MOV A, E
	case 0x7c:
		state->a = state->h;
        states = 4;
		break; // MOV A, H
	case 0x7d:
		state->a = state->l;
        states = 4;
		break; // MOV A, L
	case 0x7e: // MOV A, M
	{
		uint16_t offset = (state->h << 8) | (state->l);
		state->a = mem_read(state, offset);
        states = 7;
	}
	break;
	case 0x7f:
		state->a = state->a;
        states = 4;
		break; // MOV A, A
	case 0x80: // ADD B
		state->a = addByte(state, state->a, state->b, UPDATE_CARRY);
        states = 4;
		break;
	case 0x81: // ADD C
		state->a = addByte(state, state->a, state->c, UPDATE_CARRY);
        states = 4;
		break;
	case 0x82: // ADD D
		state->a = addByte(state, state->a, state->d, UPDATE_CARRY);
        states = 4;
		break;
	case 0x83: // ADD E
		state->a = addByte(state, state->a, state->e, UPDATE_CARRY);
        states = 4;
		break;
	case 0x84: // ADD H
		state->a = addByte(state, state->a, state->h, UPDATE_CARRY);
        states = 4;
		break;
	case 0x85: // ADD L
		state->a = addByte(state, state->a, state->l, UPDATE_CARRY);
        states = 4;
		break;
	case 0x86: // ADD M
	{
		uint16_t offset = (state->h << 8) | (state->l);
		state->a = addByte(state, state->a, mem_read(state, offset), UPDATE_CARRY);
        states = 7;
	}
	break;
	case 0x87: // ADD A
		state->a = addByte(state, state->a, state->a, UPDATE_CARRY);
        states = 4;
		break;
	case 0x88: // ADC B
		state->a = addByteWithCarry(state, state->a, state->b, UPDATE_CARRY);
        states = 4;
		break;
	case 0x89: // ADC C
		state->a = addByteWithCarry(state, state->a, state->c, UPDATE_CARRY);
        states = 4;
		break;
	break;
	case 0x8a: // ADC D
		state->a = addByteWithCarry(state, state->a, state->d, UPDATE_CARRY);
        states = 4;
		break;
	case 0x8b: // ADC E
		state->a = addByteWithCarry(state, state->a, state->e, UPDATE_CARRY);
        states = 4;
		break;
	case 0x8c: // ADC H
		state->a = addByteWithCarry(state, state->a, state->h, UPDATE_CARRY);
        states = 4;
		break;
	case 0x8d: // ADC L
		state->a = addByteWithCarry(state, state->a, state->l, UPDATE_CARRY);
        states = 4;
		break;
	case 0x8e: // ADC M
	{
		uint16_t offset = (state->h << 8) | (state->l);
		state->a = addByteWithCarry(state, state->a, mem_read(state, offset), UPDATE_CARRY);
        states = 7;
	}
	break;
	case 0x8f: // ADC A
		state->a = addByteWithCarry(state, state->a, state->a, UPDATE_CARRY);
        states = 4;
		break;
	case 0x90: // SUB B
		state->a = subtractByte(state, state->a, state->b, UPDATE_CARRY);
		break;
	case 0x91: // SUB C
		state->a = subtractByte(state, state->a, state->c, UPDATE_CARRY);
		break;
	case 0x92: // SUB D
		state->a = subtractByte(state, state->a, state->d, UPDATE_CARRY);
		break;
	case 0x93: // SUB E
		state->a = subtractByte(state, state->a, state->e, UPDATE_CARRY);
		break;
	case 0x94: // SUB H
		state->a = subtractByte(state, state->a, state->h, UPDATE_CARRY);
		break;
	case 0x95: // SUB L
		state->a = subtractByte(state, state->a, state->l, UPDATE_CARRY);
		break;
	case 0x96: // SUB M
	{
		uint16_t offset = (state->h << 8) | (state->l);
		state->a = subtractByte(state, state->a, mem_read(state, offset), UPDATE_CARRY);
        states = 7;
	}
	break;
	case 0x97: // SUB A
		state->a = subtractByte(state, state->a, state->a, UPDATE_CARRY);
		break;
	case 0x98: // SBB B
		state->a = subtractByteWithBorrow(state, state->a, state->b, UPDATE_CARRY);
        states = 4;
		break;
	case 0x99: // SBB C
		state->a = subtractByteWithBorrow(state, state->a, state->c, UPDATE_CARRY);
        states = 4;
		break;
	case 0x9a: // SBB D
		state->a = subtractByteWithBorrow(state, state->a, state->d, UPDATE_CARRY);
        states = 4;
		break;
	case 0x9b: // SBB E
		state->a = subtractByteWithBorrow(state, state->a, state->e, UPDATE_CARRY);
        states = 4;
		break;
	case 0x9c: // SBB H
		state->a = subtractByteWithBorrow(state, state->a, state->h, UPDATE_CARRY);
        states = 4;
		break;
	case 0x9d: // SBB L
		state->a = subtractByteWithBorrow(state, state->a, state->l, UPDATE_CARRY);
        states = 4;
		break;
	case 0x9e: // SBB M
	{
		uint16_t offset = (state->h << 8) | (state->l);
		state->a = subtractByteWithBorrow(state, state->a, mem_read(state, offset), UPDATE_CARRY);
        states = 7;
	}
	break;
	case 0x9f: // SBB A
		state->a = subtractByteWithBorrow(state, state->a, state->a, UPDATE_CARRY);
        states = 4;
		break;
	case 0xa0: // ANA B
		ana(state, state->b);
        states = 4;
		break;
	case 0xa1: // ANA C
		ana(state, state->c);
        states = 4;
		break;
	case 0xa2: // ANA D
		ana(state, state->d);
        states = 4;
		break;
	case 0xa3: // ANA E
		ana(state, state->e);
        states = 4;
		break;
	case 0xa4: // ANA H
		ana(state, state->h);
        states = 4;
		break;
	case 0xa5: // ANA L
		ana(state, state->l);
        states = 4;
		break;
	case 0xa6: // ANA M
	{
		uint16_t offset = (state->h << 8) | (state->l);
		ana(state, mem_read(state, offset));
        states = 7;
	}
	break;
	case 0xa7: // ANA A
		ana(state, state->a);
        states = 4;
		break;
	case 0xa8:
		state->a = state->a ^ state->b;
		LogicFlagsA(state, 0);
		break; // XRA B
	case 0xa9:
		state->a = state->a ^ state->c;
		LogicFlagsA(state, 0);
		break; // XRA C
	case 0xaa:
		state->a = state->a ^ state->d;
		LogicFlagsA(state, 0);
		break; // XRA D
	case 0xab:
		state->a = state->a ^ state->e;
		LogicFlagsA(state, 0);
		break; // XRA E
	case 0xac:
		state->a = state->a ^ state->h;
		LogicFlagsA(state, 0);
		break; // XRA H
	case 0xad:
		state->a = state->a ^ state->l;
		LogicFlagsA(state, 0);
		break; // XRA L
	case 0xae: // XRA M
	{
		uint16_t offset = (state->h << 8) | (state->l);
		state->a = state->a ^ mem_read(state, offset);
		LogicFlagsA(state, 0);
        states = 7;
	}
	break;
	case 0xaf:
		state->a = state->a ^ state->a;
		LogicFlagsA(state, 0);
		break; // XRA A
	case 0xb0:
		state->a = state->a | state->b;
		LogicFlagsA(state, 0);
        states = 4;
		break; // ORA B
	case 0xb1:
		state->a = state->a | state->c;
		LogicFlagsA(state, 0);
        states = 4;
		break; // ORA C
	case 0xb2:
		state->a = state->a | state->d;
		LogicFlagsA(state, 0);
        states = 4;
		break; // ORA D
	case 0xb3:
		state->a = state->a | state->e;
		LogicFlagsA(state, 0);
        states = 4;
		break; // ORA E
	case 0xb4:
		state->a = state->a | state->h;
		LogicFlagsA(state, 0);
        states = 4;
		break; // ORA H
	case 0xb5: // ORA L
		state->a = state->a | state->l;
		LogicFlagsA(state, 0);
        states = 4;
		break;
	case 0xb6: // ORA M
	{
		uint16_t offset = (state->h << 8) | (state->l);
		state->a = state->a | mem_read(state, offset);
		LogicFlagsA(state, 0);
        states = 7;
	}
	break;
	case 0xb7: // ORA A
		state->a = state->a | state->a;
		LogicFlagsA(state, 0);
        states = 4;
		break;
	case 0xb8: // CMP B
		subtractByte(state, state->a, state->b, UPDATE_CARRY);
        states = 4;
		break;
	case 0xb9: // CMP C
		subtractByte(state, state->a, state->c, UPDATE_CARRY);
        states = 4;
		break;
	case 0xba: // CMP D
		subtractByte(state, state->a, state->d, UPDATE_CARRY);
        states = 4;
		break;
	case 0xbb: // CMP E
		subtractByte(state, state->a, state->e, UPDATE_CARRY);
        states = 4;
		break;
	case 0xbc: // CMP H
		subtractByte(state, state->a, state->h, UPDATE_CARRY);
        states = 4;
		break;
	case 0xbd: // CMP L
		subtractByte(state, state->a, state->l, UPDATE_CARRY);
        states = 4;
		break;
	case 0xbe: // CMP M
	{
		uint16_t offset = (state->h << 8) | (state->l);
		subtractByte(state, state->a, mem_read(state, offset), UPDATE_CARRY);
        states = 7;
	}
	break;
	case 0xbf: // CMP A
		subtractByte(state, state->a, state->a, UPDATE_CARRY);
        states = 4;
		break;
	case 0xc0: // RNZ
        states = 6;
		if (0 == state->cc.z) {
            states = 12;
			returnToCaller(state, offset);
        }
		break;
	case 0xc1: // POP B
	{
		state->c = mem_read(state, state->sp);
		state->b = mem_read(state, (uint16_t)(state->sp + 1));
		state->sp += 2;
        states = 10;
	}
	break;
	case 0xc2: // JNZ Addr
		if (0 == state->cc.z) {
			state->pc = ((mem_read(state, (uint16_t)(operand_pc + 1)) << 8) | mem_read(state, operand_pc));
            states = 10;
        }
		else {
			state->pc += 2;
            states = 7;
        }
		break;
	case 0xc3: // JMP Addr
		state->pc = ((mem_read(state, (uint16_t)(operand_pc + 1)) << 8) | mem_read(state, operand_pc));
        states = 10;
		break;
	case 0xc4: // CNZ Addr
		if (0 == state->cc.z)
		{
			call(state, offset, (mem_read(state, (uint16_t)(operand_pc + 1)) << 8) | mem_read(state, operand_pc));
            states = 18;
		}
		else {
			state->pc += 2;
            states = 9;
		}
		break;
	case 0xc5: // PUSH   B
	{
		mem_write(state, (uint16_t)(state->sp - 1), state->b);
		mem_write(state, (uint16_t)(state->sp - 2), state->c);
		state->sp = state->sp - 2;
        states = 12;
	}
	break;
	case 0xc6: // ADI byte
		state->a = addByte(state, state->a, mem_read(state, operand_pc), UPDATE_CARRY);
		state->pc++;
        states = 7;
		break;
	case 0xc7: // RST 0
        rst(state, 0, 0);
        states = 12;
		break;
	case 0xc8: // RZ
        states = 6;
		if (1 == state->cc.z) {
            states = 12;
			returnToCaller(state, offset);
        }
		break;
	case 0xc9: // RET
		returnToCaller(state, offset);
        states = 10;
		break;
	case 0xca: // JZ Addr
		if (1 == state->cc.z) {
			state->pc = ((mem_read(state, (uint16_t)(operand_pc + 1)) << 8) | mem_read(state, operand_pc));
            states = 10;
        }
		else {
			state->pc += 2;
            states = 7;
        }
		break;
	case 0xcb: // RSTV (undocumented): RST 8 (0x0040) when V is set
        states = 6;
		if (1 == state->cc.v) {
			rst(state, 8, 0);
            states = 12;
        }
		break;
	case 0xcc: // CZ Addr
		if (1 == state->cc.z) {
			call(state, offset, (mem_read(state, (uint16_t)(operand_pc + 1)) << 8) | mem_read(state, operand_pc));
            states = 18;
        }
		else {
			state->pc += 2;
            states = 9;
        }
		break;
	case 0xcd: // CALL Addr
		call(state, offset, (mem_read(state, (uint16_t)(operand_pc + 1)) << 8) | mem_read(state, operand_pc));
        states = 18;
		break;
	case 0xce: // ACI d8
		state->a = addByteWithCarry(state, state->a, mem_read(state, operand_pc), UPDATE_CARRY);
		state->pc++;
        states = 7;
		break;
	case 0xcf: // RST 1
        rst(state, 1, 0);
        states = 12;
		break;
	case 0xd0: // RNC
        states = 6;
		if (0 == state->cc.cy) {
			returnToCaller(state, offset);
            states = 12;
        }
		break;
	case 0xd1: // POP D
	{
		state->e = mem_read(state, state->sp);
		state->d = mem_read(state, (uint16_t)(state->sp + 1));
		state->sp += 2;
        states = 10;
	}
	break;
	case 0xd2: // JNC Addr
		if (0 == state->cc.cy) {
			state->pc = ((mem_read(state, (uint16_t)(operand_pc + 1)) << 8) | mem_read(state, operand_pc));
            states = 10;
        }
		else {
			state->pc += 2;
            states = 7;
        }
		break;
	case 0xd3: // OUT d8
        bus_port_write(&state->bus, mem_read(state, operand_pc), state->a);
        state->pc += 1;
        states = 10;
        io_write(mem_read(state, operand_pc), state->a);
        break;
	case 0xd4: // CNC Addr
		if (0 == state->cc.cy) {
			call(state, offset, (mem_read(state, (uint16_t)(operand_pc + 1)) << 8) | mem_read(state, operand_pc));
            states = 18;
        }
		else {
			state->pc += 2;
            states = 9;
        }
		break;
	case 0xd5: //PUSH   D
	{
		mem_write(state, (uint16_t)(state->sp - 1), state->d);
		mem_write(state, (uint16_t)(state->sp - 2), state->e);
		state->sp = state->sp - 2;
        states = 12;
	}
	break;
	case 0xd6: // SUI d8
		state->a = subtractByte(state, state->a, mem_read(state, operand_pc), UPDATE_CARRY);
		state->pc++;
        states = 7;
		break;
	case 0xd7: // RST 2
        rst(state, 2, 0);
        states = 12;
		break;
	case 0xd8: // RC
        states = 6;
		if (1 == state->cc.cy) {
            states = 12;
			returnToCaller(state, offset);
        }
		break;
	case 0xd9: // SHLX (undocumented): store HL at (DE)
	{
		uint16_t addr = (state->d << 8) | state->e;
		mem_write(state, addr, state->l);
		mem_write(state, (uint16_t)(addr + 1), state->h);
        states = 10;
	}
	break;
	case 0xda: // JC Addr
		if (1 == state->cc.cy) {
			state->pc = ((mem_read(state, (uint16_t)(operand_pc + 1)) << 8) | mem_read(state, operand_pc));
            states = 10;
        }
		else {
			state->pc += 2;
            states = 7;
        }
		break;
	case 0xdb: // IN d8
        state->a = bus_port_read(&state->bus, mem_read(state, operand_pc));
        state->pc++;
        states = 10;
        break;
	case 0xdc: // CC Addr
		if (1 == state->cc.cy) {
			call(state, offset, (mem_read(state, (uint16_t)(operand_pc + 1)) << 8) | mem_read(state, operand_pc));
            states = 18;
        }
		else {
			state->pc += 2;
            states = 9;
        }
		break;
	case 0xdd: // JNX5 (undocumented): jump when K is clear
		if (0 == state->cc.k) {
			state->pc = ((mem_read(state, (uint16_t)(operand_pc + 1)) << 8) | mem_read(state, operand_pc));
            states = 10;
        }
		else {
			state->pc += 2;
            states = 7;
        }
		break;
	case 0xde: // SBI d8
		state->a = subtractByteWithBorrow(state, state->a, mem_read(state, operand_pc), UPDATE_CARRY);
		state->pc++;
        states = 7;
		break;
	case 0xdf: // RST 3
        rst(state, 3, 0);
        states = 12;
		break;
	case 0xe0: // RPO
        states = 6;
		if (0 == state->cc.p) {
            states = 12;
			returnToCaller(state, offset);
        }
		break;
	case 0xe1: // POP H
	{
		state->l = mem_read(state, state->sp);
		state->h = mem_read(state, (uint16_t)(state->sp + 1));
		state->sp += 2;
        states = 10;
	}
	break;
	case 0xe2: // JPO Addr
		if (0 == state->cc.p) {
			state->pc = ((mem_read(state, (uint16_t)(operand_pc + 1)) << 8) | mem_read(state, operand_pc));
            states = 10;
        }
		else {
			state->pc += 2;
            states = 7;
        }
		break;
	case 0xe3: // XTHL
	{
		uint16_t spL = mem_read(state, state->sp);
		uint16_t spH = mem_read(state, (uint16_t)(state->sp + 1));
		mem_write(state, state->sp, state->l);
		mem_write(state, (uint16_t)(state->sp + 1), state->h);
		state->h = spH;
		state->l = spL;
        states = 16;
	}
	break;
	case 0xe4: // CPO Addr
		if (0 == state->cc.p) {
			call(state, offset, (mem_read(state, (uint16_t)(operand_pc + 1)) << 8) | mem_read(state, operand_pc));
            states = 18;
        }
		else {
			state->pc += 2;
            states = 9;
        }
		break;
	case 0xe5: // PUSH H
	{
		mem_write(state, (uint16_t)(state->sp - 1), state->h);
		mem_write(state, (uint16_t)(state->sp - 2), state->l);
		state->sp = state->sp - 2;
        states = 12;
	}
	break;
	case 0xe6: // ANI byte
	{
		ana(state, mem_read(state, operand_pc));
		state->pc++;
        states = 7;
	}
	break;
	case 0xe7: // RST 4
        rst(state, 4, 0);
        states = 12;
		break;
	case 0xe8: // RPE
        states = 6;
		if (1 == state->cc.p) {
            states = 12;
			returnToCaller(state, offset);
        }
		break;
	case 0xe9: // PCHL
		state->pc = (state->h << 8) | state->l;
        states = 6;
		break;
	case 0xea: // JPE Addr
		if (1 == state->cc.p) {
			state->pc = ((mem_read(state, (uint16_t)(operand_pc + 1)) << 8) | mem_read(state, operand_pc));
            states = 10;
        }
		else {
			state->pc += 2;
            states = 7;
        }
		break;
	case 0xeb: // XCHG
	{
		uint8_t save1 = state->d;
		uint8_t save2 = state->e;
		state->d = state->h;
		state->e = state->l;
		state->h = save1;
		state->l = save2;
        states = 4;
	}
	break;
	case 0xec: // CPE Addr
		if (1 == state->cc.p) {
			call(state, offset, (mem_read(state, (uint16_t)(operand_pc + 1)) << 8) | mem_read(state, operand_pc));
            states = 18;
        }
		else {
			state->pc += 2;
            states = 9;
        }
		break;
	case 0xed: // LHLX (undocumented): load HL from (DE)
	{
		uint16_t addr = (state->d << 8) | state->e;
		state->l = mem_read(state, addr);
		state->h = mem_read(state, (uint16_t)(addr + 1));
        states = 10;
	}
	break;
	case 0xee: // XRI d8
		state->a = state->a ^ mem_read(state, operand_pc);
		LogicFlagsA(state, 0);
		state->pc++;
        states = 7;
		break;
	case 0xef: // RST 5
        rst(state, 5, 0);
        states = 12;
		break;
	case 0xf0: // RP
        states = 6;
		if (0 == state->cc.s) {
            states = 12;
			returnToCaller(state, offset);
        }
		break;
	case 0xf1: //POP PSW
	{
        // Step 1: Restore the condition flags from the current stack pointer location
        uint8_t psw = mem_read(state, state->sp);

        // Step 2: Extract the condition flags from the PSW byte
        state->cc.cy = (psw & 0x01);  // Carry flag (bit 0)
        state->cc.v = i8080_compat ? 0 : (psw & 0x02) >> 1;  // Overflow flag (bit 1, undocumented)
        state->cc.p = (psw & 0x04) >> 2;  // Parity flag (bit 2)
        state->cc.k = i8080_compat ? 0 : (psw & 0x20) >> 5;  // K flag (bit 5, undocumented)
        state->cc.ac = (psw & 0x10) >> 4;  // Auxiliary carry flag (bit 4)
        state->cc.z = (psw & 0x40) >> 6;  // Zero flag (bit 6)
        state->cc.s = (psw & 0x80) >> 7;  // Sign flag (bit 7)

        // Step 3: Increment the stack pointer to the next memory location
        state->sp++;

        // Step 4: Restore the accumulator from the new stack pointer location
        state->a = mem_read(state, state->sp);

        // Step 5: Increment the stack pointer again
        state->sp++;

        states = 10;
	}
	break;
	case 0xf2: // JP Addr
		if (0 == state->cc.s) {
			state->pc = ((mem_read(state, (uint16_t)(operand_pc + 1)) << 8) | mem_read(state, operand_pc));
            states = 10;
        }
		else {
			state->pc += 2;
            states = 7;
        }
		break;
	case 0xf3: // DI
		state->int_enable = 0;
        state->ei_delay = 0;
        states = 4;
		break;
	case 0xf4: // CP Addr
		if (0 == state->cc.s) {
			call(state, offset, (mem_read(state, (uint16_t)(operand_pc + 1)) << 8) | mem_read(state, operand_pc));
            states = 18;
        }
		else {
			state->pc += 2;
            states = 9;
        }
		break;
	case 0xf5: // PUSH PSW
	{
        // Step 1: Decrement the stack pointer
        state->sp--;

        // Step 2: Store the accumulator at the new stack pointer location
        mem_write(state, state->sp, state->a);

        // Step 3: Decrement the stack pointer again
        state->sp--;

        // Step 4: Construct the PSW byte (format: s z k ac 0 p v c)
        // On the 8080 bits 5 and 1 are not flags at all: bit 5 reads 0 and bit
        // 1 reads 1. The 8085 reuses them for the undocumented K and V flags.
        uint8_t bit5 = i8080_compat ? 0 : state->cc.k;
        uint8_t bit1 = i8080_compat ? 1 : state->cc.v;
        uint8_t psw = (state->cc.s << 7) |  // Sign flag (bit 7)
                      (state->cc.z << 6) |  // Zero flag (bit 6)
                      (bit5 << 5) |         // K flag (bit 5, undocumented)
                      (state->cc.ac << 4) | // Auxiliary carry (bit 4)
                      (0 << 3) |            // Bit 3 is always 0
                      (state->cc.p << 2) |  // Parity flag (bit 2)
                      (bit1 << 1) |         // Overflow flag (bit 1, undocumented)
                      (state->cc.cy);       // Carry flag (bit 0)

        // Step 5: Store the PSW byte at the new stack pointer location
        mem_write(state, state->sp, psw);

        states = 12;
	}
	break;
	case 0xf6: // ORI d8
		state->a = state->a | mem_read(state, operand_pc);
		LogicFlagsA(state, 0);
		state->pc++;
        states = 7;
		break;
	case 0xf7: // RST 6
        rst(state, 6, 0);
        states = 12;
		break;
	case 0xf8: // RM
        states = 6;
		if (1 == state->cc.s) {
			returnToCaller(state, offset);
            states = 12;
        }
		break;
	case 0xf9: // SPHL
		state->sp = (state->h << 8) | state->l;
        states = 6;
		break;
	case 0xfa: // JM Addr
		if (1 == state->cc.s) {
			state->pc = ((mem_read(state, (uint16_t)(operand_pc + 1)) << 8) | mem_read(state, operand_pc));
            states = 10;
        }
		else {
			state->pc += 2;
            states = 7;
        }
		break;

	case 0xfb: // EI
        // Interrupts become enabled only after the following instruction.
        // checkInterrupts also blocks maskable recognition while this delay
        // is nonzero.
        state->ei_delay = 1;
        states = 4;
		break;
	case 0xfc: // CM Addr
		if (1 == state->cc.s) {
			call(state, offset, (mem_read(state, (uint16_t)(operand_pc + 1)) << 8) | mem_read(state, operand_pc));
            states = 18;
        }
		else {
			state->pc += 2;
            states = 9;
        }
		break;
	case 0xfd: // JX5 (undocumented): jump when K is set
		if (1 == state->cc.k) {
			state->pc = ((mem_read(state, (uint16_t)(operand_pc + 1)) << 8) | mem_read(state, operand_pc));
            states = 10;
        }
		else {
			state->pc += 2;
            states = 7;
        }
		break;
	case 0xfe: // CPI d8
		// The manual documents CPI as affecting Z, S, P, CY and AC, and
		// describes the comparison as an internal subtraction — the same one
		// CMP performs. Sharing subtractByte keeps the two consistent and
		// picks up the undocumented V and K with them; the result is
		// discarded, since a comparison leaves the accumulator alone.
		subtractByte(state, state->a, mem_read(state, operand_pc), UPDATE_CARRY);
		state->pc++;
        states = 7;
		break;
	case 0xff: // RST 7
        rst(state, 7, 0);
        states = 12;
		break;
	}

    if (!stats->min_sp_set || state->sp < stats->min_sp) {
        stats->min_sp = state->sp;
        stats->min_sp_set = true;
    }

    stats->total_tstates += states;
    // The devices see the same clock the processor does.
    if (state->bus.device_count) bus_tick(&state->bus, (uint32_t)states);

    if (state->ei_delay != 0 && current_opcode != 0xfb) {
        state->ei_delay--;
        if (state->ei_delay == 0)
            state->int_enable = 1;
    }

	return done;
}

State8085 *Init8085(void)
{
	State8085 *state = calloc(1, sizeof(State8085));
	// Cleared rather than merely allocated: an address nobody has written to
	// has to read as something defined, and the machine below is all RAM.
	state->memory = calloc(1, 0x10000); // 64K
	state->io = calloc(1, 0x100);

	// The default machine is 64K of RAM and no peripherals, which is what
	// sim8085 has always been. A board with ROM or devices remaps pages over
	// the top of this.
	bus_map_flat_ram(&state->bus, state->memory);
	bus_map_ports(&state->bus, state->io);
    state->pending_r5 = 0;
    state->pending_r6 = 0;
    state->r7_latch = 0;
	printf("State Ptr: %p\n", state);
	printf("Memory Ptr: %p\n", state->memory);
	printf("IO Ptr: %p\n", state->io);
	return state;
}

State8085 *LoadProgram(State8085 *state, uint8_t *lines, int numLines, uint16_t offset)
{
    for (int i = 0; i < numLines; i++) {
        uint8_t data = lines[i * 4]; // Data value
        uint8_t lowByte = lines[(i * 4) + 1];        // Low byte of the address
        uint8_t highByte = lines[(i * 4) + 2];       // High byte of the address
        uint16_t currentAddress = (highByte << 8) | lowByte;
        uint8_t kind = lines[(i * 4) + 2]; // Kind (1 for code, 2 for addr, 3 for data)

        // printf("Loading %u (kind %u) at address %u\n", data, kind, currentAddress);

        // Load the data into memory at the correct address
        state->memory[currentAddress] = data;
    }

    return state;
}

State8085 *UnloadProgram(State8085 *state, uint8_t *lines, int numLines, uint16_t offset)
{
    for (int i = 0; i < numLines; i++) {
        // Extract the address from the lines array
        uint8_t lowByte = lines[(i * 4) + 1];        // Low byte of the address
        uint8_t highByte = lines[(i * 4) + 2];       // High byte of the address
        uint16_t currentAddress = (highByte << 8) | lowByte;

        // Set the memory at the current address to 0
        state->memory[currentAddress] = 0;
    }

    return state;
}

// State8085 *LoadProgram(State8085 *state, uint8_t *lines, int len, uint16_t offset)
// {
// 	int i = 0;
// 	while (i < len)
// 	{
// 		printf("line %d %u\n", i, lines[i]);
// 		state->memory[offset + i] = lines[i];
// 		i++;
// 	}
// 	printf("Offset %u\n", offset);
// 	printf("Memory at offset %u\n", state->memory[offset]);
// 	return state;
// }

int ExecuteProgramUntil(State8085 *state, uint16_t offset, uint16_t startAt, uint16_t pauseAt)
{
	int done = 0;
    ExecutionStats8085 stats = {0};
	printf("Start At: %d\n", startAt);
	printf("Offset: %d\n", offset);
	if(offset == startAt)
		state->sp = 0xFFFF;
	state->pc = startAt;
    stats.min_sp = state->sp;
    stats.min_sp_set = true;
	printf("Pause At: %d\n", pauseAt);
	while (done == 0 && state->pc < pauseAt)
	{
		done = Emulate8085Op(state, offset, &stats);
		printf("PC in C %d", state->pc);
	}
    last_total_tstates = stats.total_tstates;
    last_start_sp = 0xFFFF;
    last_min_sp = stats.min_sp;
    // if (sim_options.timing_enabled) {
    //     float t_state_duration_ms = 1000.0f / sim_options.clock_frequency_hz;
    //     float delay_ms = stats.total_tstates * t_state_duration_ms;
    //     printf("\nSleeping for %f, states = %llu, clock = %f", delay_ms, stats.total_tstates, sim_options.clock_frequency_hz);
    //     emscripten_sleep((int)delay_ms);
    // }
	printf("%c", state->cc.z ? 'z' : '.');
	printf("%c", state->cc.s ? 's' : '.');
	printf("%c", state->cc.p ? 'p' : '.');
	printf("%c", state->cc.cy ? 'c' : '.');
	printf("%c  ", state->cc.ac ? 'a' : '.');
	printf("A $%02x B $%02x C $%02x D $%02x E $%02x H $%02x L $%02x SP %04x PC %04x\n", state->a, state->b, state->c,
		   state->d, state->e, state->h, state->l, state->sp, state->pc);
	return done;
}

State8085 *ExecuteProgram(State8085 *state, uint16_t offset)
{
	int done = 0;
	int cycles = 0;
    ExecutionStats8085 stats = {0};

	printf("State Ptr: %p, SP Ptr: %p\n", state, &state->sp);
	printf("Offset %u\n", offset);
	state->pc = offset;
	state->sp = 0xFFFF;
    stats.min_sp = state->sp;
    stats.min_sp_set = true;
	printf("Memory at offset %u\n", mem_read(state, offset));
	printf("Memory at offset + 1 %u\n", mem_read(state, offset + 1));

	while (done == 0)
	{
		if (cycles > 100000)
			exit(2);
		done = Emulate8085Op(state, offset, &stats);
		cycles++;
	}
    last_total_tstates = stats.total_tstates;
    last_start_sp = 0xFFFF;
    last_min_sp = stats.min_sp;

    // if (sim_options.timing_enabled) {
    //     float t_state_duration_ms = 1000.0f / sim_options.clock_frequency_hz;
    //     float delay_ms = stats.total_tstates * t_state_duration_ms;
    //     emscripten_sleep((int)delay_ms);
    // }

	printf("%c", state->cc.z ? 'z' : '.');
	printf("%c", state->cc.s ? 's' : '.');
	printf("%c", state->cc.p ? 'p' : '.');
	printf("%c", state->cc.cy ? 'c' : '.');
	printf("%c  ", state->cc.ac ? 'a' : '.');
	printf("A $%02x B $%02x C $%02x D $%02x E $%02x H $%02x L $%02x SP %04x PC %04x\n", state->a, state->b, state->c,
		   state->d, state->e, state->h, state->l, state->sp, state->pc);
	return state;
}

typedef struct {
    int halted;
    int total_tstates;
} SliceResult;

void ExecuteProgramSlice(State8085 *state, int offset, uint16_t sliceSize, SliceResult* resultOut)
{
	int done = 0;
    ExecutionStats8085 stats = {0};

    if (offset >= 0) {
        state->pc = offset;
        state->sp = 0xFFFF;
        last_start_sp = state->sp;
        last_min_sp = state->sp;
        stats.min_sp = state->sp;
        stats.min_sp_set = true;
    }

	while (done == 0 && stats.total_tstates < sliceSize)
	{
        if (state->hlt_enable == 1) {
            state->hlt_enable = 0;
            done = 1;
        } else {
            done = Emulate8085Op(state, offset, &stats);
        }
	}

    // if (sim_options.timing_enabled) {
    //     float t_state_duration_ms = 1000.0f / sim_options.clock_frequency_hz;
    //     float delay_ms = stats.total_tstates * t_state_duration_ms;
    //     emscripten_sleep((int)delay_ms);
    // }

	printf("%c", state->cc.z ? 'z' : '.');
	printf("%c", state->cc.s ? 's' : '.');
	printf("%c", state->cc.p ? 'p' : '.');
	printf("%c", state->cc.cy ? 'c' : '.');
	printf("%c  ", state->cc.ac ? 'a' : '.');
	printf("A $%02x B $%02x C $%02x D $%02x E $%02x H $%02x L $%02x SP %04x PC %04x\n", state->a, state->b, state->c,
		   state->d, state->e, state->h, state->l, state->sp, state->pc);
	// return done;
    resultOut->halted = done;
    resultOut->total_tstates = stats.total_tstates;
    if (stats.min_sp_set && stats.min_sp < last_min_sp) {
        last_min_sp = stats.min_sp;
    }
}

int InterruptToHalt(State8085 *state) {
    state->hlt_enable = 1;
    return 1;
}

uint8_t *getMemory(State8085 *state) { return state->memory; }

// ---------------------------------------------------------------------------
// The SDK-85.
//
// A board is a different machine, not a mode of this one, so attaching it
// remaps the bus wholesale: ROM where the monitor goes, RAM where the 8155 is,
// and the 8279 in between. detachSDK85 puts the plain 64K machine back.
// ---------------------------------------------------------------------------

// Nothing may cross a change of machine: a line a departed device was driving,
// or a latch it caused, is not the new machine's business.
static void clearInterruptPins(State8085 *state) {
	state->host_trap = 0;
	state->host_r5 = 0;
	state->host_r6 = 0;
	state->host_r75 = 0;
	state->dev_r75 = 0;
	state->pending_trap = 0;
	state->pending_r5 = 0;
	state->pending_r6 = 0;
	state->r7_latch = 0;
}

EMSCRIPTEN_KEEPALIVE
int attachSDK85(State8085 *state) {
	if (!state->board) {
		state->board = calloc(1, sizeof(SDK85));
		if (!state->board) return 0;
	}
	// sdk85_attach resets the parts, so an attach always starts a cold board.
	sdk85_attach((SDK85 *)state->board, &state->bus, state->memory, state->io);
	clearInterruptPins(state);
	state->machine = MACHINE_SDK85;
	return 1;
}

EMSCRIPTEN_KEEPALIVE
void detachSDK85(State8085 *state) {
	bus_map_flat_ram(&state->bus, state->memory);
	bus_map_ports(&state->bus, state->io);
	// The board keeps its allocation but not its state: a key queued on a
	// machine that is no longer attached must not reappear on the next one.
	if (state->board) {
		i8279_reset(&((SDK85 *)state->board)->keyboard);
		i8155_reset(&((SDK85 *)state->board)->support);
	}
	clearInterruptPins(state);
	state->machine = MACHINE_PLAIN;
}

// True when an SDK-85 is the machine in use, which is what the calls below
// require -- having a board allocated is not the same thing.
static int onSDK85(State8085 *state) {
	return state->machine == MACHINE_SDK85 && state->board != 0;
}

// Queues a keypress. Returns 0 if the 8279's FIFO is full, which is what the
// real part does with a key it has no room for.
EMSCRIPTEN_KEEPALIVE
int sdk85PressKey(State8085 *state, int code) {
	if (!onSDK85(state)) return 0;
	return i8279_press(&((SDK85 *)state->board)->keyboard, (uint8_t)code);
}

// The display RAM. Six of its sixteen bytes are wired to digits on an SDK-85,
// and each is the segment pattern the monitor sent, complemented.
EMSCRIPTEN_KEEPALIVE
uint8_t *sdk85Display(State8085 *state) {
	return onSDK85(state) ? ((SDK85 *)state->board)->keyboard.display : 0;
}

// How many keys are waiting to be read, so a caller can tell whether the
// machine has caught up before sending another.
EMSCRIPTEN_KEEPALIVE
int sdk85PendingKeys(State8085 *state) {
	return onSDK85(state) ? ((SDK85 *)state->board)->keyboard.count : 0;
}
uint8_t *getIO(State8085 *state) { return state->io; }

int triggerInterrupt(State8085 *state, int code, int active)
{
    // These drive the pins, not the processor's pending state, so that a
    // device driving the same line cannot overwrite them or be overwritten.
    switch (code) {
        case 45:
            state->host_trap = active;
            break;
        case 55:
            state->host_r5 = active;
            break;
        case 65:
            state->host_r6 = active;
            break;
        case 75:
            if (active == 1) {
                state->host_r75 = 1; // only on rising edge
            }
            break;
        default:
            printf("Unknown interrupt code: %d\n", code);
            break;
    }
    return state->int_enable;
}
