export default [
    {
        name: "the first byte is larger",
        setup: { memory: { 0x2000: 0x4a, 0x2001: 0x25 } },
        expect: { memory: { 0x2002: 0x4a } },
    },
    {
        name: "the second byte is larger",
        setup: { memory: { 0x2000: 0x25, 0x2001: 0x4a } },
        expect: { memory: { 0x2002: 0x4a } },
    },
    {
        // The case that fails a sign-flag comparison: FFH is the largest
        // unsigned byte, but FFH - 01H = FEH looks "negative" to JM.
        name: "the largest byte against the smallest non-zero one",
        setup: { memory: { 0x2000: 0xff, 0x2001: 0x01 } },
        expect: { memory: { 0x2002: 0xff } },
    },
    {
        // The same trap from the other side, and the exact boundary of the
        // signed/unsigned disagreement.
        name: "either side of the top bit",
        setup: { memory: { 0x2000: 0x7f, 0x2001: 0x80 } },
        expect: { memory: { 0x2002: 0x80 } },
    },
    {
        name: "equal bytes",
        setup: { memory: { 0x2000: 0x33, 0x2001: 0x33 } },
        expect: { memory: { 0x2002: 0x33 } },
    },
    {
        name: "the operands are left untouched",
        setup: { memory: { 0x2000: 0x12, 0x2001: 0x34 } },
        expect: { memory: { 0x2000: 0x12, 0x2001: 0x34, 0x2002: 0x34 } },
    },
];
