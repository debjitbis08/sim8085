import { existsSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { assembleProgram } from "../core/simulator.js";
import { OPCODE_INVENTORY, UNDOCUMENTED_OPCODES } from "./opcode-inventory.js";

describe("complete 8085 opcode inventory", () => {
    test("contains every byte value exactly once", () => {
        expect(OPCODE_INVENTORY).toHaveLength(256);
        expect(OPCODE_INVENTORY.map(({ opcode }) => opcode)).toEqual(Array.from({ length: 256 }, (_, opcode) => opcode));
    });

    test.each(OPCODE_INVENTORY)("$hex: $source assembles to its inventoried opcode", ({ opcode, source }) => {
        const { assembled } = assembleProgram(source);
        const bytes = assembled.filter((item) => item.kind !== "label").map((item) => item.data);

        expect(bytes[0]).toBe(opcode);
    });

    test("the emulator dispatch implements every inventoried opcode exactly once", () => {
        const core = readFileSync(new URL("../core/8085.c", import.meta.url), "utf8");
        const dispatch = core.slice(core.indexOf("int Emulate8085Op"), core.indexOf("State8085 *Init8085"));
        const implemented = [...dispatch.matchAll(/\bcase\s+0x([0-9a-f]{2})\s*:/gi)].map((match) => parseInt(match[1], 16));

        expect(implemented).toHaveLength(256);
        expect([...implemented].sort((left, right) => left - right)).toEqual(
            OPCODE_INVENTORY.map(({ opcode }) => opcode),
        );
    });

    test("every opcode names an existing semantic owner suite", () => {
        for (const { hex, source, semanticSuite } of OPCODE_INVENTORY) {
            expect(semanticSuite, `${hex} ${source} has no semantic suite`).toBeTypeOf("string");
            expect(existsSync(new URL(semanticSuite, import.meta.url)), `${hex} ${source} points to ${semanticSuite}`).toBe(true);
        }
    });

    test("timing ownership and executable fixtures partition all opcodes into 199 + 47 + 10", () => {
        const counts = Object.groupBy(OPCODE_INVENTORY, ({ timingSuite }) => timingSuite);

        expect(counts["documented-timing.test.js"]).toHaveLength(199);
        expect(counts["control-flow-timing.test.js"]).toHaveLength(47);
        expect(counts["undocumented-timing.test.js"]).toHaveLength(10);
        expect(new Set(counts["undocumented-timing.test.js"].map(({ opcode }) => opcode))).toEqual(UNDOCUMENTED_OPCODES);
        expect(OPCODE_INVENTORY.every(({ timingCases }) => timingCases.length > 0)).toBe(true);
    });
});
