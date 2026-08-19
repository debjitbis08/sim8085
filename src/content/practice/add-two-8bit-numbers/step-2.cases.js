export default [
    {
        name: "a sum that fits in one byte",
        setup: { memory: { 0x2000: 0x3a, 0x2001: 0x27 } },
        expect: { registers: { a: 0x61 }, memory: { 0x2002: 0x61 }, flags: { cy: false } },
    },
    {
        name: "a sum that overflows into the carry flag",
        setup: { memory: { 0x2000: 0xff, 0x2001: 0x02 } },
        expect: { registers: { a: 0x01 }, memory: { 0x2002: 0x01 }, flags: { cy: true } },
    },
    {
        // 80H + 7FH is FFH exactly: the boundary where carry is still clear.
        name: "the largest sum that still fits",
        setup: { memory: { 0x2000: 0x80, 0x2001: 0x7f } },
        expect: { memory: { 0x2002: 0xff }, flags: { cy: false } },
    },
    {
        name: "zero plus zero sets the zero flag",
        setup: { memory: { 0x2000: 0x00, 0x2001: 0x00 } },
        expect: { memory: { 0x2002: 0x00 }, flags: { z: true, cy: false } },
    },
    {
        // Catches a solution that writes the result over one of its inputs.
        name: "the operands are left untouched",
        setup: { memory: { 0x2000: 0x12, 0x2001: 0x34 } },
        expect: { memory: { 0x2000: 0x12, 0x2001: 0x34, 0x2002: 0x46 } },
    },
];

// Same reason as step 1: the pointer already sits on 2001H, so walking it
// forward is the lesson. LDA/STA would pass the cases and miss the point.
export const constraints = {
    mustNotUse: ["LDA", "STA"],
};
