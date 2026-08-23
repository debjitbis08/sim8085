import { describe, test, expect } from "vitest";
import { assembleProgram } from "../simulator.js";

const start = (source) => assembleProgram(source).pcStartValue;

describe("END", () => {
    test("a program without one says nothing about where to start", () => {
        expect(start("NOP\nHLT")).toBeUndefined();
    });

    test("a bare END says nothing either", () => {
        expect(start("NOP\nEND")).toBeUndefined();
    });

    test("takes an address", () => {
        expect(start("ORG 0800H\nNOP\nEND 0801H")).toBe(0x801);
    });

    // The operand used to arrive as the name the user wrote, which then went
    // straight into the program counter.
    test("resolves a label to its address", () => {
        expect(start("ORG 0800H\n NOP\nSTART: HLT\n END START")).toBe(0x801);
    });

    test("resolves a label defined below it", () => {
        expect(start("ORG 0900H\n END START\nSTART: NOP")).toBe(0x900);
    });

    test("resolves an expression", () => {
        expect(start("ORG 0800H\nSTART: NOP\n NOP\n END START+2")).toBe(0x802);
    });

    test("a label that is never defined is an error", () => {
        expect(() => start("NOP\nEND NOWHERE")).toThrow(/not defined/);
    });
});
