#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>

typedef struct Flags
{
	uint8_t z : 1;
	uint8_t s : 1;
	uint8_t p : 1;
	uint8_t cy : 1;
	uint8_t ac : 1;
	uint8_t pad : 3;
} Flags;

Flags CC_ZSPAC = {0, 0, 0, 0, 0};

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
	uint8_t *memory;
	uint8_t *io;
} State8085;

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
		printf("NOP");
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
		printf("NOP");
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
		printf("NOP");
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
		printf("NOP");
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
		printf("NOP");
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
		printf("NOP");
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
		printf("JMP    $%02x%02x", code[2], code[1]);
		opbytes = 3;
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
		printf("RET");
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
		printf("CALL   $%02x%02x", code[2], code[1]);
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
		printf("CALL   $%02x%02x", code[2], code[1]);
		opbytes = 3;
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
		printf("CALL   $%02x%02x", code[2], code[1]);
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

	return opbytes;
}

typedef enum { PRESERVE_CARRY, UPDATE_CARRY } should_preserve_carry;

void LogicFlagsA(State8085 *state, uint8_t ac)
{
    // Verified in OpenSimH code, that both
    // carry and aux carry are reset.
	state->cc.cy = 0;
	state->cc.ac = 0;
	state->cc.z = (state->a == 0);
	state->cc.s = (0x80 == (state->a & 0x80));
	state->cc.p = parity(state->a, 8);
}

void ArithFlagsA(State8085 *state, uint16_t res, should_preserve_carry preserveCarry)
{
	if (preserveCarry == UPDATE_CARRY)
		state->cc.cy = (res > 0xff);
	state->cc.z = ((res & 0xff) == 0);
	state->cc.s = (0x80 == (res & 0x80));
	state->cc.p = parity(res & 0xff, 8);
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
	printf("Memory at PC: %u\n", state->memory[state->pc]);
	state->pc--;
	exit(1);
}

uint8_t addByte(State8085 *state, uint8_t lhs, uint8_t rhs, should_preserve_carry preserveCarry)
{
	uint16_t res = lhs + rhs;
	state->cc.ac = (lhs & 0xf) + (rhs & 0xf) > 0xf;
	ArithFlagsA(state, res, preserveCarry);
	return (uint8_t)res;
}

uint8_t addByteWithCarry(State8085 *state, uint8_t lhs, uint8_t rhs, should_preserve_carry preserveCarry)
{
    uint8_t carry = state->cc.cy ? 1 : 0;
	uint16_t res = lhs + rhs + carry;
	state->cc.ac = (lhs & 0xf) + (rhs & 0xf) + carry > 0xf;
	ArithFlagsA(state, res, preserveCarry);
	return (uint8_t)res;
}

uint8_t subtractByte(State8085 *state, uint8_t lhs, uint8_t rhs, should_preserve_carry preserveCarry)
{
	uint16_t res = lhs - rhs;
	state->cc.ac = (lhs & 0xf) + ((~rhs + 1) & 0xf) > 0xf;
	ArithFlagsA(state, res, preserveCarry);
	return (uint8_t)res;
}

uint8_t subtractByteWithBorrow(State8085 *state, uint8_t lhs, uint8_t rhs, should_preserve_carry preserveCarry)
{
	uint16_t res = lhs - rhs - (state->cc.cy ? 1 : 0);
    uint8_t carry = state->cc.cy ? 1 : 0;
    state->cc.ac = (lhs & 0x0F) + ((~(rhs + carry) + 1) & 0x0f) > 0x0f;
	ArithFlagsA(state, res, preserveCarry);
	return (uint8_t)res;
}

void call(State8085 *state, uint16_t offset, uint16_t addr)
{
	uint16_t pc = state->pc + 2;
	state->memory[state->sp - 1] = (pc >> 8) & 0xff;
	state->memory[state->sp - 2] = (pc & 0xff);
	state->sp = state->sp - 2;
	state->pc = addr;
}

void returnToCaller(State8085 *state, uint16_t offset)
{
	state->pc = (state->memory[state->sp] | (state->memory[state->sp + 1] << 8));
	state->sp += 2;
}

