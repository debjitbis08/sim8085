export default [
    {
        name: "the largest is in the middle",
        setup: { memoryRange: { start: 0x2000, bytes: [5, 0x12, 0x34, 0x7a, 0x22, 0x05] } },
        expect: { memory: { 0x2050: 0x7a } },
    },
    {
        // Catches a loop that stops one element early.
        name: "the largest is the last element",
        setup: { memoryRange: { start: 0x2000, bytes: [4, 0x10, 0x20, 0x30, 0x40] } },
        expect: { memory: { 0x2050: 0x40 } },
    },
    {
        // Catches a loop that skips the first element, which is easy to do
        // when the first element is also the starting candidate.
        name: "the largest is the first element",
        setup: { memoryRange: { start: 0x2000, bytes: [4, 0x40, 0x30, 0x20, 0x10] } },
        expect: { memory: { 0x2050: 0x40 } },
    },
    {
        name: "an array of one element",
        setup: { memory: { 0x2000: 1, 0x2001: 0x63 } },
        expect: { memory: { 0x2050: 0x63 } },
    },
    {
        name: "every element the same",
        setup: { memoryRange: { start: 0x2000, bytes: [3, 0x2a, 0x2a, 0x2a] } },
        expect: { memory: { 0x2050: 0x2a } },
    },
    {
        // Bytes on both sides of the signed/unsigned boundary. A sign-flag
        // comparison picks 7FH here.
        name: "bytes with the top bit set",
        setup: { memoryRange: { start: 0x2000, bytes: [4, 0x7f, 0x80, 0x01, 0xff] } },
        expect: { memory: { 0x2050: 0xff } },
    },
    {
        name: "a zero among the elements",
        setup: { memoryRange: { start: 0x2000, bytes: [4, 0x00, 0x09, 0x00, 0x03] } },
        expect: { memory: { 0x2050: 0x09 } },
    },
    {
        name: "the array is left untouched",
        setup: { memoryRange: { start: 0x2000, bytes: [3, 0x08, 0x99, 0x11] } },
        expect: {
            memory: { 0x2000: 3, 0x2001: 0x08, 0x2002: 0x99, 0x2003: 0x11, 0x2050: 0x99 },
        },
    },
];
