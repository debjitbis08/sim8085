import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import { runAndGetState } from './test-utils';

// ARHL (opcode 10H) is undocumented by Intel. MAME's 8085 core (src/devices/cpu/i8085/i8085.cpp) implements it as
// "CF = L & 1; HL = (HL & 0x8000) | (HL >> 1)" — an arithmetic right shift that
// preserves the sign bit and touches no flag but carry.
describe('ARHL Instruction', () => {
    test('ARHL: shifts HL right one bit, preserving the sign, and sets carry from L bit 0', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 0x0000, max: 0xffff }),
                fc.boolean(),
                async (hl, carry) => {
                    const expected = (hl & 0x8000) | (hl >> 1);
                    const result = await runAndGetState('arhl\nhlt', {
                        registers: { hl: { high: hl >> 8, low: hl & 0xff } },
                        flags: { c: carry },
                    });

                    const actual = (result.registers.hl.high << 8) | result.registers.hl.low;
                    expect(actual).toBe(expected);
                    expect(result.flags.c).toBe((hl & 1) === 1);
                },
            ),
            { numRuns: 40 },
        );
    });

    test('ARHL: leaves every flag but carry untouched', async () => {
        // Carry is the only flag ARHL writes, so everything else — including
        // the undocumented V and K — has to survive in both directions.
        for (const seeded of [true, false]) {
            const result = await runAndGetState('arhl\nhlt', {
                registers: { hl: { high: 0x40, low: 0x00 } },
                flags: { z: seeded, s: seeded, p: seeded, ac: seeded, v: seeded, k: seeded },
            });

            expect(result.flags.z).toBe(seeded);
            expect(result.flags.s).toBe(seeded);
            expect(result.flags.p).toBe(seeded);
            expect(result.flags.ac).toBe(seeded);
            expect(result.flags.v).toBe(seeded);
            expect(result.flags.k).toBe(seeded);
        }
    });
});
