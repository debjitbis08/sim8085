export default [
    {
        name: "a difference that stays positive",
        setup: { memory: { 0x2000: 0x4a, 0x2001: 0x25 } },
        expect: { registers: { a: 0x25 }, memory: { 0x2002: 0x25 }, flags: { cy: false } },
    },
    {
        // The operands of the first case, reversed. A program that subtracts
        // the wrong way round passes that one and fails this one.
        name: "a difference that borrows",
        setup: { memory: { 0x2000: 0x25, 0x2001: 0x4a } },
        expect: { registers: { a: 0xdb }, memory: { 0x2002: 0xdb }, flags: { cy: true } },
    },
    {
        name: "equal numbers leave zero and no borrow",
        setup: { memory: { 0x2000: 0x33, 0x2001: 0x33 } },
        expect: { memory: { 0x2002: 0x00 }, flags: { z: true, cy: false } },
    },
    {
        // The smallest possible borrow: one below zero wraps to FFH.
        name: "zero minus one",
        setup: { memory: { 0x2000: 0x00, 0x2001: 0x01 } },
        expect: { memory: { 0x2002: 0xff }, flags: { cy: true } },
    },
    {
        name: "the operands are left untouched",
        setup: { memory: { 0x2000: 0x9c, 0x2001: 0x12 } },
        expect: { memory: { 0x2000: 0x9c, 0x2001: 0x12, 0x2002: 0x8a } },
    },
];

// This step is the counterpart to the pointer work in the previous problem:
// the addresses here are fixed and unrelated, so direct addressing is the
// right tool and the exercise insists on it.
export const constraints = {
    mustUse: ["LDA", "STA"],
};
