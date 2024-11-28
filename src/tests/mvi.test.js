import { describe, test } from 'vitest';
import { runTest } from './test-utils';

describe('MVI Instruction Tests', () => {

  // Test 1: MVI A with a specific value
  test('MVI A, 5Ah', async () => {
    const code = `
      MVI A, 5Ah
      HLT
    `;
    const expectedCpuState = {
      accumulator: 0x5A,        // Verifying the accumulator value
      programCounter: 0x0003,   // After HLT, PC should increment by 3
    };
    await runTest(code, {}, expectedCpuState);
  });

  // Test 2: MVI B with a specific value
  test('MVI B, 1Eh', async () => {
    const code = `
      MVI B, 1Eh
      HLT
    `;
    const expectedCpuState = {
      registers: {
        bc: { high: 0x1E }      // Verifying the B register (high part of BC)
      },
      programCounter: 0x0003,   // After HLT, PC should increment by 3
    };
    await runTest(code, {}, expectedCpuState);
  });

  // Test 3: MVI C with a specific value
  test('MVI C, 5Ah', async () => {
    const code = `
      MVI C, 5Ah
      HLT
    `;
    const expectedCpuState = {
      registers: {
        bc: { low: 0x5A }       // Verifying the C register (low part of BC)
      },
      programCounter: 0x0003,   // After HLT, PC should increment by 3
    };
    await runTest(code, {}, expectedCpuState);
  });

  // Test 4: MVI D with a specific value
  test('MVI D, 20h', async () => {
    const code = `
      MVI D, 20h
      HLT
    `;
    const expectedCpuState = {
      registers: {
        de: { high: 0x20 }      // Verifying the D register (high part of DE)
      },
      programCounter: 0x0003,   // After HLT, PC should increment by 3
    };
    await runTest(code, {}, expectedCpuState);
  });

  // Test 5: MVI E with a specific value
  test('MVI E, 3Ch', async () => {
    const code = `
      MVI E, 3Ch
      HLT
    `;
    const expectedCpuState = {
      registers: {
        de: { low: 0x3C }       // Verifying the E register (low part of DE)
      },
      programCounter: 0x0003,   // After HLT, PC should increment by 3
    };
    await runTest(code, {}, expectedCpuState);
  });

  // Test 6: MVI H with a specific value
  test('MVI H, 4Ah', async () => {
    const code = `
      MVI H, 4Ah
      HLT
    `;
    const expectedCpuState = {
      registers: {
        hl: { high: 0x4A }      // Verifying the H register (high part of HL)
      },
      programCounter: 0x0003,   // After HLT, PC should increment by 3
    };
    await runTest(code, {}, expectedCpuState);
  });

  // Test 7: MVI L with a specific value
  test('MVI L, 2Bh', async () => {
    const code = `
      MVI L, 2Bh
      HLT
    `;
    const expectedCpuState = {
      registers: {
        hl: { low: 0x2B }       // Verifying the L register (low part of HL)
      },
      programCounter: 0x0003,   // After HLT, PC should increment by 3
    };
    await runTest(code, {}, expectedCpuState);
  });

});