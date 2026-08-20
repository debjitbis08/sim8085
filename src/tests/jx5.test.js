import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import { runAndGetState } from './test-utils';

// JX5 (opcode FDH) and JNX5 (opcode DDH) are undocumented by Intel. MAME's 8085 core (src/devices/cpu/i8085/i8085.cpp)
// jumps on the undocumented K flag and its complement respectively. K itself is
// set by the 16-bit incrementer, so DCX through 0000H is a convenient way to
// raise it; see dcx.test.js and inx.test.js for that behaviour.
describe('JX5 and JNX5 Instructions', () => {
    test('JX5: jumps when K is set', async () => {
        const code = `
            lxi b, 0000H
            dcx b
            jx5 taken
            mvi a, 00H
            hlt
      taken: mvi a, 0FFH
            hlt
        `;

        const result = await runAndGetState(code);

        expect(result.accumulator).toBe(0xff);
    });

    test('JX5: falls through when K is clear', async () => {
        const code = `
            lxi b, 0005H
            dcx b
            jx5 taken
            mvi a, 011H
            hlt
      taken: mvi a, 0FFH
            hlt
        `;

        const result = await runAndGetState(code);

        expect(result.accumulator).toBe(0x11);
    });

    test('JNX5: jumps when K is clear', async () => {
        const code = `
            lxi b, 0005H
            dcx b
            jnx5 taken
            mvi a, 00H
            hlt
      taken: mvi a, 0FFH
            hlt
        `;

        const result = await runAndGetState(code);

        expect(result.accumulator).toBe(0xff);
    });

    test('JNX5: falls through when K is set', async () => {
        const code = `
            lxi b, 0000H
            dcx b
            jnx5 taken
            mvi a, 011H
            hlt
      taken: mvi a, 0FFH
            hlt
        `;

        const result = await runAndGetState(code);

        expect(result.accumulator).toBe(0x11);
    });
});
