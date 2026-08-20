export default [
    {
        name: "no bits set",
        setup: { memory: { 0x2000: 0x00 } },
        expect: { memory: { 0x2000: 0x00, 0x2001: 0x00 } },
    },
    {
        name: "every bit set",
        setup: { memory: { 0x2000: 0xff } },
        expect: { memory: { 0x2001: 0x08 } },
    },
    {
        // Only the lowest bit. A loop that rotates one time too few still
        // finds this one.
        name: "only the lowest bit",
        setup: { memory: { 0x2000: 0x01 } },
        expect: { memory: { 0x2001: 0x01 } },
    },
    {
        // Only the highest bit, which is the last one to reach the carry
        // flag when rotating right. A loop that runs seven times misses it.
        name: "only the highest bit",
        setup: { memory: { 0x2000: 0x80 } },
        expect: { memory: { 0x2001: 0x01 } },
    },
    {
        name: "alternating bits",
        setup: { memory: { 0x2000: 0xaa } },
        expect: { memory: { 0x2001: 0x04 } },
    },
    {
        name: "the low nibble only",
        setup: { memory: { 0x2000: 0x0f } },
        expect: { memory: { 0x2001: 0x04 } },
    },
    {
        // Catches a tally or a counter that was never initialised, whichever
        // registers the solution happens to use.
        name: "no register starts at zero",
        setup: {
            memory: { 0x2000: 0x03 },
            registers: { a: 0x77, b: 0x33, c: 0x44, d: 0x55, e: 0x66, h: 0x12, l: 0x34 },
            flags: { cy: true },
        },
        expect: { memory: { 0x2001: 0x02 } },
    },
];
