export default [
    {
        name: "an odd byte",
        setup: { memory: { 0x2000: 0x35 } },
        expect: { memory: { 0x2000: 0x35, 0x2001: 0x01 } },
    },
    {
        name: "an even byte",
        setup: { memory: { 0x2000: 0x34 } },
        expect: { memory: { 0x2000: 0x34, 0x2001: 0x00 } },
    },
    {
        name: "zero is even",
        setup: { memory: { 0x2000: 0x00 } },
        expect: { memory: { 0x2001: 0x00 } },
    },
    {
        // All bits set: every bit except the one being tested is a
        // distraction, and only bit 0 decides the answer.
        name: "every bit set",
        setup: { memory: { 0x2000: 0xff } },
        expect: { memory: { 0x2001: 0x01 } },
    },
    {
        // Only the top bit set. A rotate in the wrong direction reports this
        // one as odd.
        name: "only the top bit set",
        setup: { memory: { 0x2000: 0x80 } },
        expect: { memory: { 0x2001: 0x00 } },
    },
    {
        // RAR and RAL bring the previous carry into the byte. With only one
        // rotation that cannot change the answer, but a case that starts with
        // carry set makes the difference visible if you experiment.
        name: "an odd byte with the carry flag already set",
        setup: { memory: { 0x2000: 0x01 }, flags: { cy: true } },
        expect: { memory: { 0x2001: 0x01 } },
    },
];

// Masking with ANI is the practical answer for one fixed bit, and useless for
// the loop in step 2. The brief says so; this is not a hidden rule.
export const constraints = {
    mustNotUse: ["ANI"],
};
