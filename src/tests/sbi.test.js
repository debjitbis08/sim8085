import { describe, test } from 'vitest';
import { runTest } from './test-utils';

describe('SBI Instruction Tests', () => {
  test('SBI: Subtract Immediate with Borrow', async () => {
    const code = `
      MVI A, 4h     ; Load 4H into the accumulator
      STC           ; Set the carry flag (CY = 1)
      SBI 2h        ; Subtract 2H and CY from A (A = A - 2H - CY)
      HLT
    `;
    const expectedCpuState = {
      accumulator: 0x1,
      flags: {
        z: false,
        s: false,
        p: false,
        c: false,
        ac: true
      },
      programCounter: 0x0006    // After HLT, PC should increment by 6
    };
    await runTest(code, expectedCpuState);
  });
});
