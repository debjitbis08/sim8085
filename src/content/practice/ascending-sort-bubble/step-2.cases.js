// One pass is completely deterministic, so these expect the exact array the
// pass produces — not a sorted one.
export default [
    {
        // 05 03 08 -> swap the first pair, leave the second.
        name: "one swap out of two comparisons",
        setup: { memoryRange: { start: 0x2000, bytes: [3, 0x05, 0x03, 0x08] } },
        expect: { memory: { 0x2001: 0x03, 0x2002: 0x05, 0x2003: 0x08 } },
    },
    {
        // 08 05 03 -> 05 08 03 -> 05 03 08. The largest reaches the end, and
        // the rest is still unsorted, which is what a single pass promises.
        name: "the largest byte travels to the end",
        setup: { memoryRange: { start: 0x2000, bytes: [3, 0x08, 0x05, 0x03] } },
        expect: { memory: { 0x2001: 0x05, 0x2002: 0x03, 0x2003: 0x08 } },
    },
    {
        name: "an array already in order is left alone",
        setup: { memoryRange: { start: 0x2000, bytes: [4, 0x01, 0x02, 0x03, 0x04] } },
        expect: { memory: { 0x2001: 0x01, 0x2002: 0x02, 0x2003: 0x03, 0x2004: 0x04 } },
    },
    {
        name: "two elements in the wrong order",
        setup: { memoryRange: { start: 0x2000, bytes: [2, 0x02, 0x01] } },
        expect: { memory: { 0x2001: 0x01, 0x2002: 0x02 } },
    },
    {
        // 04 04 02 04 -> equal pair unchanged, then 04 and 02 swap, then the
        // last pair is equal: 04 02 04 04.
        name: "equal neighbours",
        setup: { memoryRange: { start: 0x2000, bytes: [4, 0x04, 0x04, 0x02, 0x04] } },
        expect: { memory: { 0x2001: 0x04, 0x2002: 0x02, 0x2003: 0x04, 0x2004: 0x04 } },
    },
    {
        // FFH is the largest unsigned byte. A sign-flag comparison decides it
        // is the smallest and leaves the pair alone.
        name: "bytes with the top bit set",
        setup: { memoryRange: { start: 0x2000, bytes: [2, 0xff, 0x01] } },
        expect: { memory: { 0x2001: 0x01, 0x2002: 0xff } },
    },
    {
        // The pass must not run past the last pair: a marker one byte beyond
        // the array has to survive.
        name: "nothing past the end of the array is touched",
        setup: {
            memoryRange: { start: 0x2000, bytes: [3, 0x03, 0x02, 0x01] },
            memory: { 0x2004: 0x6d },
        },
        expect: { memory: { 0x2000: 3, 0x2001: 0x02, 0x2002: 0x01, 0x2003: 0x03, 0x2004: 0x6d } },
    },
];
