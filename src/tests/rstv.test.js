import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import { runAndGetState } from './test-utils';

// RSTV (opcode CBH) is undocumented by Intel. MAME's 8085 core (src/devices/cpu/i8085/i8085.cpp) performs "op_rst(8)" when
// the undocumented V flag is set, vectoring to 8 * 8 = 0040H after pushing the
// return address, and does nothing at all when V is clear.
describe('RSTV Instruction', () => {
    test('RSTV: pushes a return address and vectors to 0040H when V is set', async () => {
        // A run resets SP to FFFFH, so the push lands at FFFDH/FFFEH. A HLT is
        // planted at the vector so the program terminates there.
        const result = await runAndGetState('rstv\nhlt', {
            flags: { v: true },
            memory: { 0x40: 0x76 },
        });

        expect(result.stackPointer).toBe(0xfffd);
        expect(result.memory[0xfffd]).toBe(0x01);
        expect(result.memory[0xfffe]).toBe(0x00);
    });

    test('RSTV: does nothing when V is clear', async () => {
        const result = await runAndGetState('rstv\nhlt', { flags: { v: false } });

        expect(result.stackPointer).toBe(0xffff);
    });

    test('RSTV: wraps its stack push when SP is 0000H', async () => {
        const result = await runAndGetState('org 0100H\nlxi sp, 0000H\nrstv\nhlt', {
            programCounter: 0x0100,
            flags: { v: true },
            memory: { 0x40: 0x76 },
        });

        // RSTV is at 0103H, so its one-byte return address is 0104H.
        expect(result.stackPointer).toBe(0xfffe);
        expect(result.memory[0xfffe]).toBe(0x04);
        expect(result.memory[0xffff]).toBe(0x01);
    });

    test('RSTV: leaves flags untouched whether or not the restart is taken', async () => {
        for (const taken of [true, false]) {
            const result = await runAndGetState('rstv\nhlt', {
                flags: { c: true, z: true, s: true, p: true, ac: true, v: taken, k: true },
                memory: { 0x40: 0x76 },
            });

            expect(result.flags).toMatchObject({
                c: true,
                z: true,
                s: true,
                p: true,
                ac: true,
                v: taken,
                k: true,
            });
        }
    });
});
