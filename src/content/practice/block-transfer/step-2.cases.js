export default [
    {
        // A forward copy turns this into 11 11 11 11.
        name: "three distinct bytes",
        setup: { memoryRange: { start: 0x2000, bytes: [3, 0x11, 0x22, 0x33] } },
        expect: { memory: { 0x2002: 0x11, 0x2003: 0x22, 0x2004: 0x33 } },
    },
    {
        name: "a single byte",
        setup: { memory: { 0x2000: 1, 0x2001: 0x5a } },
        expect: { memory: { 0x2002: 0x5a } },
    },
    {
        name: "five bytes",
        setup: { memoryRange: { start: 0x2000, bytes: [5, 0x01, 0x02, 0x03, 0x04, 0x05] } },
        expect: {
            memory: { 0x2002: 0x01, 0x2003: 0x02, 0x2004: 0x03, 0x2005: 0x04, 0x2006: 0x05 },
        },
    },
    {
        // The count byte and the first source byte are below everything that
        // gets written, so they must come out unchanged.
        name: "the count and the first byte are left alone",
        setup: { memoryRange: { start: 0x2000, bytes: [3, 0xaa, 0xbb, 0xcc] } },
        expect: { memory: { 0x2000: 3, 0x2001: 0xaa, 0x2002: 0xaa, 0x2003: 0xbb, 0x2004: 0xcc } },
    },
    {
        // Nothing beyond the shifted block should be written.
        name: "nothing is written past the end",
        setup: {
            memoryRange: { start: 0x2000, bytes: [2, 0x71, 0x72] },
            memory: { 0x2004: 0x3c },
        },
        expect: { memory: { 0x2002: 0x71, 0x2003: 0x72, 0x2004: 0x3c } },
    },
    {
        name: "a block containing zeroes",
        setup: { memoryRange: { start: 0x2000, bytes: [4, 0x00, 0x09, 0x00, 0x07] } },
        expect: { memory: { 0x2002: 0x00, 0x2003: 0x09, 0x2004: 0x00, 0x2005: 0x07 } },
    },
];
