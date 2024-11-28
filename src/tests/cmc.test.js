import { describe, test } from 'vitest';
import { runTest } from './test-utils';

describe('CMC Instruction Tests', () => {
    test('CMC: Toggles carry flag from 0 to 1', async () => {
        const code = `
      cmc
      hlt
    `;

        const initialCpuState = {
            accumulator: 0x00,
            registers: {
                bc: { high: 0x00, low: 0x00 },
                de: { high: 0x00, low: 0x00 },
                hl: { high: 0x00, low: 0x00 },
            },
            flags: {
                z: false,
                s: false,
                p: false,
                c: false, // Carry flag starts at 0
                ac: false,
            },
        };

        const expectedCpuState = {
            ...initialCpuState,
            flags: {
                ...initialCpuState.flags,
                c: true, // Carry flag toggled to 1
            },
            programCounter: 0x0002,
        };

        await runTest(code, initialCpuState, expectedCpuState);
    });

    test('CMC: Toggles carry flag from 1 to 0', async () => {
        const code = `
      cmc
      hlt
    `;

        const initialCpuState = {
            accumulator: 0x00,
            registers: {
                bc: { high: 0x00, low: 0x00 },
                de: { high: 0x00, low: 0x00 },
                hl: { high: 0x00, low: 0x00 },
            },
            flags: {
                z: false,
                s: false,
                p: false,
                c: true, // Carry flag starts at 1
                ac: false,
            },
        };

        const expectedCpuState = {
            ...initialCpuState,
            flags: {
                ...initialCpuState.flags,
                c: false, // Carry flag toggled to 0
            },
            programCounter: 0x0002,
        };

        await runTest(code, initialCpuState, expectedCpuState);
    });
});