int Emulate8085Op(State8085 *state, uint16_t offset)
{
	int cycles = 4;
	unsigned char *opcode = &state->memory[state->pc];
	// printf("Emulating instruction at $%02x\n", state->pc);
	// printf("Emulating instruction $%02x\n", state->memory[state->pc]);
	if(offset == state->pc)
		state->sp = 0xFFFF;

	// Disassemble8085Op(state->memory, state->pc);

	state->pc += 1;

	switch (state->memory[state->pc - 1])
	{
	case 0x00:
		break; //NOP
	case 0x01: //LXI	B,word
		state->c = opcode[1];
		state->b = opcode[2];
		state->pc += 2;
		break;
	case 0x02: //STAX B
		state->memory[(state->b << 8) | state->c] = state->a;
		break;
	case 0x03: //INX B
		state->c++;
		if (state->c == 0)
			state->b++;
		break;
	case 0x04: //INR B
		state->b = addByte(state, state->b, 1, PRESERVE_CARRY);
		break;
	case 0x05: //DCR B
		state->b = subtractByte(state, state->b, 1, PRESERVE_CARRY);
		break;
	case 0x06: // MVI B, byte
		state->b = opcode[1];
		state->pc++;
		break;
	case 0x07: //RLC
	{
		uint8_t x = state->a;
		state->a = ((x & 0x80) >> 7) | (x << 1);
		state->cc.cy = (1 == ((x & 0x80) >> 7));
	}
	break;
	case 0x08:
		InvalidInstruction(state);
		break;
	case 0x09: // DAD B
	{
		uint32_t hl = (state->h << 8) | state->l;
		uint32_t bc = (state->b << 8) | state->c;
		uint32_t res = hl + bc;
		state->h = (res & 0xff00) >> 8;
		state->l = res & 0xff;
		state->cc.cy = ((res & 0xffff0000) > 0);
	}
	break;
	case 0x0a: //LDAX B
	{
		uint16_t offset = (state->b << 8) | state->c;
		state->a = state->memory[offset];
	}
	break;
	case 0x0b: //DCX B
		state->c--;
		if (state->c == 0xFF)
			state->b--;
		break;
	case 0x0c: //INR C
	{
		state->c = addByte(state, state->c, 1, PRESERVE_CARRY);
	}
	break;
	case 0x0d: //DCR    C
		state->c = subtractByte(state, state->c, 1, PRESERVE_CARRY);
		break;
	case 0x0e: // MVI C, byte
		state->c = opcode[1];
		state->pc++;
		break;
	case 0x0f: //RRC
	{
		uint8_t x = state->a;
		state->a = ((x & 1) << 7) | (x >> 1);
		state->cc.cy = (1 == (x & 1));
	}
	break;
	case 0x10:
		InvalidInstruction(state);
		break;
	case 0x11: //LXI	D,word
		state->e = opcode[1];
		state->d = opcode[2];
		state->pc += 2;
		break;
	case 0x12:  // STAX D
		state->memory[(state->d << 8) + state->e] = state->a;
		break;
	case 0x13: //INX    D
		state->e++;
		if (state->e == 0)
			state->d++;
		break;
	case 0x14: //INR D
		state->d = addByte(state, state->d, 1, PRESERVE_CARRY);
		break;
	case 0x15: //DCR D
		state->d = subtractByte(state, state->d, 1, PRESERVE_CARRY);
		break;
	case 0x16: // MVI D, byte
		state->d = opcode[1];
		state->pc++;
		break;
	case 0x17: // RAL
	{
		uint8_t x = state->a;
		state->a = state->cc.cy | (x << 1);
		state->cc.cy = (1 == ((x & 0x80) >> 7));
	}
	break;
	case 0x18:
		InvalidInstruction(state);
		break;
	case 0x19: //DAD D
	{
		uint32_t hl = (state->h << 8) | state->l;
		uint32_t de = (state->d << 8) | state->e;
		uint32_t res = hl + de;
		state->h = (res & 0xff00) >> 8;
		state->l = res & 0xff;
		state->cc.cy = ((res & 0xffff0000) != 0);
	}
	break;
	case 0x1a: //LDAX D
	{
		uint16_t offset = (state->d << 8) | state->e;
		state->a = state->memory[offset];
	}
	break;
	case 0x1b: //DCX D
		state->e--;
		if (state->e == 0xFF)
			state->d--;
		break;
	case 0x1c: //INR E
		state->e = addByte(state, state->e, 1, PRESERVE_CARRY);
		break;
	case 0x1d: //DCR E
		state->e = subtractByte(state, state->e, 1, PRESERVE_CARRY);
		break;
	case 0x1e: //MVI E, byte
		state->e = opcode[1];
		state->pc++;
		break;
	case 0x1f: // RAR
	{
		uint8_t x = state->a;
		state->a = (x >> 1) | (state->cc.cy << 7); /* From a number with higest bit as carry value */
		state->cc.cy = (1 == (x & 1));
	}
	break;
	case 0x20:
		UnimplementedInstruction(state);
		break; //RIM
	case 0x21: //LXI	H,word
		state->l = opcode[1];
		state->h = opcode[2];
		state->pc += 2;
		break;
	case 0x22: //SHLD word
	{
		uint16_t offset = (opcode[2] << 8) | opcode[1];
		state->memory[offset] = state->l;
		state->memory[offset + 1] = state->h;
		state->pc += 2;
	}
	break;
	case 0x23: //INX H
		state->l++;
		if (state->l == 0)
			state->h++;
		break;
	case 0x24: //INR H
		state->h = addByte(state, state->h, 1, PRESERVE_CARRY);
		break;
	break;
	case 0x25: //DCR H
		state->h = subtractByte(state, state->h, 1, PRESERVE_CARRY);
		break;
	case 0x26: //MVI H, byte
		state->h = opcode[1];
		state->pc++;
		break;
	case 0x27: // DAA
	{
		uint16_t res = state->a;
		// printf("value of a %d\n", res);

		uint8_t least_four_bits = state->a & 0x0f;
		// printf("least four bits %d\n", least_four_bits);

		if (state->cc.ac == 1 || least_four_bits > 9) {
		    // printf("Adding 6 to a\n");
			res = state->a + 6;

    		if (least_four_bits + 6 > 0xf)
    			state->cc.ac = 1;
		}

		if (res > 0xff) {
		    // printf("Setting carry flag\n");
    		state->cc.cy = 1;
		}

		res = res & 0xff;

		least_four_bits = res & 0x0f;
		uint8_t most_four_bits = (res >> 4) & 0x0f;

		if (state->cc.cy == 1 || most_four_bits > 9) {
		    // printf("Adding 6 to high bits %d\n", res);
    		res = ((most_four_bits + 6) << 4) | least_four_bits;
		}

		// printf("Final value %d\n", res);
		ArithFlagsA(state, res, UPDATE_CARRY);
		state->a = (uint8_t)res;
	}
	break;
	case 0x28:
		InvalidInstruction(state);
		break;
	case 0x29: // DAD H
	{
		uint32_t hl = (state->h << 8) | state->l;
		uint32_t res = hl + hl;
		state->h = (res & 0xff00) >> 8;
		state->l = res & 0xff;
		state->cc.cy = ((res & 0xffff0000) != 0);
	}
	break;
	case 0x2a: // LHLD Addr
	{
		uint16_t offset = (opcode[2] << 8) | (opcode[1]);
		uint8_t l = state->memory[offset];
		uint8_t h = state->memory[offset + 1];
		uint16_t v = h << 8 | l;
		state->h = v >> 8 & 0xFF;
		state->l = v & 0xFF;
		state->pc += 2;
	}
	break;
	case 0x2b: //DCX H
		state->l--;
		if (state->l == 0xFF)
			state->h--;
		break;
	case 0x2c: //INR L
		state->l = addByte(state, state->l, 1, PRESERVE_CARRY);
		break;
	break;
	case 0x2d: //DCR L
		state->l = subtractByte(state, state->l, 1, PRESERVE_CARRY);
		break;
	case 0x2e: // MVI L,byte
		state->l = opcode[1];
		state->pc++;
		break;
	case 0x2f: // CMA
		state->a ^= 0xFF;
		break;
	case 0x30:  // NOP
		break;
	case 0x31: // LXI SP, word
		state->sp = (opcode[2] << 8) | opcode[1];
		state->pc += 2;
		break;
	case 0x32: // STA word
	{
		uint16_t offset = (opcode[2] << 8) | (opcode[1]);
		state->memory[offset] = state->a;
		state->pc += 2;
	}
	break;
	case 0x33: // INX SP
		state->sp++;
		break;
	case 0x34: // INR M
	{
		uint16_t offset = (state->h << 8) | state->l;
		state->memory[offset] = addByte(state, state->memory[offset], 1, PRESERVE_CARRY);
	}
	break;
	case 0x35: // DCR M
	{
		uint16_t offset = (state->h << 8) | state->l;
		state->memory[offset] = subtractByte(state, state->memory[offset], 1, PRESERVE_CARRY);
	}
	break;
	case 0x36: // MVI M, byte
	{
		//AC set if lower nibble of h was zero prior to dec
		uint16_t offset = (state->h << 8) | state->l;
		state->memory[offset] = opcode[1];
		state->pc++;
	}
	break;
	case 0x37:
		state->cc.cy = 1;
		break; // STC
	case 0x38:
		InvalidInstruction(state);
		break;
	case 0x39: // DAD SP
	{
		uint16_t hl = (state->h << 8) | state->l;
		uint16_t sp = state->sp;
		uint32_t res = hl + sp;
		state->h = (res & 0xff00) >> 8;
		state->l = res & 0xff;
		state->cc.cy = ((res & 0xffff0000) > 0);
	}
	break;
		break;
	case 0x3a: // LDA word
	{
		uint16_t offset = (opcode[2] << 8) | (opcode[1]);
		state->a = state->memory[offset];
		state->pc += 2;
	}
	break;
	case 0x3b: // DCX SP
		state->sp--;
		break;
	case 0x3c: // INR A
		state->a = addByte(state, state->a, 1, PRESERVE_CARRY);
		break;
	case 0x3d: // DCR A
		state->a = subtractByte(state, state->a, 1, PRESERVE_CARRY);
		break;
	case 0x3e: // MVI A, byte
		state->a = opcode[1];
		state->pc++;
		break;
	case 0x3f: // CMC
		if (0 == state->cc.cy)
			state->cc.cy = 1;
		else
			state->cc.cy = 0;
		break;
	case 0x40:
		state->b = state->b;
		break; // MOV B, B
	case 0x41:
		state->b = state->c;
		break; // MOV B, C
	case 0x42:
		state->b = state->d;
		break; // MOV B, D
	case 0x43:
		state->b = state->e;
		break; // MOV B, E
	case 0x44:
		state->b = state->h;
		break; // MOV B, H
	case 0x45:
		state->b = state->l;
		break; // MOV B, L
	case 0x46: // MOV B, M
	{
		uint16_t offset = (state->h << 8) | (state->l);
		state->b = state->memory[offset];
	}
	break;
	case 0x47:
		state->b = state->a;
		break; // MOV B, A
	case 0x48:
		state->c = state->b;
		break; // MOV C, B
	case 0x49:
		state->c = state->c;
		break; // MOV C, C
	case 0x4a:
		state->c = state->d;
		break; // MOV C, D
	case 0x4b:
		state->c = state->e;
		break; // MOV C, E
	case 0x4c:
		state->c = state->h;
		break; // MOV C, H
	case 0x4d:
		state->c = state->l;
		break; // MOV C, L
	case 0x4e: // MOV C, M
	{
		uint16_t offset = (state->h << 8) | (state->l);
		state->c = state->memory[offset];
	}
	break;
	case 0x4f:
		state->c = state->a;
		break; // MOV C, A
	case 0x50:
		state->d = state->b;
		break; // MOV D, B
	case 0x51: // MOV D, C
		state->d = state->c;
		break;
	case 0x52: // MOV D, D
		state->d = state->d;
		break;
	case 0x53: // MOV D, E
		state->d = state->e;
		break;
	case 0x54:
		state->d = state->h;
		break; // MOV D, H
	case 0x55:
		state->d = state->l;
		break; // MOV D, B
	case 0x56: // MOV D, M
	{
		uint16_t offset = (state->h << 8) | (state->l);
		state->d = state->memory[offset];
	}
	break;
	case 0x57:
		state->d = state->a;
		break; // MOV D, A
	case 0x58:
		state->e = state->b;
		break; // MOV E, B
	case 0x59:
		state->e = state->c;
		break; // MOV E, C
	case 0x5a:
		state->e = state->d;
		break; // MOV E, D
	case 0x5b:
		state->e = state->e;
		break; // MOV E, E
	case 0x5c:
		state->e = state->h;
		break; // MOV E, H
	case 0x5d:
		state->e = state->l;
		break; // MOV E, L
	case 0x5e: // MOV E, M
	{
		uint16_t offset = (state->h << 8) | (state->l);
		state->e = state->memory[offset];
	}
	break;
	case 0x5f:
		state->e = state->a;
		break; // MOV E, A
	case 0x60:
		state->h = state->b;
		break; // MOV H, B
	case 0x61:
		state->h = state->c;
		break; // MOV H, C
	case 0x62:
		state->h = state->d;
		break; // MOV H, D
	case 0x63:
		state->h = state->e;
		break; // MOV H, E
	case 0x64:
		state->h = state->h;
		break; // MOV H, H
	case 0x65:
		state->h = state->l;
		break; // MOV H, L
	case 0x66: // MOV H, M
	{
		uint16_t offset = (state->h << 8) | (state->l);
		state->h = state->memory[offset];
	}
	break;
	case 0x67:
		state->h = state->a;
		break; // MOV H, A
	case 0x68:
		state->l = state->b;
		break; // MOV L, B
	case 0x69:
		state->l = state->c;
		break; // MOV L, C
	case 0x6a:
		state->l = state->d;
		break; // MOV L, D
	case 0x6b:
		state->l = state->e;
		break; // MOV L, E
	case 0x6c:
		state->l = state->h;
		break; // MOV L, H
	case 0x6d:
		state->l = state->l;
		break; // MOV L, L
	case 0x6e: // MOV L, M
	{
		uint16_t offset = (state->h << 8) | (state->l);
		state->l = state->memory[offset];
	}
	break;
	case 0x6f:
		state->l = state->a;
		break; // MOV L, A
	case 0x70: // MOV M, B
	{
		uint16_t offset = (state->h << 8) | (state->l);
		state->memory[offset] = state->b;
	}
	break;
	case 0x71: // MOV M, C
	{
		uint16_t offset = (state->h << 8) | (state->l);
		state->memory[offset] = state->c;
	}
	break;
	case 0x72: // MOV M, D
	{
		uint16_t offset = (state->h << 8) | (state->l);
		state->memory[offset] = state->d;
	}
	break;
	case 0x73: // MOV M, E
	{
		uint16_t offset = (state->h << 8) | (state->l);
		state->memory[offset] = state->e;
	}
	break;
	case 0x74: // MOV M, H
	{
		uint16_t offset = (state->h << 8) | (state->l);
		state->memory[offset] = state->h;
	}
	break;
	case 0x75: // MOV M, L
	{
		uint16_t offset = (state->h << 8) | (state->l);
		state->memory[offset] = state->l;
	}
	break;
	case 0x76:  // HLT
        state->pc--;
		return 1;
		break;
	case 0x77: // MOV M, A
	{
		uint16_t offset = (state->h << 8) | (state->l);
		state->memory[offset] = state->a;
	}
	break;
	case 0x78:
		state->a = state->b;
		break; // MOV A, B
	case 0x79:
		state->a = state->c;
		break; // MOV A, C
	case 0x7a:
		state->a = state->d;
		break; // MOV A, D
	case 0x7b:
		state->a = state->e;
		break; // MOV A, E
	case 0x7c:
		state->a = state->h;
		break; // MOV A, H
	case 0x7d:
		state->a = state->l;
		break; // MOV A, L
	case 0x7e: // MOV A, M
	{
		uint16_t offset = (state->h << 8) | (state->l);
		state->a = state->memory[offset];
	}
	break;
	case 0x7f:
		state->a = state->a;
		break; // MOV A, A
	case 0x80: // ADD B
		state->a = addByte(state, state->a, state->b, UPDATE_CARRY);
		break;
	case 0x81: // ADD C
		state->a = addByte(state, state->a, state->c, UPDATE_CARRY);
		break;
	case 0x82: // ADD D
		state->a = addByte(state, state->a, state->d, UPDATE_CARRY);
		break;
	case 0x83: // ADD E
		state->a = addByte(state, state->a, state->e, UPDATE_CARRY);
		break;
	case 0x84: // ADD H
		state->a = addByte(state, state->a, state->h, UPDATE_CARRY);
		break;
	case 0x85: // ADD L
		state->a = addByte(state, state->a, state->l, UPDATE_CARRY);
		break;
	case 0x86: // ADD M
	{
		uint16_t offset = (state->h << 8) | (state->l);
		state->a = addByte(state, state->a, state->memory[offset], UPDATE_CARRY);
	}
	break;
	case 0x87: // ADD A
		state->a = addByte(state, state->a, state->a, UPDATE_CARRY);
		break;
	case 0x88: // ADC B
		state->a = addByteWithCarry(state, state->a, state->b, UPDATE_CARRY);
		break;
	case 0x89: // ADC C
		state->a = addByteWithCarry(state, state->a, state->c, UPDATE_CARRY);
		break;
	break;
	case 0x8a: // ADC D
		state->a = addByteWithCarry(state, state->a, state->d, UPDATE_CARRY);
		break;
	case 0x8b: // ADC E
		state->a = addByteWithCarry(state, state->a, state->e, UPDATE_CARRY);
		break;
	case 0x8c: // ADC H
		state->a = addByteWithCarry(state, state->a, state->h, UPDATE_CARRY);
		break;
	case 0x8d: // ADC L
		state->a = addByteWithCarry(state, state->a, state->l, UPDATE_CARRY);
		break;
	case 0x8e: // ADC M
	{
		uint16_t offset = (state->h << 8) | (state->l);
		state->a = addByteWithCarry(state, state->a, state->memory[offset], UPDATE_CARRY);
	}
	break;
	case 0x8f: // ADC A
		state->a = addByteWithCarry(state, state->a, state->a, UPDATE_CARRY);
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
		state->a = subtractByte(state, state->a, state->memory[offset], UPDATE_CARRY);
	}
	break;
	case 0x97: // SUB A
		state->a = subtractByte(state, state->a, state->a, UPDATE_CARRY);
		break;
	case 0x98: // SBB B
		state->a = subtractByteWithBorrow(state, state->a, state->b, UPDATE_CARRY);
		break;
	case 0x99: // SBB C
		state->a = subtractByteWithBorrow(state, state->a, state->c, UPDATE_CARRY);
		break;
	case 0x9a: // SBB D
		state->a = subtractByteWithBorrow(state, state->a, state->d, UPDATE_CARRY);
		break;
	case 0x9b: // SBB E
		state->a = subtractByteWithBorrow(state, state->a, state->e, UPDATE_CARRY);
		break;
	case 0x9c: // SBB H
		state->a = subtractByteWithBorrow(state, state->a, state->h, UPDATE_CARRY);
		break;
	case 0x9d: // SBB L
		state->a = subtractByteWithBorrow(state, state->a, state->l, UPDATE_CARRY);
		break;
	case 0x9e: // SBB M
	{
		uint16_t offset = (state->h << 8) | (state->l);
		state->a = subtractByteWithBorrow(state, state->a, state->memory[offset], UPDATE_CARRY);
	}
	break;
	case 0x9f: // SBB A
		state->a = subtractByteWithBorrow(state, state->a, state->a, UPDATE_CARRY);
		break;
	case 0xa0: // ANA B
		state->a = state->a & state->b;
		LogicFlagsA(state, 1);
		break;
	case 0xa1: // ANA C
		state->a = state->a & state->c;
		LogicFlagsA(state, 1);
		break;
	case 0xa2: // ANA D
		state->a = state->a & state->d;
		LogicFlagsA(state, 1);
		break;
	case 0xa3: // ANA E
		state->a = state->a & state->e;
		LogicFlagsA(state, 1);
		break;
	case 0xa4: // ANA H
		state->a = state->a & state->h;
		LogicFlagsA(state, 1);
		break;
	case 0xa5: // ANA L
		state->a = state->a & state->l;
		LogicFlagsA(state, 1);
		break;
	case 0xa6: // ANA M
	{
		uint16_t offset = (state->h << 8) | (state->l);
		state->a = state->a & state->memory[offset];
		LogicFlagsA(state, 1);
	}
	break;
	case 0xa7: // ANA A
		state->a = state->a & state->a;
		LogicFlagsA(state, 1);
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
		state->a = state->a ^ state->memory[offset];
		LogicFlagsA(state, 0);
	}
	break;
	case 0xaf:
		state->a = state->a ^ state->a;
		LogicFlagsA(state, 0);
		break; // XRA A
	case 0xb0:
		state->a = state->a | state->b;
		LogicFlagsA(state, 0);
		break; // ORA B
	case 0xb1:
		state->a = state->a | state->c;
		LogicFlagsA(state, 0);
		break; // ORA C
	case 0xb2:
		state->a = state->a | state->d;
		LogicFlagsA(state, 0);
		break; // ORA D
	case 0xb3:
		state->a = state->a | state->e;
		LogicFlagsA(state, 0);
		break; // ORA E
	case 0xb4:
		state->a = state->a | state->h;
		LogicFlagsA(state, 0);
		break; // ORA H
	case 0xb5:
		state->a = state->a | state->l;
		LogicFlagsA(state, 0);
		break; // ORA L
	case 0xb6: // ORA M
	{
		uint16_t offset = (state->h << 8) | (state->l);
		state->a = state->a | state->memory[offset];
		LogicFlagsA(state, 0);
	}
	break;
	case 0xb7:
		state->a = state->a | state->a;
		LogicFlagsA(state, 0);
		break; // ORA A
	case 0xb8: // CMP B
		subtractByte(state, state->a, state->b, UPDATE_CARRY);
		break;
	case 0xb9: // CMP C
		subtractByte(state, state->a, state->c, UPDATE_CARRY);
		break;
	case 0xba: // CMP D
		subtractByte(state, state->a, state->d, UPDATE_CARRY);
		break;
	case 0xbb: // CMP E
		subtractByte(state, state->a, state->e, UPDATE_CARRY);
		break;
	case 0xbc: // CMP H
		subtractByte(state, state->a, state->h, UPDATE_CARRY);
		break;
	case 0xbd: // CMP L
		subtractByte(state, state->a, state->l, UPDATE_CARRY);
		break;
	case 0xbe: // CMP M
	{
		uint16_t offset = (state->h << 8) | (state->l);
		subtractByte(state, state->a, state->memory[offset], UPDATE_CARRY);
	}
	break;
	case 0xbf: // CMP A
		subtractByte(state, state->a, state->a, UPDATE_CARRY);
		break;
	case 0xc0: // RNZ
		if (0 == state->cc.z)
			returnToCaller(state, offset);
		break;
	case 0xc1: // POP B
	{
		state->c = state->memory[state->sp];
		state->b = state->memory[state->sp + 1];
		state->sp += 2;
	}
	break;
	case 0xc2: // JNZ Addr
		if (0 == state->cc.z)
			state->pc = ((opcode[2] << 8) | opcode[1]);
		else
			state->pc += 2;
		break;
	case 0xc3: // JMP Addr
		state->pc = ((opcode[2] << 8) | opcode[1]);
		break;
	case 0xc4: // CNZ Addr
		if (0 == state->cc.z)
		{
			call(state, offset, (opcode[2] << 8) | opcode[1]);
		}
		else
			state->pc += 2;
		break;
	case 0xc5: // PUSH   B
	{
		state->memory[state->sp - 1] = state->b;
		state->memory[state->sp - 2] = state->c;
		state->sp = state->sp - 2;
	}
	break;
	case 0xc6: // ADI byte
	{
		uint16_t x = (uint16_t)state->a + (uint16_t)opcode[1];
		state->cc.z = ((x & 0xff) == 0);
		state->cc.s = (0x80 == (x & 0x80));
		state->cc.p = parity((x & 0xff), 8);
		state->cc.cy = (x > 0xff);
	    state->cc.ac = (((state->a & 0x0f) + (opcode[1] & 0x0f)) > 0x0f);
		state->a = (uint8_t)x;
		state->pc++;
	}
	break;
	case 0xc7: // RST 0
		UnimplementedInstruction(state);
		break;
	case 0xc8: // RZ
		if (1 == state->cc.z)
			returnToCaller(state, offset);
		break;
	case 0xc9: // RET
		returnToCaller(state, offset);
		break;
	case 0xca: // JZ Addr
		if (1 == state->cc.z)
			state->pc = ((opcode[2] << 8) | opcode[1]);
		else
			state->pc += 2;
		break;
	case 0xcb:
		InvalidInstruction(state);
		break;
	case 0xcc: // CZ Addr
		if (1 == state->cc.z)
			call(state, offset, (opcode[2] << 8) | opcode[1]);
		else
			state->pc += 2;
		break;
	case 0xcd: // CALL Addr
		call(state, offset, (opcode[2] << 8) | opcode[1]);
		break;
	case 0xce: // ACI d8
		state->a = addByteWithCarry(state, state->a, opcode[1], UPDATE_CARRY);
		state->pc++;
		break;
	case 0xcf: // RST 1
		UnimplementedInstruction(state);
		break;
	case 0xd0: // RNC
		if (0 == state->cc.cy)
			returnToCaller(state, offset);
		break;
	case 0xd1: // POP D
	{
		state->e = state->memory[state->sp];
		state->d = state->memory[state->sp + 1];
		state->sp += 2;
	}
	break;
	case 0xd2: // JNC Addr
		if (0 == state->cc.cy)
			state->pc = ((opcode[2] << 8) | opcode[1]);
		else
			state->pc += 2;
		break;
	case 0xd3: // OUT d8
        state->io[opcode[1]] = state->a;
        state->pc += 1;
        break;
	case 0xd4: // CNC Addr
		if (0 == state->cc.cy)
			call(state, offset, (opcode[2] << 8) | opcode[1]);
		else
			state->pc += 2;
		break;
	case 0xd5: //PUSH   D
	{
		state->memory[state->sp - 1] = state->d;
		state->memory[state->sp - 2] = state->e;
		state->sp = state->sp - 2;
	}
	break;
	case 0xd6: // SUI d8
		state->a = subtractByte(state, state->a, opcode[1], UPDATE_CARRY);
		state->pc++;
		break;
	case 0xd7: // RST 2
		UnimplementedInstruction(state);
		break;
	case 0xd8: // RC
		if (1 == state->cc.cy)
			returnToCaller(state, offset);
		break;
	case 0xd9:
		InvalidInstruction(state);
		break;
	case 0xda: // JC Addr
		if (1 == state->cc.cy)
			state->pc = ((opcode[2] << 8) | opcode[1]);
		else
			state->pc += 2;
		break;
	case 0xdb: // IN d8
        state->a = state->io[opcode[1]];
        state->pc++;
        break;
	case 0xdc: // CC Addr
		if (1 == state->cc.cy)
			call(state, offset, (opcode[2] << 8) | opcode[1]);
		else
			state->pc += 2;
		break;
	case 0xdd:
		InvalidInstruction(state);
		break;
	case 0xde: // SBI d8
		state->a = subtractByteWithBorrow(state, state->a, opcode[1], UPDATE_CARRY);
		state->pc++;
		break;
	case 0xdf: // RST 3
		UnimplementedInstruction(state);
		break;
	case 0xe0: // RPO
		if (0 == state->cc.p)
			returnToCaller(state, offset);
		break;
	case 0xe1: // POP H
	{
		state->l = state->memory[state->sp];
		state->h = state->memory[state->sp + 1];
		state->sp += 2;
	}
	break;
	case 0xe2: // JPO Addr
		if (0 == state->cc.p)
			state->pc = ((opcode[2] << 8) | opcode[1]);
		else
			state->pc += 2;
		break;
	case 0xe3: // XTHL
	{
		uint16_t spL = state->memory[state->sp];
		uint16_t spH = state->memory[state->sp + 1];
		state->memory[state->sp] = state->l;
		state->memory[state->sp + 1] = state->h;
		state->h = spH;
		state->l = spL;
	}
	break;
	case 0xe4: // CPO Addr
		if (0 == state->cc.p)
			call(state, offset, (opcode[2] << 8) | opcode[1]);
		else
			state->pc += 2;
		break;
	case 0xe5: // PUSH H
	{
		state->memory[state->sp - 1] = state->h;
		state->memory[state->sp - 2] = state->l;
		state->sp = state->sp - 2;
	}
	break;
	case 0xe6: // ANI byte
	{
		state->a = state->a & opcode[1];
		LogicFlagsA(state, 1);
		state->pc++;
	}
	break;
	case 0xe7: // RST 4
		UnimplementedInstruction(state);
		break;
	case 0xe8: // RPE
		if (1 == state->cc.p)
			returnToCaller(state, offset);
		break;
	case 0xe9: // PCHL
		state->pc = (state->h << 8) | state->l;
		break;
	case 0xea: // JPE Addr
		if (1 == state->cc.p)
			state->pc = ((opcode[2] << 8) | opcode[1]);
		else
			state->pc += 2;
		break;
	case 0xeb: // XCHG
	{
		uint8_t save1 = state->d;
		uint8_t save2 = state->e;
		state->d = state->h;
		state->e = state->l;
		state->h = save1;
		state->l = save2;
	}
	break;
	case 0xec: // CPE Addr
		if (1 == state->cc.p)
			call(state, offset, (opcode[2] << 8) | opcode[1]);
		else
			state->pc += 2;
		break;
	case 0xed:
		InvalidInstruction(state);
		break;
	case 0xee: // XRI d8
		state->a = state->a ^ opcode[1];
		LogicFlagsA(state, 0);
		state->pc++;
		break;
	case 0xef: // RST 5
		UnimplementedInstruction(state);
		break;
	case 0xf0: // RP
		if (0 == state->cc.s)
			returnToCaller(state, offset);
		break;
	case 0xf1: //POP PSW
	{
        // Step 1: Restore the condition flags from the current stack pointer location
        uint8_t psw = state->memory[state->sp];

        // Step 2: Extract the condition flags from the PSW byte
        state->cc.cy = (psw & 0x01);  // Carry flag (bit 0)
        state->cc.p = (psw & 0x04) >> 2;  // Parity flag (bit 2)
        state->cc.ac = (psw & 0x10) >> 4;  // Auxiliary carry flag (bit 4)
        state->cc.z = (psw & 0x40) >> 6;  // Zero flag (bit 6)
        state->cc.s = (psw & 0x80) >> 7;  // Sign flag (bit 7)

        // Step 3: Increment the stack pointer to the next memory location
        state->sp++;

        // Step 4: Restore the accumulator from the new stack pointer location
        state->a = state->memory[state->sp];

        // Step 5: Increment the stack pointer again
        state->sp++;
	}
	break;
	case 0xf2: // JP Addr
		if (0 == state->cc.s)
			state->pc = ((opcode[2] << 8) | opcode[1]);
		else
			state->pc += 2;
		break;
	case 0xf3: // DI
		UnimplementedInstruction(state);
		break;
	case 0xf4: // CP Addr
		if (0 == state->cc.s)
			call(state, offset, (opcode[2] << 8) | opcode[1]);
		else
			state->pc += 2;
		break;
	case 0xf5: // PUSH PSW
	{
        // Step 1: Decrement the stack pointer
        state->sp--;

        // Step 2: Store the accumulator at the new stack pointer location
        state->memory[state->sp] = state->a;

        // Step 3: Decrement the stack pointer again
        state->sp--;

        // Step 4: Construct the PSW byte (format: s z 0 ac 0 p 1 c)
        uint8_t psw = (state->cc.s << 7) |  // Sign flag (bit 7)
                      (state->cc.z << 6) |  // Zero flag (bit 6)
                      (0 << 5) |            // Bit 5 is always 0
                      (state->cc.ac << 4) | // Auxiliary carry (bit 4)
                      (0 << 3) |            // Bit 3 is always 0
                      (state->cc.p << 2) |  // Parity flag (bit 2)
                      (1 << 1) |            // Bit 1 is always 1
                      (state->cc.cy);       // Carry flag (bit 0)

        // Step 5: Store the PSW byte at the new stack pointer location
        state->memory[state->sp] = psw;
	}
	break;
	case 0xf6: // ORI d8
		state->a = state->a | opcode[1];
		LogicFlagsA(state, 0);
		state->pc++;
		break;
	case 0xf7: // RST 6
		UnimplementedInstruction(state);
		break;
	case 0xf8: // RM
		if (1 == state->cc.s)
			returnToCaller(state, offset);
		break;
	case 0xf9: // SPHL
		state->sp = (state->h << 8) | state->l;
		break;
	case 0xfa: // JM Addr
		if (1 == state->cc.s)
			state->pc = ((opcode[2] << 8) | opcode[1]);
		else
			state->pc += 2;
		break;

	case 0xfb:
		state->int_enable = 1;
		break; // EI
	case 0xfc: // CM Addr
		if (1 == state->cc.s)
			call(state, offset, (opcode[2] << 8) | opcode[1]);
		else
			state->pc += 2;
		break;
	case 0xfd:
		InvalidInstruction(state);
		break;
	case 0xfe: // CPI d8
	{
		uint8_t x = state->a - opcode[1];
		state->cc.z = (x == 0);
		state->cc.s = (0x80 == (x & 0x80));
		state->cc.p = parity(x, 8);
		state->cc.cy = (state->a < opcode[1]);
        state->cc.ac = 0;
		state->pc++;
	}
	break;
	case 0xff: // RST 7
		UnimplementedInstruction(state);
		break;
	}
	/*
	printf("\t");
	printf("%c", state->cc.z ? 'z' : '.');
	printf("%c", state->cc.s ? 's' : '.');
	printf("%c", state->cc.p ? 'p' : '.');
	printf("%c", state->cc.cy ? 'c' : '.');
	printf("%c  ", state->cc.ac ? 'a' : '.');
	printf("A $%02x B $%02x C $%02x D $%02x E $%02x H $%02x L $%02x SP %04x\n", state->a, state->b, state->c,
				state->d, state->e, state->h, state->l, state->sp);
	*/
	return 0;
}

