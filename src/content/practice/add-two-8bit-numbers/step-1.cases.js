export default [
    {
        name: "two ordinary values",
        setup: { memory: { 0x2000: 0x3a, 0x2001: 0x27 } },
        expect: { registers: { a: 0x3a, b: 0x27 } },
    },
    {
        // Distinct values, so loading them in the wrong order fails here even
        // though the sum in step 2 would come out right either way.
        name: "different values, to catch a swapped pair",
        setup: { memory: { 0x2000: 0x11, 0x2001: 0x22 } },
        expect: { registers: { a: 0x11, b: 0x22 } },
    },
    {
        name: "both bytes zero",
        setup: { memory: { 0x2000: 0x00, 0x2001: 0x00 } },
        expect: { registers: { a: 0x00, b: 0x00 } },
    },
    {
        name: "the largest byte a register can hold",
        setup: { memory: { 0x2000: 0xff, 0x2001: 0xff } },
        expect: { registers: { a: 0xff, b: 0xff } },
    },
];

// This step teaches HL-as-a-pointer. LDA would also load the byte, and would
// pass every case above, so the rule is what makes the exercise mean anything.
// It is stated in the brief, because a hidden rule would just be a trap.
export const constraints = {
    mustUse: ["LXI"],
    mustNotUse: ["LDA"],
};
