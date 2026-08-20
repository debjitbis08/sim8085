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
