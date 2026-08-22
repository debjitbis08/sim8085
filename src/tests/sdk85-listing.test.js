import { describe, test, expect } from "vitest";
import { assembleProgram } from "../core/simulator.js";
import { LISTING_INSTRUCTIONS, LISTING_ERRATA, LISTING_ERRATA_INSTRUCTIONS } from "./sdk85-listing.js";

// Checks our assembler against Intel's, using the object code in the SDK-85
// monitor listing as the reference. See sdk85-listing.js for the format.
//
// Symbolic operands are rewritten to zero so each instruction assembles on its
// own without a symbol table, so for those the check is the opcode byte and the
// instruction length -- neither of which depends on the operand's value. Where
// the operand is already a literal, every byte is compared.
//
// The monitor source itself does not assemble yet: it needs DW, IF/ENDIF and
// MACRO/ENDM, which 8085.pegjs does not implement. Assembling the whole program
// and diffing it against the listing wholesale is the stronger check and is
// what this should become once those land.

const assemble = (program) => {
    const { assembled, lines } = assembleProgram(program);
    return { bytes: assembled.map((a) => a.data), opcode: lines[0].opcode, size: lines[0].size };
};

describe("Assembler against Intel's SDK-85 monitor listing", () => {
    test.each(LISTING_INSTRUCTIONS)(
        "line $lineNumber $mnemonic $operand",
        ({ program, bytes }) => {
            const got = assemble(program);
            expect(got.opcode).toBe(bytes[0]);
            expect(got.size).toBe(bytes.length);
        },
    );

    test.each(LISTING_INSTRUCTIONS.filter((i) => i.literal))(
        "line $lineNumber $mnemonic $operand encodes every byte",
        ({ program, bytes }) => {
            expect(assemble(program).bytes).toEqual(bytes);
        },
    );

    // Where the scan is wrong, our assembler should be right. Asserting the
    // corrected value rather than skipping the line keeps the erratum honest:
    // if the assembler ever started agreeing with the listing, this fails.
    test.each(LISTING_ERRATA_INSTRUCTIONS)(
        "line $lineNumber $mnemonic $operand is misprinted in the listing",
        ({ program, lineNumber }) => {
            const erratum = LISTING_ERRATA.find((e) => e.lineNumber === lineNumber);
            expect(assemble(program).opcode).toBe(erratum.correct);
            expect(assemble(program).opcode).not.toBe(erratum.printed);
        },
    );

    test("the listing covers what the suite claims", () => {
        expect(LISTING_INSTRUCTIONS).toHaveLength(932);
        expect(new Set(LISTING_INSTRUCTIONS.map((i) => i.mnemonic)).size).toBe(53);
        expect(LISTING_INSTRUCTIONS.filter((i) => i.literal)).toHaveLength(472);
        expect(LISTING_ERRATA_INSTRUCTIONS).toHaveLength(1);
        // Quoted operands would be mangled by the symbol rewrite, so none may
        // reach the byte-for-byte comparison.
        expect(LISTING_INSTRUCTIONS.filter((i) => i.quoted && i.literal)).toEqual([]);
    });
});
