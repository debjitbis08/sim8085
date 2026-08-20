import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import { runAndGetState } from './test-utils';

// LDSI (opcode 38H) is undocumented by Intel. MAME's 8085 core (src/devices/cpu/i8085/i8085.cpp) computes
// "DE = (SP + immediate) & 0xffff" and touches no flags at all.
describe('LDSI Instruction', () => {
    test('LDSI: DE = SP + immediate', async () => {
        await fc.assert(
            fc.asyncProperty(fc.integer({ min: 0x00, max: 0xff }), async (imm) => {
                // A run starts with SP at FFFFH.
                const expected = (0xffff + imm) & 0xffff;
                const literal = `0${imm.toString(16).padStart(2, '0')}H`;

                const result = await runAndGetState(`ldsi ${literal}\nhlt`);

                expect((result.registers.de.high << 8) | result.registers.de.low).toBe(expected);
            }),
            { numRuns: 30 },
        );
    });

    test('LDSI: leaves every flag alone', async () => {
        // Seeded in both directions, so an instruction that always set or
        // always cleared a flag would still fail. V and K are included: the
        // undocumented pair is flag state like any other, and RSTV, JX5 and
        // JNX5 read it.
        for (const seeded of [true, false]) {
            const result = await runAndGetState('ldsi 05H\nhlt', {
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
