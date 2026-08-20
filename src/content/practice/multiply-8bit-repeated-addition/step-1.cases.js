// Every multiplier here is at least 1: this step is about building the loop,
// and the zero case gets a step of its own.
export default [
    {
        name: "a small product",
        setup: { memory: { 0x2000: 0x05, 0x2001: 0x03 } },
        expect: { memory: { 0x2002: 0x0f } },
    },
    {
        // 10H * 0FH = F0H, the largest product that still fits in a byte here.
        name: "a product that nearly fills the byte",
        setup: { memory: { 0x2000: 0x10, 0x2001: 0x0f } },
        expect: { memory: { 0x2002: 0xf0 } },
    },
    {
        name: "multiplying by one",
        setup: { memory: { 0x2000: 0x7d, 0x2001: 0x01 } },
        expect: { memory: { 0x2002: 0x7d } },
    },
    {
        // The longest run this step asks for: 255 turns, each adding 01H.
        // It reaches FFH exactly, so a loop that runs one turn too many or
        // too few is off by one in the answer as well.
        name: "multiplying one by something large",
        setup: { memory: { 0x2000: 0x01, 0x2001: 0xff } },
        expect: { memory: { 0x2002: 0xff } },
    },
    {
        // Here the loop does run — 42 times — and adds nothing each time.
        name: "a multiplicand of zero",
        setup: { memory: { 0x2000: 0x00, 0x2001: 0x2a } },
        expect: { memory: { 0x2002: 0x00 } },
    },
    {
        // Catches a running total that was never cleared.
        name: "no register starts at zero",
        setup: {
            memory: { 0x2000: 0x04, 0x2001: 0x04 },
            registers: { a: 0x77, b: 0x33, c: 0x44, d: 0x55, e: 0x66, h: 0x12, l: 0x34 },
            flags: { cy: true, z: true },
        },
        expect: { memory: { 0x2002: 0x10 } },
    },
    {
        name: "the inputs are left untouched",
        setup: { memory: { 0x2000: 0x09, 0x2001: 0x08 } },
        expect: { memory: { 0x2000: 0x09, 0x2001: 0x08, 0x2002: 0x48 } },
    },
];
