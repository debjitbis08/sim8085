export default [
    {
        // 1234H + 1111H = 2345H, with no carry anywhere.
        name: "no carry at all",
        setup: { memoryRange: { start: 0x2000, bytes: [0x34, 0x12, 0x11, 0x11] } },
        expect: { memory: { 0x2004: 0x45, 0x2005: 0x23 }, flags: { cy: false } },
    },
    {
        // 12FFH + 0001H = 1300H. The low bytes carry into the high bytes,
        // which is what ADD-then-ADD gets wrong: it would give 1200H.
        name: "the low byte carries into the high byte",
        setup: { memoryRange: { start: 0x2000, bytes: [0xff, 0x12, 0x01, 0x00] } },
        expect: { memory: { 0x2004: 0x00, 0x2005: 0x13 }, flags: { cy: false } },
    },
    {
        // FFFFH + 0002H = 10001H, which does not fit in 16 bits.
        name: "a sum too large for 16 bits",
        setup: { memoryRange: { start: 0x2000, bytes: [0xff, 0xff, 0x02, 0x00] } },
        expect: { memory: { 0x2004: 0x01, 0x2005: 0x00 }, flags: { cy: true } },
    },
    {
        // 8000H + 8000H = 10000H exactly: the carry comes out of the high
        // bytes rather than the low ones.
        name: "a carry out of the high byte only",
        setup: { memoryRange: { start: 0x2000, bytes: [0x00, 0x80, 0x00, 0x80] } },
        expect: { memory: { 0x2004: 0x00, 0x2005: 0x00 }, flags: { cy: true } },
    },
    {
        name: "zero plus zero",
        setup: { memoryRange: { start: 0x2000, bytes: [0x00, 0x00, 0x00, 0x00] } },
        expect: { memory: { 0x2004: 0x00, 0x2005: 0x00 }, flags: { cy: false } },
    },
    {
        name: "the inputs are left untouched",
        setup: { memoryRange: { start: 0x2000, bytes: [0x78, 0x56, 0x21, 0x43] } },
        expect: {
            memory: {
                0x2000: 0x78,
                0x2001: 0x56,
                0x2002: 0x21,
                0x2003: 0x43,
                0x2004: 0x99,
                0x2005: 0x99,
            },
        },
    },
];

// The whole point of this step is to watch the carry travel between two 8-bit
// additions. DAD would hide it.
export const constraints = {
    mustUse: ["ADC"],
    mustNotUse: ["DAD"],
};
