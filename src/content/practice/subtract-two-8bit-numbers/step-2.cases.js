export default [
    {
        name: "no borrow, so the indicator is zero",
        setup: { memory: { 0x2000: 0x4a, 0x2001: 0x25 } },
        expect: { memory: { 0x2002: 0x25, 0x2003: 0x00 } },
    },
    {
        name: "a borrow, so the indicator is one",
        setup: { memory: { 0x2000: 0x25, 0x2001: 0x4a } },
        expect: { memory: { 0x2002: 0xdb, 0x2003: 0x01 } },
    },
    {
        // The boundary: equal operands do not borrow, and a solution that
        // tests "is the result zero" instead of "did it borrow" gets this
        // one right by accident and the next one wrong.
        name: "equal numbers do not borrow",
        setup: { memory: { 0x2000: 0x77, 0x2001: 0x77 } },
        expect: { memory: { 0x2002: 0x00, 0x2003: 0x00 } },
    },
    {
        name: "zero minus one borrows",
        setup: { memory: { 0x2000: 0x00, 0x2001: 0x01 } },
        expect: { memory: { 0x2002: 0xff, 0x2003: 0x01 } },
    },
    {
        // 80H - 01H is 7FH: no borrow, but the result has its top bit clear
        // where the operand's was set. A program that inspects the sign flag
        // rather than carry gets confused here.
        name: "a result whose top bit changed, but which did not borrow",
        setup: { memory: { 0x2000: 0x80, 0x2001: 0x01 } },
        expect: { memory: { 0x2002: 0x7f, 0x2003: 0x00 } },
    },
    {
        name: "the operands are left untouched",
        setup: { memory: { 0x2000: 0x10, 0x2001: 0x20 } },
        expect: { memory: { 0x2000: 0x10, 0x2001: 0x20, 0x2002: 0xf0, 0x2003: 0x01 } },
    },
];
