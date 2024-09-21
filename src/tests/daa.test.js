import { describe, test } from 'vitest';
import { runTest } from './test-utils';

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
    await runTest(code, expectedCpuState);
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
    await runTest(code, expectedCpuState);
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
    await runTest(code, expectedCpuState);
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
    await runTest(code, expectedCpuState);
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
    await runTest(code, expectedCpuState);
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
    await runTest(code, expectedCpuState);
  });

});
