export default [
    {
        // The case this step exists for. Without a guard the loop runs 256
        // times and stores 2A00H.
        name: "a multiplier of zero",
        setup: { memory: { 0x2000: 0x2a, 0x2001: 0x00 } },
        expect: { memory: { 0x2002: 0x00, 0x2003: 0x00 } },
    },
    {
        // Both inputs zero. A guard that tests the multiplicand instead of
        // the multiplier passes this one and fails the case above.
        name: "both inputs zero",
        setup: { memory: { 0x2000: 0x00, 0x2001: 0x00 } },
        expect: { memory: { 0x2002: 0x00, 0x2003: 0x00 } },
    },
    {
        // The multiplicand is FFH, so an unguarded loop stores FF00H here.
        name: "the largest multiplicand times zero",
        setup: { memory: { 0x2000: 0xff, 0x2001: 0x00 } },
        expect: { memory: { 0x2002: 0x00, 0x2003: 0x00 } },
    },
    {
        name: "a multiplicand of zero",
        setup: { memory: { 0x2000: 0x00, 0x2001: 0x2a } },
        expect: { memory: { 0x2002: 0x00, 0x2003: 0x00 } },
    },
    {
        // The rest are step 2 again: the guard must not break what worked.
        name: "the largest possible product still works",
        setup: { memory: { 0x2000: 0xff, 0x2001: 0xff } },
        expect: { memory: { 0x2002: 0x01, 0x2003: 0xfe } },
    },
    {
        name: "a two-byte product still works",
        setup: { memory: { 0x2000: 0x10, 0x2001: 0x10 } },
        expect: { memory: { 0x2002: 0x00, 0x2003: 0x01 } },
    },
    {
        name: "multiplying by one still works",
        setup: { memory: { 0x2000: 0x7d, 0x2001: 0x01 } },
        expect: { memory: { 0x2002: 0x7d, 0x2003: 0x00 } },
    },
    {
        name: "no register starts at zero",
        setup: {
            memory: { 0x2000: 0x0a, 0x2001: 0x00 },
            registers: { a: 0x77, b: 0x33, c: 0x44, d: 0x55, e: 0x66, h: 0x12, l: 0x34 },
            flags: { cy: true, z: true },
        },
        expect: { memory: { 0x2002: 0x00, 0x2003: 0x00 } },
    },
    {
        name: "the inputs are left untouched",
        setup: { memory: { 0x2000: 0x64, 0x2001: 0x00 } },
        expect: { memory: { 0x2000: 0x64, 0x2001: 0x00, 0x2002: 0x00, 0x2003: 0x00 } },
    },
];

export const constraints = {
    mustUse: ["DAD"],
};
