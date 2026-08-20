import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import { runAndGetState } from './test-utils';

// LDHI (opcode 28H) is undocumented by Intel. MAME's 8085 core (src/devices/cpu/i8085/i8085.cpp) computes
// "DE = (HL + immediate) & 0xffff" and touches no flags at all.
describe('LDHI Instruction', () => {
    test('LDHI: DE = HL + immediate', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 0x0000, max: 0xffff }),
                fc.integer({ min: 0x00, max: 0xff }),
                async (hl, imm) => {
                    const expected = (hl + imm) & 0xffff;
                    const literal = `0${imm.toString(16).padStart(2, '0')}H`;

                    const result = await runAndGetState(`ldhi ${literal}\nhlt`, {
                        registers: { hl: { high: hl >> 8, low: hl & 0xff } },
                    });

                    expect((result.registers.de.high << 8) | result.registers.de.low).toBe(expected);
                    // HL is the source and is left unchanged.
                    expect((result.registers.hl.high << 8) | result.registers.hl.low).toBe(hl);
                },
            ),
            { numRuns: 40 },
        );
    });

    test('LDHI: leaves every flag alone', async () => {
        // Seeded in both directions, so an instruction that always set or
        // always cleared a flag would still fail. V and K are included: the
        // undocumented pair is flag state like any other, and RSTV, JX5 and
        // JNX5 read it.
        for (const seeded of [true, false]) {
            const result = await runAndGetState('ldhi 05H\nhlt', {
                registers: { hl: { high: 0x12, low: 0x34 } },
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
