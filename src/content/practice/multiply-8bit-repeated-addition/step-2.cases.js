// Every multiplier here is at least 1. The zero multiplier is the next step,
// and it is the step where a program without a guard finally gets caught.
export default [
    {
        // The largest product two bytes can make.
        name: "the largest possible product",
        setup: { memory: { 0x2000: 0xff, 0x2001: 0xff } },
        expect: { memory: { 0x2002: 0x01, 0x2003: 0xfe } },
    },
    {
        // 10H * 10H = 0100H: the smallest product that needs the high byte.
        name: "the first product that needs two bytes",
        setup: { memory: { 0x2000: 0x10, 0x2001: 0x10 } },
        expect: { memory: { 0x2002: 0x00, 0x2003: 0x01 } },
    },
    {
        name: "a product that still fits in one byte",
        setup: { memory: { 0x2000: 0x05, 0x2001: 0x03 } },
        expect: { memory: { 0x2002: 0x0f, 0x2003: 0x00 } },
    },
    {
        // 80H * 02H = 0100H. A solution that leaves D uncleared is out by a
        // multiple of 256 and fails here even though the low byte is right.
        name: "a product whose low byte is zero",
        setup: { memory: { 0x2000: 0x80, 0x2001: 0x02 } },
        expect: { memory: { 0x2002: 0x00, 0x2003: 0x01 } },
    },
    {
        name: "a multiplicand of zero",
        setup: { memory: { 0x2000: 0x00, 0x2001: 0x2a } },
        expect: { memory: { 0x2002: 0x00, 0x2003: 0x00 } },
    },
    {
        name: "no register starts at zero",
        setup: {
            memory: { 0x2000: 0x0a, 0x2001: 0x0a },
            registers: { a: 0x77, b: 0x33, c: 0x44, d: 0x55, e: 0x66, h: 0x12, l: 0x34 },
            flags: { cy: true, z: true },
        },
        expect: { memory: { 0x2002: 0x64, 0x2003: 0x00 } },
    },
    {
        name: "the inputs are left untouched",
        setup: { memory: { 0x2000: 0x64, 0x2001: 0x64 } },
        expect: { memory: { 0x2000: 0x64, 0x2001: 0x64, 0x2002: 0x10, 0x2003: 0x27 } },
    },
];

export const constraints = {
    mustUse: ["DAD"],
};
