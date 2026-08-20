export default [
    {
        name: "no carry at all",
        setup: { memoryRange: { start: 0x2000, bytes: [0x34, 0x12, 0x11, 0x11] } },
        expect: { memory: { 0x2004: 0x45, 0x2005: 0x23 }, flags: { cy: false } },
    },
    {
        name: "the low byte carries into the high byte",
        setup: { memoryRange: { start: 0x2000, bytes: [0xff, 0x12, 0x01, 0x00] } },
        expect: { memory: { 0x2004: 0x00, 0x2005: 0x13 }, flags: { cy: false } },
    },
    {
        name: "a sum too large for 16 bits",
        setup: { memoryRange: { start: 0x2000, bytes: [0xff, 0xff, 0x02, 0x00] } },
        expect: { memory: { 0x2004: 0x01, 0x2005: 0x00 }, flags: { cy: true } },
    },
    {
        name: "a carry out of the high byte only",
        setup: { memoryRange: { start: 0x2000, bytes: [0x00, 0x80, 0x00, 0x80] } },
        expect: { memory: { 0x2004: 0x00, 0x2005: 0x00 }, flags: { cy: true } },
    },
    {
        // DAD leaves the zero flag alone, so this case says nothing about Z
        // on purpose — it is here to check the sum, not the flag.
        name: "zero plus zero",
        setup: { memoryRange: { start: 0x2000, bytes: [0x00, 0x00, 0x00, 0x00] } },
        expect: { memory: { 0x2004: 0x00, 0x2005: 0x00 }, flags: { cy: false } },
    },
    {
        // Catches a solution that loads the two numbers from the same
        // address, which passes any case where both numbers are equal.
        name: "two clearly different numbers",
        setup: { memoryRange: { start: 0x2000, bytes: [0x01, 0x00, 0x00, 0x10] } },
        expect: { memory: { 0x2004: 0x01, 0x2005: 0x10 }, flags: { cy: false } },
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

export const constraints = {
    mustUse: ["DAD"],
    mustNotUse: ["ADD", "ADC"],
};
