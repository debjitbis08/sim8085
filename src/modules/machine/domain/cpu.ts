export type Register = "A" | "B" | "C" | "D" | "E" | "H" | "L";

export type RegisterPair = "PSW" | "BC" | "DE" | "HL" | "SP" | "PC";

export type Flag = "c" | "p" | "ac" | "z" | "s";

export interface Cpu {
    acc: number;
    flags: { c: boolean; p: boolean; ac: boolean; z: boolean; s: boolean };
    b: number;
    c: number;
    d: number;
    e: number;
    h: number;
    l: number;
    sp: number;
    pc: number;
}

export const create = (): Cpu => ({
    acc: 0,
    flags: { c: false, p: false, ac: false, z: false, s: false },
    b: 0,
    c: 0,
    d: 0,
    e: 0,
    h: 0,
    l: 0,
    sp: 0,
    pc: 0,
});

export const reset = (): Cpu => create();

// This order is described in the documentation for `PUSH PSW`.
// In 8085, the filler bits are undefined.
export const getPswLow = (cpu: Cpu): number => {
    return [
        cpu.flags.c,
        true,
        cpu.flags.p,
        false,
        cpu.flags.ac,
        false,
        cpu.flags.z,
        cpu.flags.s,
    ]
        .map((flagValue, index) => (2 ** index) * (flagValue ? 1 : 0))
        .reduce((sum, value) => sum + value, 0);
};

export const getRegister = (cpu: Cpu, register: Register): number => {
    switch (register) {
        case "A":
            return cpu.acc;
        case "B":
            return cpu.b;
        case "C":
            return cpu.c;
        case "D":
            return cpu.d;
        case "E":
            return cpu.e;
        case "H":
            return cpu.h;
        case "L":
            return cpu.l;
    }
};

export const setRegister = (cpu: Cpu, register: Register, value: number): Cpu => {
    if (value > 0xff || value < 0) {
        console.error(
            "Trying to set invalid value in register",
            value,
            register
        );
    }

    switch (register) {
        case "A":
            return { ...cpu, acc: value };
        case "B":
            return { ...cpu, b: value };
        case "C":
            return { ...cpu, c: value };
        case "D":
            return { ...cpu, d: value };
        case "E":
            return { ...cpu, e: value };
        case "H":
            return { ...cpu, h: value };
        case "L":
            return { ...cpu, l: value };
    }
};

const toWord = (high: number, low: number) => (high << 8) + low;
const toBytes = (value: number): {high: number, low: number} => ({ high: value >> 8, low: value & 0xFF });

export const getRegisterPair = (cpu: Cpu, registerPair: RegisterPair): { high: number, low: number, value: number } => {
    switch (registerPair) {
        case "PSW": {
            const pswLow = getPswLow(cpu);
            return { high: cpu.acc, low: pswLow, value: toWord(cpu.acc, pswLow) };
        }
        case "BC":
            return { high: cpu.b, low: cpu.c, value: toWord(cpu.b, cpu.c) };
        case "DE":
            return { high: cpu.d, low: cpu.e, value: toWord(cpu.d, cpu.e) };
        case "HL":
            return { high: cpu.h, low: cpu.l, value: toWord(cpu.h, cpu.l) };
        case "SP": {
            const { high, low } = toBytes(cpu.sp);
            return { high, low, value: cpu.sp };
        }
        case "PC": {
            const { high, low } = toBytes(cpu.pc);
            return { high, low, value: cpu.pc };
        }
    }
};
