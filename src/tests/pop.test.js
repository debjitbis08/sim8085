import { describe, test, expect } from 'vitest';
import { runAndGetState } from './test-utils';

describe('POP PSW Instruction', () => {
    // POP PSW has to recover the undocumented V and K from bits 1 and 5,
    // otherwise saving and restoring state around a subroutine would quietly
    // drop them and RSTV/JX5/JNX5 would misbehave after the restore.
    test('POP PSW: recovers every flag from the pushed byte', async () => {
        for (const seeded of [true, false]) {
            // XRA A between the push and the pop clears the flags, so anything
            // still set afterwards must have come back off the stack.
            const result = await runAndGetState('push psw\nxra a\npop psw\nhlt', {
                accumulator: 0x00,
                flags: { s: seeded, z: seeded, k: seeded, ac: seeded, p: seeded, v: seeded, c: seeded },
            });

            expect(result.flags.s).toBe(seeded);
            expect(result.flags.z).toBe(seeded);
            expect(result.flags.k).toBe(seeded);
            expect(result.flags.ac).toBe(seeded);
            expect(result.flags.p).toBe(seeded);
            expect(result.flags.v).toBe(seeded);
            expect(result.flags.c).toBe(seeded);
        }
    });

    test('POP PSW: a restored V flag still drives RSTV', async () => {
        // XRA A clears V, so RSTV can only fire if POP PSW brought it back.
        const restored = await runAndGetState('push psw\nxra a\npop psw\nrstv\nhlt', {
            flags: { v: true },
            memory: { 0x40: 0x76 },
        });

        // The pop returns the stack to FFFFH, then RSTV pushes the address of
        // the instruction after it, which sits at 0004H.
        expect(restored.stackPointer).toBe(0xfffd);
        expect(restored.memory[0xfffd]).toBe(0x04);
        expect(restored.memory[0xfffe]).toBe(0x00);

        const notRestored = await runAndGetState('push psw\nxra a\npop psw\nrstv\nhlt', {
            flags: { v: false },
        });

        // Only the PSW pop happened, so the stack is back where it started.
        expect(notRestored.stackPointer).toBe(0xffff);
    });

    test('POP PSW: a restored K flag still drives JX5', async () => {
        const code = `
            push psw
            xra a
            pop psw
            jx5 taken
            mvi a, 011H
            hlt
      taken: mvi a, 0FFH
            hlt
        `;

        const restored = await runAndGetState(code, { flags: { k: true } });
        expect(restored.accumulator).toBe(0xff);

        const cleared = await runAndGetState(code, { flags: { k: false } });
        expect(cleared.accumulator).toBe(0x11);
    });
});
