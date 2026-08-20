import { describe, test, expect } from 'vitest';
import { runAndGetState } from './test-utils';

// Worked example from the Intel 8080/8085 Assembly Language Programming Manual, Chapter 3.
describe('SUB Instruction Manual Example', () => {
    // "Assume that the accumulator contains 3EH. The instruction SUB A
    // subtracts the contents of the accumulator from the accumulator and
    // produces a result of zero"
    test('SUB A: 3EH minus itself is zero', async () => {
        const result = await runAndGetState('sub a\nhlt', { accumulator: 0x3e });

        expect(result.accumulator).toBe(0x00);
        expect(result.flags.z).toBe(true);
    });
});
