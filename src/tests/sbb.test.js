import { describe, test } from 'vitest';
import { runTest } from './test-utils';

describe('SBB Instruction Tests', () => {

  // Test 1: SBB with carry, A = 4, B = 2, carry set
  test('SBB: Subtract with Carry', async () => {
    const code = `
      MVI A, 4h      ; Load 4 into the accumulator (A)
      MVI B, 2h      ; Load 2 into register B
      STC            ; Set carry flag
      SBB B          ; Subtract B and carry from A (A = A - B - CY)
      HLT
    `;
    const expectedCpuState = {
      accumulator: 0x01,        // Result: 4 - 2 - 1 (carry) = 1
      flags: {
        z: false,
        s: false,
        p: false,
        c: false,
        ac: true
      },
      programCounter: 0x0007    // After HLT, PC should increment by 7
    };
    await runTest(code, {}, expectedCpuState);
  });
});