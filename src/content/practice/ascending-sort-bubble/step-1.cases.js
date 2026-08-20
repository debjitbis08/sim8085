export default [
    {
        name: "out of order, so they swap",
        setup: { memory: { 0x2001: 0x08, 0x2002: 0x03 } },
        expect: { memory: { 0x2001: 0x03, 0x2002: 0x08 } },
    },
    {
        name: "already in order, so nothing happens",
        setup: { memory: { 0x2001: 0x03, 0x2002: 0x08 } },
        expect: { memory: { 0x2001: 0x03, 0x2002: 0x08 } },
    },
    {
        // Whether an equal pair is swapped or left alone cannot be observed,
        // which is why one conditional jump is enough.
        name: "equal bytes",
        setup: { memory: { 0x2001: 0x44, 0x2002: 0x44 } },
        expect: { memory: { 0x2001: 0x44, 0x2002: 0x44 } },
    },
    {
        // FFH is the largest unsigned byte. A sign-flag comparison decides it
        // is the smallest and leaves this pair alone.
        name: "the largest byte on the left",
        setup: { memory: { 0x2001: 0xff, 0x2002: 0x01 } },
        expect: { memory: { 0x2001: 0x01, 0x2002: 0xff } },
    },
    {
        // The same boundary from the other side: 7FH is genuinely smaller
        // than 80H unsigned, so this pair must not move.
        name: "either side of the top bit, already in order",
        setup: { memory: { 0x2001: 0x7f, 0x2002: 0x80 } },
        expect: { memory: { 0x2001: 0x7f, 0x2002: 0x80 } },
    },
    {
        // Catches a swap that copies one byte over the other instead of
        // exchanging them, and a pointer that wanders outside the pair.
        name: "the neighbouring bytes are left alone",
        setup: { memory: { 0x2000: 0x5e, 0x2001: 0x20, 0x2002: 0x10, 0x2003: 0x6d } },
        expect: { memory: { 0x2000: 0x5e, 0x2001: 0x10, 0x2002: 0x20, 0x2003: 0x6d } },
    },
];
