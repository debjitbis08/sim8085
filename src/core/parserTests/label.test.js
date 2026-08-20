import { describe, test, expect } from "vitest";
import { parse } from "../8085.pegjs";

describe("Assembler label handling", () => {
    test("missing colon on label triggers specific error", () => {
        const code = `
      MVI A, 00H
      NO_CARRY
      MVI B, 00H
    `;
        expect(() => parse(code)).toThrow(/Label missing ':'/);
    });
});

describe("Assembler ORG handling", () => {
    // Intel 8080/8085 Assembly Language Programming Manual, Chapter 4:
    // "Assume that the current value of the location counter is OFH (decimal
    // 15) when the following ORG directive is encountered: PAG1: ORG OFFH ...
    // The symbol PAG1 is assigned the address OFH. The next instruction or
    // data byte is assembled at location OFFH."
    test("a label on an ORG line keeps the address from before the ORG", () => {
        // Three bytes of data leave the location counter at 3.
        const code = ["DB 1,2,3", "PAG1: ORG 0FFH", "LXI H, PAG1", "HLT"].join("\n");
        const { assembled } = parse(code);

        const address = assembled.filter((a) => a.kind === "addr").map((a) => a.data);
        expect(address).toEqual([3, 0]);

        // The code after the ORG is still assembled at 00FFH.
        const code_ = assembled.filter((a) => a.kind === "code");
        expect(code_[0].currentAddress).toBe(0xff);
    });
});
