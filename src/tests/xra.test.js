import { describe, test, expect } from 'vitest';
import { runAndGetState } from './test-utils';

// Worked example from the Intel 8080/8085 Assembly Language Programming Manual, Chapter 3.
describe('XRA Instruction Manual Example', () => {
    // "Summary of Logical Operations": 10101010 EXCLUSIVE OR 00001111 gives
    // 10100101.
    test('XRA C: AAH XOR 0FH is A5H', async () => {
        const result = await runAndGetState('xra c\nhlt', {
            accumulator: 0xaa,
            registers: { bc: { high: 0x00, low: 0x0f } },
        });

        expect(result.accumulator).toBe(0xa5);
    });
});
