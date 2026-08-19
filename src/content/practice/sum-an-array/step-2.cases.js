export default [
    {
        name: "three small bytes",
        setup: { memoryRange: { start: 0x2000, bytes: [3, 0x10, 0x20, 0x30] } },
        expect: { registers: { a: 0x60 }, memory: { 0x2050: 0x60 } },
    },
    {
        // Kills a solution that forgets to zero the accumulator: A happens to
        // start at 00H anyway, so only a case with a non-zero starting A can
        // catch it.
        name: "the accumulator is not assumed to start at zero",
        setup: {
            memoryRange: { start: 0x2000, bytes: [2, 0x01, 0x02] },
            registers: { a: 0xff },
        },
        expect: { registers: { a: 0x03 }, memory: { 0x2050: 0x03 } },
    },
    {
        name: "a single byte",
        setup: { memory: { 0x2000: 1, 0x2001: 0x7f } },
        expect: { registers: { a: 0x7f }, memory: { 0x2050: 0x7f } },
    },
    {
        // The total wraps past a byte; only the low eight bits are stored.
        name: "a total that overflows one byte",
        setup: { memoryRange: { start: 0x2000, bytes: [3, 0xff, 0xff, 0x03] } },
        expect: { registers: { a: 0x01 }, memory: { 0x2050: 0x01 } },
    },
    {
        name: "the array is left untouched",
        setup: { memoryRange: { start: 0x2000, bytes: [2, 0x12, 0x34] } },
        expect: { memory: { 0x2000: 2, 0x2001: 0x12, 0x2002: 0x34, 0x2050: 0x46 } },
    },
];
