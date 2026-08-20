export default [
    {
        name: "two different bytes",
        setup: { memory: { 0x2000: 0x11, 0x3000: 0x22 } },
        expect: { memory: { 0x2000: 0x22, 0x3000: 0x11 } },
    },
    {
        name: "a value that must not be duplicated",
        setup: { memory: { 0x2000: 0xa5, 0x3000: 0x5a } },
        expect: { memory: { 0x2000: 0x5a, 0x3000: 0xa5 } },
    },
    {
        name: "equal bytes, where a swap changes nothing",
        setup: { memory: { 0x2000: 0x42, 0x3000: 0x42 } },
        expect: { memory: { 0x2000: 0x42, 0x3000: 0x42 } },
    },
    {
        name: "the extremes of a byte",
        setup: { memory: { 0x2000: 0x00, 0x3000: 0xff } },
        expect: { memory: { 0x2000: 0xff, 0x3000: 0x00 } },
    },
    {
        // Neither pointer should have moved off the byte it was given.
        name: "the bytes on either side are left alone",
        setup: { memory: { 0x2000: 0x01, 0x2001: 0x88, 0x3000: 0x02, 0x3001: 0x99 } },
        expect: { memory: { 0x2000: 0x02, 0x2001: 0x88, 0x3000: 0x01, 0x3001: 0x99 } },
    },
];

// The addresses are fixed, so LDA/STA would pass every case above. The rule
// is what makes this the two-pointer exercise it is meant to be, and the
// brief says so rather than leaving it as a trap.
export const constraints = {
    mustUse: ["LDAX", "STAX"],
    mustNotUse: ["LDA", "STA"],
};
