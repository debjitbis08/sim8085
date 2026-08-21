import { describe, expect, test } from "vitest";
import { parse } from "../8085.pegjs";

function errorFor(source) {
    try {
        parse(source);
    } catch (error) {
        return error;
    }

    throw new Error(`Expected assembly to fail: ${source}`);
}

function diagnosticFor(source) {
    return JSON.parse(errorFor(source).message);
}

describe("instruction operand spacing errors", () => {
    const gluedInstructions = [
        "RST0",
        ...["INR", "DCR", "ADD", "ADC", "SUB", "SBB", "ANA", "XRA", "ORA", "CMP"].map((op) => `${op}A`),
        "STAXB",
        "LDAXB",
        "PUSHB",
        "POPB",
        "DADB",
        "INXB",
        "DCXB",
        ...["ADI", "ACI", "SUI", "SBI", "ANI", "XRI", "ORI", "CPI", "IN", "OUT", "LDHI", "LDSI"].map(
            (op) => `${op}1`,
        ),
        ...["STA", "LDA", "SHLD", "LHLD"].map((op) => `${op}2000h`),
        ...["JMP", "JC", "JNC", "JZ", "JNZ", "JM", "JP", "JPE", "JPO", "JX5", "JNX5"].map(
            (op) => `${op}2000h`,
        ),
        ...["CALL", "CC", "CNC", "CZ", "CNZ", "CM", "CP", "CPE", "CPO"].map((op) => `${op}2000h`),
        "MOVB,C",
        "LXIB,1",
        "MVIA,2",
    ];

    test.each(gluedInstructions)("reports a missing separator for %s", (source) => {
        expect(diagnosticFor(source)).toEqual({
            type: "Invalid Operands",
            message: "Missing space between the instruction and its operands",
            hint: ["Add at least one space after the instruction name."],
        });
    });

    test.each([
        ["INRA", 4],
        ["INXB", 4],
        ["CMPA", 4],
        ["CPI1", 4],
        ["CPE2000h", 4],
        ["CPO2000h", 4],
        ["JPE2000h", 4],
        ["JPO2000h", 4],
        ["LDAXB", 5],
        ["STAXB", 5],
    ])("prefers the complete mnemonic in %s", (source, expectedColumn) => {
        expect(errorFor(source).location.start.column).toBe(expectedColumn);
    });

    test("keeps the missing-comma diagnostic distinct", () => {
        expect(diagnosticFor("MVI A 02h")).toMatchObject({
            message: "Invalid operands syntax for MVI instruction",
            hint: ["You forgot to add a ',' (comma) between the operands. Expected MVI register, data."],
        });
    });

    test("keeps the generic diagnostic for an invalid register", () => {
        expect(diagnosticFor("MVI X, 02h")).toMatchObject({
            message: "Invalid operands for MVI instruction",
        });
    });

    test("continues to assemble correctly separated MVI instructions", () => {
        const { assembled } = parse("MVI A, 02h\nHLT");
        expect(assembled.filter((item) => item.kind !== "label").map((item) => item.data)).toEqual([0x3e, 0x02, 0x76]);
    });

    test("accepts tabs as instruction separators", () => {
        expect(() => parse("MVI\tA, 02h\nHLT")).not.toThrow();
    });

    test("does not use the spacing diagnostic when an operand is missing", () => {
        expect(diagnosticFor("MVI")).toMatchObject({
            message: "Invalid operands for MVI instruction",
        });
    });

    test("treats a comment after the mnemonic as a missing operand", () => {
        expect(diagnosticFor("ADD;x")).toEqual(diagnosticFor("ADD ;x"));
        expect(diagnosticFor("ADD;x")).toMatchObject({
            message: "Invalid operands syntax for instruction",
            hint: ["The operand should be a single register."],
        });
    });

    test.each(["ADD", "JMP", "MOV", "IN"])("allows %s to be used as a label", (label) => {
        expect(() => parse(`${label}: NOP\nJMP ${label}`)).not.toThrow();
    });

    test("allows labels that begin with an instruction mnemonic", () => {
        expect(() => parse("INRB: NOP\nCALLME: NOP\nJMP CALLME")).not.toThrow();
    });

    test("does not apply the operand-spacing diagnostic to instructions without operands", () => {
        expect(errorFor("HLTA").message).not.toContain("Missing space between the instruction and its operands");
    });
});
