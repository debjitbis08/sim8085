import { describe, test, expect } from 'vitest';
import { runTest, runAndGetState } from './test-utils';

describe('DAA Instruction Tests', () => {

  // Test 1: DAA without carry, no adjust needed
  test('DAA: No Adjust Needed', async () => {
    const code = `
      MVI A, 25h
      DAA
      HLT
    `;
    const expectedCpuState = {
      accumulator: 0x25,        // No adjustment needed, A remains 0x25
      flags: {
        z: false,
        s: false,
        p: false,
        c: false,              // No carry expected
        ac: false
      },
      programCounter: 0x0004    // After HLT, PC should increment by 4
    };
    await runTest(code, {}, expectedCpuState);
  });

  // Test 2: DAA with half-carry adjust
  test('DAA: Adjust with Half-Carry', async () => {
    const code = `
      MVI A, 2Bh
      DAA
      HLT
    `;
    const expectedCpuState = {
      accumulator: 0x31,        // DAA adjusts to 0x31 after correcting half-carry
      flags: {
        z: false,
        s: false,
        p: false,
        c: false,
        ac: true               // Half-carry is set
      },
      programCounter: 0x0004    // After HLT, PC should increment by 4
    };
    await runTest(code, {}, expectedCpuState);
  });

  // Test 3: DAA with carry, no half-carry
  test('DAA: Adjust with Carry', async () => {
    const code = `
      MVI A, 9Ah
      DAA
      HLT
    `;
    const expectedCpuState = {
      accumulator: 0x00,        // DAA adjusts to 0x00
      flags: {
        z: true,                // Zero flag should be set
        s: false,
        p: true,
        c: true,                // Carry flag should be set
        ac: true               // No half-carry
      },
      programCounter: 0x0004    // After HLT, PC should increment by 4
    };
    await runTest(code, {}, expectedCpuState);
  });

  // Test 4: DAA with both carry and half-carry
  test('DAA: Adjust with Carry and Half-Carry', async () => {
    const code = `
      MVI A, 99h
      DAA
      HLT
    `;
    const expectedCpuState = {
      accumulator: 0x99,        // DAA adjusts to 0x59
      flags: {
        z: false,
        s: true,
        p: true,
        c: false,                // Carry flag should be set
        ac: false                // Half-carry is set
      },
      programCounter: 0x0004    // After HLT, PC should increment by 4
    };
    await runTest(code, {}, expectedCpuState);
  });

  // Test 5: DAA on a BCD number
  test('DAA: Adjust BCD 87h', async () => {
    const code = `
      MVI A, 87h
      DAA
      HLT
    `;
    const expectedCpuState = {
      accumulator: 0x87,
      flags: {
        z: false,
        s: true,
        p: true,
        c: false,
        ac: false
      },
      programCounter: 0x0004    // After HLT, PC should increment by 4
    };
    await runTest(code, {}, expectedCpuState);
  });

  // Test 6: DAA adjusts to zero
  test('DAA: Adjust to Zero', async () => {
    const code = `
      MVI A, 99h
      ADI 01h    ; Add 0x01 to make it 0x9A
      DAA
      HLT
    `;
    const expectedCpuState = {
      accumulator: 0x00,        // After DAA, A becomes 0x00
      flags: {
        z: true,                // Zero flag should be set
        s: false,
        p: true,
        c: true,                // Carry flag should be set
        ac: true                // Half-carry expected
      }
    };
    await runTest(code, {}, expectedCpuState);
  });

});

// Worked example from the Intel 8080/8085 Assembly Language Programming Manual, Chapter 3.
describe('DAA Instruction Manual Example', () => {
    // "Assume that the accumulator contains the value 9BH... When the DAA has
    // finished, the accumulator contains the value 01 in a BCD format; both
    // the carry and auxiliary carry flags are set ON."
    test('DAA: 9BH adjusts to 01H with carry and auxiliary carry set', async () => {
        const result = await runAndGetState('daa\nhlt', { accumulator: 0x9b });

        expect(result.accumulator).toBe(0x01);
        expect(result.flags.c).toBe(true);
        expect(result.flags.ac).toBe(true);
    });
});

describe('DAA Instruction Undocumented Flags', () => {
    // Shirriff notes that "the V flag for DAA can also be understood in terms
    // of the underlying addition", so DAA writes V and K from the adjustment
    // it applies rather than leaving them stale.
    test('DAA: sets V when the adjustment overflows the signed range', async () => {
        // 7AH needs the low-nibble adjustment, so the underlying addition is
        // 7AH + 06H = 80H: 122 + 6 does not fit a signed byte, so V is set,
        // and K is V exclusive-ored with the now-negative sign.
        const result = await runAndGetState('daa\nhlt', { accumulator: 0x7a });

        expect(result.accumulator).toBe(0x80);
        expect(result.flags.v).toBe(true);
        expect(result.flags.k).toBe(false);
    });

    test('DAA: does not leave V and K stale from a previous instruction', async () => {
        // 12H is already valid BCD, so no adjustment is added and the sum
        // 12H + 00H cannot overflow.
        const result = await runAndGetState('daa\nhlt', {
            accumulator: 0x12,
            flags: { v: true, k: true },
        });

        expect(result.flags.v).toBe(false);
        expect(result.flags.k).toBe(false);
    });
});
