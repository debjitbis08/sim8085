import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import { runAndGetState } from './test-utils';

// DSUB (opcode 08H) is one of the ten instructions Intel never documented, so
// there is no manual example to cite. The expectations below come from MAME's 8085 core (src/devices/cpu/i8085/i8085.cpp),
// which implements DSUB as two byte subtractions: the surviving flags are those
// of the high-byte pass, Z is recomputed over the full 16-bit result, parity is
// not updated and K is left clear.
function referenceDsub(hl, bc) {
    const l = hl & 0xff;
    const h = (hl >> 8) & 0xff;
    const c = bc & 0xff;
    const b = (bc >> 8) & 0xff;

    const qLow = l - c;
    const resLow = qLow & 0xff;
    const carryLow = (qLow >> 8) & 1;

    const qHigh = h - b - carryLow;
    const resHigh = qHigh & 0xff;

    return {
        hl: (resHigh << 8) | resLow,
        carry: ((qHigh >> 8) & 1) === 1,
        ac: ((h ^ resHigh ^ b) & 0x10) !== 0,
        s: (resHigh & 0x80) !== 0,
        z: resHigh === 0 && resLow === 0,
        v: ((b ^ h) & (h ^ resHigh) & 0x80) !== 0,
        k: false,
    };
}

describe('DSUB Instruction', () => {
    test('DSUB: HL - BC agrees with the MAME reference on result and flags', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 0x0000, max: 0xffff }),
                fc.integer({ min: 0x0000, max: 0xffff }),
                async (hl, bc) => {
                    const expected = referenceDsub(hl, bc);
                    const result = await runAndGetState('dsub\nhlt', {
                        registers: {
                            hl: { high: hl >> 8, low: hl & 0xff },
                            bc: { high: bc >> 8, low: bc & 0xff },
                        },
                    });

                    const actual = (result.registers.hl.high << 8) | result.registers.hl.low;
                    expect(actual).toBe(expected.hl);
                    expect(result.flags.c).toBe(expected.carry);
                    expect(result.flags.z).toBe(expected.z);
                    expect(result.flags.s).toBe(expected.s);
                    expect(result.flags.ac).toBe(expected.ac);
                    expect(result.flags.v).toBe(expected.v);
                    expect(result.flags.k).toBe(expected.k);
                },
            ),
            { numRuns: 60 },
        );
    });

    // The listing reported in issue #16, which is what prompted support for
    // these opcodes: RDEL is reached through XCHG so that HL is the pair being
    // rotated, then DSUB compares against BC with the carry cleared.
    test('DSUB: the legacy sequence from issue #16 runs end to end', async () => {
        const code = `
            xchg
            rdel
            xchg
            xra a
            dsub
            jnc done
            mvi a, 0EEH
            hlt
      done: mvi a, 0AAH
            hlt
        `;

        // HL = 0002H rotates to 0004H, then 0004H - 0001H leaves no borrow.
        const result = await runAndGetState(code, {
            registers: {
                bc: { high: 0x00, low: 0x01 },
                hl: { high: 0x00, low: 0x02 },
            },
        });

        expect(result.accumulator).toBe(0xaa);
        expect(result.registers.hl.high).toBe(0x00);
        expect(result.registers.hl.low).toBe(0x03);
        expect(result.flags.c).toBe(false);
    });
});
