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

    test('SHLX: wraps the high-byte address after FFFFH', async () => {
        const result = await runAndGetState('shlx\nhlt', {
            registers: { de: { high: 0xff, low: 0xff }, hl: { high: 0xab, low: 0xcd } },
        });

        expect(result.memory[0xffff]).toBe(0xcd);
        expect(result.memory[0x0000]).toBe(0xab);
    });

    test('SHLX: leaves every flag alone', async () => {
        // Seeded in both directions, so an instruction that always set or
        // always cleared a flag would still fail. V and K are included: the
        // undocumented pair is flag state like any other, and RSTV, JX5 and
        // JNX5 read it.
        for (const seeded of [true, false]) {
            const result = await runAndGetState('shlx\nhlt', {
                registers: { de: { high: 0x20, low: 0x10 }, hl: { high: 0xab, low: 0xcd } },
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
});
