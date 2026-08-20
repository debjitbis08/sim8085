export default [
    {
        name: "two different bytes",
        setup: { memory: { 0x2000: 0x11, 0x2001: 0x22 } },
        expect: { memory: { 0x2000: 0x22, 0x2001: 0x11 } },
    },
    {
        // Catches the commonest wrong answer of all: copying 2000H over
        // 2001H and then copying it back, which leaves both bytes equal.
        name: "a value that must not be duplicated",
        setup: { memory: { 0x2000: 0xa5, 0x2001: 0x5a } },
        expect: { memory: { 0x2000: 0x5a, 0x2001: 0xa5 } },
    },
    {
        name: "equal bytes, where a swap changes nothing",
        setup: { memory: { 0x2000: 0x77, 0x2001: 0x77 } },
        expect: { memory: { 0x2000: 0x77, 0x2001: 0x77 } },
    },
    {
        name: "the extremes of a byte",
        setup: { memory: { 0x2000: 0x00, 0x2001: 0xff } },
        expect: { memory: { 0x2000: 0xff, 0x2001: 0x00 } },
    },
    {
        // The pointer must not wander past the pair it was given.
        name: "the neighbouring byte is left alone",
        setup: { memory: { 0x2000: 0x01, 0x2001: 0x02, 0x2002: 0x99 } },
        expect: { memory: { 0x2000: 0x02, 0x2001: 0x01, 0x2002: 0x99 } },
    },
];
