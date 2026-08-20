import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import { runAndGetState } from './test-utils';

// RDEL (opcode 18H) is undocumented by Intel. MAME's 8085 core (src/devices/cpu/i8085/i8085.cpp) rotates DE left through
// carry and sets the undocumented V flag to "new bit 15 XOR the new carry",
// leaving every other flag alone.
describe('RDEL Instruction', () => {
    test('RDEL: rotates DE left through carry and sets V from the sign change', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 0x0000, max: 0xffff }),
                fc.boolean(),
                async (de, carryIn) => {
                    const expected = ((de << 1) | (carryIn ? 1 : 0)) & 0xffff;
                    const expectedCarry = (de & 0x8000) !== 0;

                    const result = await runAndGetState('rdel\nhlt', {
                        registers: { de: { high: de >> 8, low: de & 0xff } },
                        flags: { c: carryIn },
                    });

                    const actual = (result.registers.de.high << 8) | result.registers.de.low;
                    expect(actual).toBe(expected);
                    expect(result.flags.c).toBe(expectedCarry);
                    expect(result.flags.v).toBe(((expected >> 15) & 1) !== (expectedCarry ? 1 : 0));
                },
            ),
            { numRuns: 40 },
        );
    });
});
