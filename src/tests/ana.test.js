import { describe, test, expect } from 'vitest';
import { runAndGetState } from './test-utils';

// Worked example from the Intel 8080/8085 Assembly Language Programming Manual, Chapter 3.
describe('ANA Instruction Manual Example', () => {
    // "Summary of Logical Operations": 10101010 AND 00001111 gives 00001010.
    test('ANA C: AAH AND 0FH is 0AH', async () => {
        const result = await runAndGetState('ana c\nhlt', {
            accumulator: 0xaa,
            registers: { bc: { high: 0x00, low: 0x0f } },
        });

        expect(result.accumulator).toBe(0x0a);
    });
});
