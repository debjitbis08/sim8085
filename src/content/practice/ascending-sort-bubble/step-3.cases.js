export default [
    {
        name: "an array in reverse order",
        setup: { memoryRange: { start: 0x2000, bytes: [5, 0x05, 0x04, 0x03, 0x02, 0x01] } },
        expect: {
            memory: { 0x2001: 0x01, 0x2002: 0x02, 0x2003: 0x03, 0x2004: 0x04, 0x2005: 0x05 },
        },
    },
    {
        // The smallest element moves left by only one place per pass, so
        // this array needs three passes and a single pass is visibly wrong.
        name: "the smallest element starts at the end",
        setup: { memoryRange: { start: 0x2000, bytes: [4, 0x40, 0x50, 0x60, 0x10] } },
        expect: { memory: { 0x2001: 0x10, 0x2002: 0x40, 0x2003: 0x50, 0x2004: 0x60 } },
    },
    {
        name: "an array already sorted",
        setup: { memoryRange: { start: 0x2000, bytes: [4, 0x11, 0x22, 0x33, 0x44] } },
        expect: { memory: { 0x2001: 0x11, 0x2002: 0x22, 0x2003: 0x33, 0x2004: 0x44 } },
    },
    {
        name: "two elements",
        setup: { memoryRange: { start: 0x2000, bytes: [2, 0x99, 0x11] } },
        expect: { memory: { 0x2001: 0x11, 0x2002: 0x99 } },
    },
    {
        // Duplicates must survive: a sort that overwrites rather than swaps
        // loses one of the 33s and gains an extra copy of something else.
        name: "duplicate values",
        setup: { memoryRange: { start: 0x2000, bytes: [5, 0x33, 0x11, 0x33, 0x22, 0x11] } },
        expect: {
            memory: { 0x2001: 0x11, 0x2002: 0x11, 0x2003: 0x22, 0x2004: 0x33, 0x2005: 0x33 },
        },
    },
    {
        // Unsigned order: 01 < 7F < 80 < FF. A sign-flag comparison sorts
        // these into 80 FF 01 7F instead.
        name: "bytes on both sides of the top-bit boundary",
        setup: { memoryRange: { start: 0x2000, bytes: [4, 0xff, 0x01, 0x80, 0x7f] } },
        expect: { memory: { 0x2001: 0x01, 0x2002: 0x7f, 0x2003: 0x80, 0x2004: 0xff } },
    },
    {
        name: "an array containing zeroes",
        setup: { memoryRange: { start: 0x2000, bytes: [5, 0x00, 0x09, 0x00, 0x07, 0x00] } },
        expect: {
            memory: { 0x2001: 0x00, 0x2002: 0x00, 0x2003: 0x00, 0x2004: 0x07, 0x2005: 0x09 },
        },
    },
    {
        // The count byte sits immediately below the array and the marker
        // immediately above it. Neither is part of the data.
        name: "the count and the byte past the end are left alone",
        setup: {
            memoryRange: { start: 0x2000, bytes: [3, 0x30, 0x10, 0x20] },
            memory: { 0x2004: 0x6d },
        },
        expect: { memory: { 0x2000: 3, 0x2001: 0x10, 0x2002: 0x20, 0x2003: 0x30, 0x2004: 0x6d } },
    },
];
