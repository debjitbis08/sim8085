export default [
    {
        // The point of the step: 16 elements already in order. One pass is
        // enough to know that, and the previous step's answer spends about
        // 10400 T-states discovering it 15 times over.
        name: "an array already sorted, under a time limit",
        setup: { memoryRange: { start: 0x2000, bytes: [16, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f, 0x20] } },
        expect: {
            memoryRange: { start: 0x2001, bytes: [0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f, 0x20] },
            maxTstates: 3000,
        },
    },
    {
        // Sorted apart from the first two, so a correct early exit needs one
        // swapping pass and one confirming pass, and no more. This is the
        // case that catches a flag cleared once before the outer loop instead
        // of at the top of every pass: such a program is set on pass 1, never
        // cleared again, and grinds through all 15 passes. Its answer is
        // still correct, so only the clock can tell.
        name: "a nearly sorted array, under a time limit",
        setup: { memoryRange: { start: 0x2000, bytes: [16, 0x12, 0x11, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f, 0x20] } },
        expect: {
            memoryRange: { start: 0x2001, bytes: [0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f, 0x20] },
            maxTstates: 4000,
        },
    },
    {
        // Sorted apart from the last two, so exactly two passes are needed:
        // one to fix the pair, one to notice there is nothing left to do.
        name: "an array that needs a second pass to confirm",
        setup: { memoryRange: { start: 0x2000, bytes: [8, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x18, 0x17] } },
        expect: { memoryRange: { start: 0x2001, bytes: [0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18] } },
    },
    {
        // Stopping early must not mean stopping too early: the worst case
        // still needs every pass.
        name: "an array in reverse order",
        setup: { memoryRange: { start: 0x2000, bytes: [5, 0x05, 0x04, 0x03, 0x02, 0x01] } },
        expect: {
            memory: { 0x2001: 0x01, 0x2002: 0x02, 0x2003: 0x03, 0x2004: 0x04, 0x2005: 0x05 },
        },
    },
    {
        // The 10H has to travel one place per pass, so this needs every one
        // of the four passes. It catches a flag cleared inside the inner loop
        // rather than at the top of the pass: such a flag describes only the
        // last pair compared, reports "no swaps" while the 10H is still
        // stranded, and stops with the array unsorted.
        name: "an element that has to travel the whole way",
        setup: { memoryRange: { start: 0x2000, bytes: [5, 0x40, 0x50, 0x60, 0x70, 0x10] } },
        expect: {
            memory: { 0x2001: 0x10, 0x2002: 0x40, 0x2003: 0x50, 0x2004: 0x60, 0x2005: 0x70 },
        },
    },
    {
        name: "two elements",
        setup: { memoryRange: { start: 0x2000, bytes: [2, 0x99, 0x11] } },
        expect: { memory: { 0x2001: 0x11, 0x2002: 0x99 } },
    },
    {
        name: "duplicate values",
        setup: { memoryRange: { start: 0x2000, bytes: [5, 0x33, 0x11, 0x33, 0x22, 0x11] } },
        expect: {
            memory: { 0x2001: 0x11, 0x2002: 0x11, 0x2003: 0x22, 0x2004: 0x33, 0x2005: 0x33 },
        },
    },
    {
        name: "bytes on both sides of the top-bit boundary",
        setup: { memoryRange: { start: 0x2000, bytes: [4, 0xff, 0x01, 0x80, 0x7f] } },
        expect: { memory: { 0x2001: 0x01, 0x2002: 0x7f, 0x2003: 0x80, 0x2004: 0xff } },
    },
    {
        name: "the count and the byte past the end are left alone",
        setup: {
            memoryRange: { start: 0x2000, bytes: [3, 0x30, 0x10, 0x20] },
            memory: { 0x2004: 0x6d },
        },
        expect: { memory: { 0x2000: 3, 0x2001: 0x10, 0x2002: 0x20, 0x2003: 0x30, 0x2004: 0x6d } },
    },
];
