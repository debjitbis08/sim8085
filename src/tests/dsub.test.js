import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import { runAndGetState } from './test-utils';

// DSUB (opcode 08H) is one of the ten instructions Intel never documented, so
// there is no Intel manual example to cite. The reference below follows
// Dehnhardt and Sorensen's original description (Electronics, January 1979),
// which lists DSUB as affecting Z, S, P, CY, AC, X5 and V. The 8085 runs it as
// two byte subtractions, so the surviving flags are those of the high-byte
// pass and Z covers the full 16-bit result. (MAME's core skips parity and
// clears K here; the primary source is followed instead.)
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

    const sign = (resHigh & 0x80) !== 0;
    const v = ((b ^ h) & (h ^ resHigh) & 0x80) !== 0;
    const parity = ((resHigh.toString(2).match(/1/g) || []).length % 2) === 0;

    return {
        hl: (resHigh << 8) | resLow,
        carry: ((qHigh >> 8) & 1) === 1,
        ac: ((h ^ resHigh ^ b) & 0x10) !== 0,
        s: sign,
        p: parity,
        z: resHigh === 0 && resLow === 0,
        v,
        k: v !== sign,
    };
}

describe('DSUB Instruction', () => {
    test('DSUB: HL - BC HL - BC affects every flag, as the original publication describes', async () => {
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
                    expect(result.flags.p).toBe(expected.p);
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
