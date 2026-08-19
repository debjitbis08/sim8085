// HL must finish just past the last byte, which is what makes the loop run
// exactly `count` times. A loop that decrements before it advances runs one
// time too few and still looks plausible, so several counts are checked.
export default [
    {
        name: "three bytes",
        setup: { memory: { 0x2000: 3, 0x2001: 0x10, 0x2002: 0x20, 0x2003: 0x30 } },
        expect: { registers: { h: 0x20, l: 0x04, c: 0x00 } },
    },
    {
        // The case that kills a loop which tests the counter before advancing:
        // it would stop with HL at 2001H instead of 2002H.
        name: "a single byte",
        setup: { memory: { 0x2000: 1, 0x2001: 0x42 } },
        expect: { registers: { h: 0x20, l: 0x02, c: 0x00 } },
    },
    {
        name: "five bytes",
        setup: { memoryRange: { start: 0x2000, bytes: [5, 1, 2, 3, 4, 5] } },
        expect: { registers: { h: 0x20, l: 0x06, c: 0x00 } },
    },
    {
        // Walking the array must not disturb it.
        name: "the array is left untouched",
        setup: { memory: { 0x2000: 2, 0x2001: 0xaa, 0x2002: 0xbb } },
        expect: { memory: { 0x2000: 2, 0x2001: 0xaa, 0x2002: 0xbb } },
    },
];
