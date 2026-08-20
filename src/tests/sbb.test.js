import { describe, test, expect } from 'vitest';
import { runTest, runAndGetState } from './test-utils';

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

// Worked example from the Intel 8080/8085 Assembly Language Programming Manual, Chapter 3.
describe('SBB Instruction Manual Example', () => {
    // "Assume that register B contains 2, the accumulator contains 4, and the
    // carry flag is set to 1. The instruction SBB B operates as follows:
    // ... = 1H ... the carry flag is reset OFF."
    test('SBB B: 4 - 2 - carry = 1H and clears the carry flag', async () => {
        const result = await runAndGetState('sbb b\nhlt', {
            accumulator: 0x04,
            registers: { bc: { high: 0x02, low: 0x00 } },
            flags: { c: true },
        });

        expect(result.accumulator).toBe(0x01);
        expect(result.flags.c).toBe(false);
    });
});
