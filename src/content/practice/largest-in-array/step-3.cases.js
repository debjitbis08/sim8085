export default [
    {
        name: "largest and smallest in the middle",
        setup: { memoryRange: { start: 0x2000, bytes: [5, 0x12, 0x7a, 0x05, 0x34, 0x22] } },
        expect: { memory: { 0x2050: 0x7a, 0x2051: 0x05 } },
    },
    {
        // Catches a smallest that was started at 00H: nothing here is zero,
        // so such a program answers 00H.
        name: "an array with no zero in it",
        setup: { memoryRange: { start: 0x2000, bytes: [4, 0x33, 0x44, 0x22, 0x55] } },
        expect: { memory: { 0x2050: 0x55, 0x2051: 0x22 } },
    },
    {
        // Catches a largest that was started at FFH by mirroring the wrong
        // constant across from the smallest.
        name: "an array with no FFH in it",
        setup: { memoryRange: { start: 0x2000, bytes: [3, 0x80, 0x40, 0xfe] } },
        expect: { memory: { 0x2050: 0xfe, 0x2051: 0x40 } },
    },
    {
        name: "the answers are at opposite ends",
        setup: { memoryRange: { start: 0x2000, bytes: [4, 0x01, 0x50, 0x60, 0xf0] } },
        expect: { memory: { 0x2050: 0xf0, 0x2051: 0x01 } },
    },
    {
        name: "an array of one element is both answers",
        setup: { memory: { 0x2000: 1, 0x2001: 0x63 } },
        expect: { memory: { 0x2050: 0x63, 0x2051: 0x63 } },
    },
    {
        name: "every element the same",
        setup: { memoryRange: { start: 0x2000, bytes: [3, 0x2a, 0x2a, 0x2a] } },
        expect: { memory: { 0x2050: 0x2a, 0x2051: 0x2a } },
    },
    {
        // Unsigned order across the top-bit boundary, for both answers at once.
        name: "bytes on both sides of the top bit",
        setup: { memoryRange: { start: 0x2000, bytes: [4, 0x7f, 0x80, 0x01, 0xff] } },
        expect: { memory: { 0x2050: 0xff, 0x2051: 0x01 } },
    },
    {
        name: "the array is left untouched",
        setup: { memoryRange: { start: 0x2000, bytes: [3, 0x08, 0x99, 0x11] } },
        expect: {
            memory: {
                0x2000: 3,
                0x2001: 0x08,
                0x2002: 0x99,
                0x2003: 0x11,
                0x2050: 0x99,
                0x2051: 0x08,
            },
        },
    },
];
