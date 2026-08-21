export const evenParity = (value) => {
    let bits = value & 0xff;
    let count = 0;
    while (bits !== 0) {
        count += bits & 1;
        bits >>>= 1;
    }
    return count % 2 === 0;
};

/**
 * Reference model for the 8085 subtraction carry chain.
 *
 * Intel describes subtraction as accumulator + one's-complement operand +
 * carry-in. The carry-in is one for SUB/CMP and one minus the incoming borrow
 * for SBB/SBI. AC is therefore the carry out of bit 3 of those three terms.
 */
export const expectedSubtraction = (accumulator, operand, borrow = 0) => {
    const carryIn = 1 - borrow;
    const complement = (~operand) & 0xff;
    const totalSubtrahend = operand + borrow;
    const result = (accumulator - totalSubtrahend) & 0xff;
    const carryIntoSign = (accumulator & 0x7f) + (complement & 0x7f) + carryIn > 0x7f;
    const carryOut = accumulator + complement + carryIn > 0xff;
    const overflow = carryIntoSign !== carryOut;

    return {
        result,
        flags: {
            z: result === 0,
            s: (result & 0x80) !== 0,
            p: evenParity(result),
            c: accumulator < totalSubtrahend,
            ac: (accumulator & 0x0f) + (complement & 0x0f) + carryIn > 0x0f,
            v: overflow,
            k: overflow !== ((result & 0x80) !== 0),
        },
    };
};
