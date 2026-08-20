import { describe, test, expect } from 'vitest';
import { runAndGetState } from './test-utils';

// Worked example from the Intel 8080/8085 Assembly Language Programming Manual, Chapter 3.
describe('PUSH Instruction Manual Example', () => {
    // "Assume that register B contains 2AH, the C register contains 4CH, and
    // the stack pointer is set at 9AAF. The instruction PUSH B stores the B
    // register at memory address 9AAEH and the C register at 9AADH. The stack
    // pointer is set to 9AADH"
    test('PUSH B: stores B at 9AAEH and C at 9AADH, leaving SP at 9AADH', async () => {
        // SP is set inside the program because a run resets it at start.
        const result = await runAndGetState('lxi sp, 9AAFH\npush b\nhlt', {
            registers: { bc: { high: 0x2a, low: 0x4c } },
        });

        expect(result.memory[0x9aae]).toBe(0x2a);
        expect(result.memory[0x9aad]).toBe(0x4c);
        expect(result.stackPointer).toBe(0x9aad);
    });
});

describe('PUSH PSW Flag Byte Layout', () => {
    // The 8085 lays the flag byte out as S Z K AC 0 P V C, with bit 3 always
    // zero. Bits 1 and 5 carry the undocumented V and K rather than filler,
    // which is what an 8080 would put there.
    test('PUSH PSW: writes every flag to its documented bit position', async () => {
        const allSet = await runAndGetState('push psw\nhlt', {
            accumulator: 0x00,
            flags: { s: true, z: true, k: true, ac: true, p: true, v: true, c: true },
        });

        // 1111 0111: bit 3 is the only one that cannot be set.
        expect(allSet.memory[0xfffd]).toBe(0xf7);

        const allClear = await runAndGetState('push psw\nhlt', { accumulator: 0x00 });
        expect(allClear.memory[0xfffd]).toBe(0x00);
    });

    test.each([
        ['s', 0x80],
        ['z', 0x40],
        ['k', 0x20],
        ['ac', 0x10],
        ['p', 0x04],
        ['v', 0x02],
        ['c', 0x01],
    ])('PUSH PSW: %s alone produces byte %i', async (flag, expected) => {
        const result = await runAndGetState('push psw\nhlt', {
            accumulator: 0x00,
            flags: { [flag]: true },
        });

        expect(result.memory[0xfffd]).toBe(expected);
    });

    test('PUSH PSW: stores the accumulator above the flag byte', async () => {
        const result = await runAndGetState('push psw\nhlt', { accumulator: 0x5a });

        expect(result.memory[0xfffe]).toBe(0x5a);
        expect(result.stackPointer).toBe(0xfffd);
    });
});
