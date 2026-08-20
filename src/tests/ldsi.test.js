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
        const result = await runAndGetState('ldsi 05H\nhlt', {
            flags: { c: true, z: true, s: true, p: true, ac: true },
        });

        expect(result.flags.c).toBe(true);
        expect(result.flags.z).toBe(true);
        expect(result.flags.s).toBe(true);
        expect(result.flags.p).toBe(true);
        expect(result.flags.ac).toBe(true);
    });
});