State8085 *Init8085(void)
{
	State8085 *state = calloc(1, sizeof(State8085));
	state->memory = malloc(0x10000); // 64K
	state->io = malloc(0x100);
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
	printf("Start At: %d\n", startAt);
	printf("Offset: %d\n", offset);
	if(offset == startAt)
		state->sp = 0xFFFF;
	state->pc = startAt;
	printf("Pause At: %d\n", pauseAt);
	while (done == 0 && state->pc < pauseAt)
	{
		done = Emulate8085Op(state, offset);
		printf("PC in C %d", state->pc);
	}
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

	printf("State Ptr: %p, SP Ptr: %p\n", state, &state->sp);
	printf("Offset %u\n", offset);
	state->pc = offset;
	state->sp = 0xFFFF;
	printf("Memory at offset %u\n", state->memory[offset]);
	printf("Memory at offset + 1 %u\n", state->memory[offset + 1]);

	while (done == 0)
	{
		if (cycles > 10000)
			exit(2);
		done = Emulate8085Op(state, offset);
		cycles++;
	}
	printf("%c", state->cc.z ? 'z' : '.');
	printf("%c", state->cc.s ? 's' : '.');
	printf("%c", state->cc.p ? 'p' : '.');
	printf("%c", state->cc.cy ? 'c' : '.');
	printf("%c  ", state->cc.ac ? 'a' : '.');
	printf("A $%02x B $%02x C $%02x D $%02x E $%02x H $%02x L $%02x SP %04x PC %04x\n", state->a, state->b, state->c,
		   state->d, state->e, state->h, state->l, state->sp, state->pc);
	return state;
}