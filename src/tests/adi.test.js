import { describe, test } from 'vitest';
import { runTest } from './test-utils';

describe('ADI Instruction Tests', () => {
  test('ADI: Sets AC flag', async () => {
    const code = `
      mvi a, 8h
      adi 8h
      hlt
    `;
    const expectedCpuState = {
      accumulator: 0x10,
      flags: {
        z: false,
        s: false,
        p: false,
        c: false,
        ac: true
      },
      programCounter: 0x0005
    };
    await runTest(code, expectedCpuState);
  });

  test('ADI: Resets AC flag', async () => {
    const code = `
      mvi a, 14h
      adi 42h
      hlt
    `;
    const expectedCpuState = {
      accumulator: 0x56,
      flags: {
        z: false,
        s: false,
        p: true,
        c: false,
        ac: false
      },
      programCounter: 0x0005
    };
    await runTest(code, expectedCpuState);
  });
});
