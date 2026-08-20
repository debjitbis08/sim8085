import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import { runAndGetState } from './test-utils';

// SHLX (opcode D9H) is undocumented by Intel. MAME's 8085 core (src/devices/cpu/i8085/i8085.cpp) stores L at the address in
// DE and H at the following address, touching no flags.
describe('SHLX Instruction', () => {
    test('SHLX: stores HL at the address in DE, low byte first', async () => {
        const result = await runAndGetState('shlx\nhlt', {
            registers: { de: { high: 0x20, low: 0x10 }, hl: { high: 0xab, low: 0xcd } },
        });

        expect(result.memory[0x2010]).toBe(0xcd);
        expect(result.memory[0x2011]).toBe(0xab);
    });

    test('SHLX: leaves every flag alone', async () => {
        const result = await runAndGetState('shlx\nhlt', {
            registers: { de: { high: 0x20, low: 0x10 }, hl: { high: 0xab, low: 0xcd } },
            flags: { c: true, z: true, s: true, p: true, ac: true },
        });

        expect(result.flags.c).toBe(true);
        expect(result.flags.z).toBe(true);
        expect(result.flags.s).toBe(true);
        expect(result.flags.p).toBe(true);
        expect(result.flags.ac).toBe(true);
    });
});
