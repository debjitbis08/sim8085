import { describe, test } from 'vitest';
import { runTest } from './test-utils';

describe('STC Instruction Tests', () => {
    test('STC: Sets carry flag without modifying other flags or registers', async () => {
        const code = `
      stc
      hlt
    `;

        const initialCpuState = {
            flags: {
                z: false,
                s: false,
                p: false,
                c: false,
                ac: false,
            },
        };

        const expectedCpuState = {
            flags: {
                ...initialCpuState.flags,
                c: true, // Carry flag should be set to 1
            },
            programCounter: 0x0002,
        };

        await runTest(code, initialCpuState, expectedCpuState);
    });
});
