import { describe, test, expect } from 'vitest';
import { runAndGetState } from './test-utils';

// Worked example from the Intel 8080/8085 Assembly Language Programming Manual, Chapter 3.
describe('ORA Instruction Manual Example', () => {
    // "Summary of Logical Operations": 10101010 OR 00001111 gives 10101111.
    test('ORA C: AAH OR 0FH is AFH', async () => {
        const result = await runAndGetState('ora c\nhlt', {
            accumulator: 0xaa,
            registers: { bc: { high: 0x00, low: 0x0f } },
        });

        expect(result.accumulator).toBe(0xaf);
    });
});
