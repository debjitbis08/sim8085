import { describe, test, expect } from "vitest";
import { assembleProgram } from "../simulator.js";

const bytes = (source) => assembleProgram(source).assembled.map((b) => b.data);

describe("DW", () => {
    test("stores a word low byte first", () => {
        expect(bytes("DW 1234H")).toEqual([0x34, 0x12]);
    });

    test("stores a list", () => {
        expect(bytes("DW 1,2")).toEqual([0x01, 0x00, 0x02, 0x00]);
    });

    test("advances the location counter by two bytes per word", () => {
        // The NOP has to land at 0004H, after two words.
        expect(bytes("DW 1,2\nHERE: NOP\nDW HERE")).toEqual([0x01, 0x00, 0x02, 0x00, 0x00, 0x04, 0x00]);
    });

    test("stores the address of a label defined later", () => {
        expect(bytes("DW LATER\nLATER: NOP")).toEqual([0x02, 0x00, 0x00]);
    });

    test("accepts an expression", () => {
        expect(bytes("DW 1000H + 234H")).toEqual([0x34, 0x12]);
    });

    test("sits alongside DB", () => {
        expect(bytes("DB 5\nDW 1234H\nDB 6")).toEqual([0x05, 0x34, 0x12, 0x06]);
    });

    test("wraps to sixteen bits", () => {
        expect(bytes("DW 1FFFFH")).toEqual([0xff, 0xff]);
    });
});
