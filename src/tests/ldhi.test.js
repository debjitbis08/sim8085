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
        const result = await runAndGetState('ldhi 05H\nhlt', {
            registers: { hl: { high: 0x12, low: 0x34 } },
            flags: { c: true, z: true, s: true, p: true, ac: true },
        });

        expect(result.flags.c).toBe(true);
        expect(result.flags.z).toBe(true);
        expect(result.flags.s).toBe(true);
        expect(result.flags.p).toBe(true);
        expect(result.flags.ac).toBe(true);
    });
});
