import { describe, test, expect } from 'vitest';
import { runAndGetState } from './test-utils';

// Worked examples from the Intel 8080/8085 Assembly Language Programming Manual, Chapter 3.
describe('ADC Instruction Manual Examples', () => {
    // "Assume that register C contains 3DH, the accumulator contains 42H, and
    // the carry bit is set to zero... 01111111 = 7FH. The condition flags are
    // set as follows: Carry 0, Sign 0, Zero 0, Parity 0, Aux. Carry 0"
    test('ADC C: 3DH + 42H with no carry is 7FH and clears all five flags', async () => {
        const result = await runAndGetState('adc c\nhlt', {
            accumulator: 0x42,
            registers: { bc: { high: 0x00, low: 0x3d } },
            flags: { c: false },
        });

        expect(result.accumulator).toBe(0x7f);
        expect(result.flags.c).toBe(false);
        expect(result.flags.s).toBe(false);
        expect(result.flags.z).toBe(false);
        expect(result.flags.p).toBe(false);
        expect(result.flags.ac).toBe(false);
    });

    // "If the carry bit is set to one, the instruction has the following
    // results: ... 10000000"
    test('ADC C: the same operands with carry set give 80H', async () => {
        const result = await runAndGetState('adc c\nhlt', {
            accumulator: 0x42,
            registers: { bc: { high: 0x00, low: 0x3d } },
            flags: { c: true },
        });

        expect(result.accumulator).toBe(0x80);
    });
});
