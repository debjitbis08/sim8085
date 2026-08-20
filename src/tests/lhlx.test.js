import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import { runAndGetState } from './test-utils';

// LHLX (opcode EDH) is undocumented by Intel. MAME's 8085 core (src/devices/cpu/i8085/i8085.cpp) loads L from the address in
// DE and H from the following address, touching no flags. It is the exact
// counterpart of SHLX.
describe('LHLX Instruction', () => {
    test('LHLX: loads HL from the address in DE, low byte first', async () => {
        const result = await runAndGetState('lhlx\nhlt', {
            registers: { de: { high: 0x20, low: 0x10 }, hl: { high: 0x00, low: 0x00 } },
            memory: { 0x2010: 0xcd, 0x2011: 0xab },
        });

        expect(result.registers.hl.high).toBe(0xab);
        expect(result.registers.hl.low).toBe(0xcd);
    });

    test('LHLX: leaves every flag alone', async () => {
        for (const seeded of [true, false]) {
            const result = await runAndGetState('lhlx\nhlt', {
                registers: { de: { high: 0x20, low: 0x10 } },
                memory: { 0x2010: 0xcd, 0x2011: 0xab },
                flags: { c: seeded, z: seeded, s: seeded, p: seeded, ac: seeded, v: seeded, k: seeded },
            });

            expect(result.flags.c).toBe(seeded);
            expect(result.flags.z).toBe(seeded);
            expect(result.flags.s).toBe(seeded);
            expect(result.flags.p).toBe(seeded);
            expect(result.flags.ac).toBe(seeded);
            expect(result.flags.v).toBe(seeded);
            expect(result.flags.k).toBe(seeded);
        }
    });

    test('SHLX then LHLX: a round trip through memory preserves HL', async () => {
        const result = await runAndGetState('shlx\nlxi h, 0000H\nlhlx\nhlt', {
            registers: { de: { high: 0x40, low: 0x00 }, hl: { high: 0xbe, low: 0xef } },
        });

        expect(result.registers.hl.high).toBe(0xbe);
        expect(result.registers.hl.low).toBe(0xef);
    });
});
