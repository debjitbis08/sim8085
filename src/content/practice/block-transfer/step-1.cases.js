export default [
    {
        name: "three bytes",
        setup: { memoryRange: { start: 0x2000, bytes: [3, 0x11, 0x22, 0x33] } },
        expect: { memory: { 0x3000: 0x11, 0x3001: 0x22, 0x3002: 0x33 } },
    },
    {
        // A loop that decrements before it copies does nothing at all here.
        name: "a single byte",
        setup: { memory: { 0x2000: 1, 0x2001: 0x5a } },
        expect: { memory: { 0x3000: 0x5a } },
    },
    {
        name: "five bytes",
        setup: { memoryRange: { start: 0x2000, bytes: [5, 0x01, 0x02, 0x03, 0x04, 0x05] } },
        expect: {
            memory: { 0x3000: 0x01, 0x3001: 0x02, 0x3002: 0x03, 0x3003: 0x04, 0x3004: 0x05 },
        },
    },
    {
        // A marker sits immediately after the destination block. Copying one
        // byte too many overwrites it.
        name: "nothing is written past the end of the destination",
        setup: {
            memoryRange: { start: 0x2000, bytes: [3, 0xaa, 0xbb, 0xcc] },
            memory: { 0x3003: 0x7e },
        },
        expect: { memory: { 0x3002: 0xcc, 0x3003: 0x7e } },
    },
    {
        name: "the source block is left untouched",
        setup: { memoryRange: { start: 0x2000, bytes: [4, 0x10, 0x20, 0x30, 0x40] } },
        expect: {
            memory: {
                0x2000: 4,
                0x2001: 0x10,
                0x2002: 0x20,
                0x2003: 0x30,
                0x2004: 0x40,
                0x3000: 0x10,
                0x3003: 0x40,
            },
        },
    },
    {
        // Zeroes are data too: a loop that stops on a zero byte rather than
        // on the counter fails here.
        name: "a block containing zeroes",
        setup: { memoryRange: { start: 0x2000, bytes: [4, 0x00, 0x09, 0x00, 0x07] } },
        expect: { memory: { 0x3000: 0x00, 0x3001: 0x09, 0x3002: 0x00, 0x3003: 0x07 } },
    },
];
