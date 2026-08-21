import { describe, test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { OPCODE_INVENTORY, UNDOCUMENTED_OPCODES } from "./opcode-inventory.js";

// The cycle counts in opcode-inventory.js were transcribed by hand from
// Appendix A of Intel's 8080/8085 Assembly Language Programming Manual. This
// suite diffs them against a fixture extracted mechanically from that same
// table, so the transcription is checked rather than asserted. Regenerate the
// fixture with scripts/extract-appendix-a.mjs.
const fixture = JSON.parse(readFileSync(new URL("./fixtures/appendix-a-timings.json", import.meta.url)));

// Appendix A is the 8080 instruction summary with an 8085 column added, so it
// has no row for the ten undocumented opcodes. Their timings come from
// Dehnhardt and Sorensen and stay with undocumented-timing.test.js. RIM and
// SIM are 8085-only too, but the manual describes them in Chapter 3, so the
// fixture carries them and they are checked here like everything else.

const OPERAND_MATTERS = new Set(["inr", "dcr", "add", "adc", "sub", "sbb", "ana", "xra", "ora", "cmp"]);

// Maps an inventory entry onto the row of Appendix A that covers it.
function appendixKey({ source }) {
    const mnemonic = source.split(/[\s,]/, 1)[0];
    const operand = source.slice(mnemonic.length).trim().replace(/,$/, "");
    if (mnemonic === "mov") {
        const [dst, src] = operand.split(",").map((s) => s.trim());
        if (dst === "m") return "MOV M,r";
        if (src === "m") return "MOV r,M";
        return "MOV r1,r2";
    }
    if (mnemonic === "mvi") return operand.startsWith("m") ? "MVI M" : "MVI r";
    if (OPERAND_MATTERS.has(mnemonic)) return `${mnemonic.toUpperCase()} ${operand === "m" ? "M" : "r"}`;
    return mnemonic.toUpperCase();
}

// "9/18" is the condition-not-met path followed by the condition-met path.
const parseStates = (s) => s.split("/").map(Number).sort((a, b) => a - b);

const checked = OPCODE_INVENTORY.filter((e) => !UNDOCUMENTED_OPCODES.has(e.opcode));

// Appendix A prints 9/17 for CPE alone, where all seven other conditional
// calls are 9/18. CPE takes the same execution path as the rest, so the
// inventory deliberately departs from the table here.
const CPE_ERRATUM = "cpe 2000H";

describe("Cycle counts against Intel's Appendix A", () => {
    test.each(checked.filter((e) => e.source !== CPE_ERRATUM))(
        "$hex $source matches the table",
        (entry) => {
            const row = fixture.entries[appendixKey(entry)];
            expect(row, `no Appendix A row for ${appendixKey(entry)}`).toBeDefined();
            expect([...entry.tstates].sort((a, b) => a - b)).toEqual(parseStates(row.states8085));
        },
    );

    test("CPE is the only opcode that departs from the table, and does so knowingly", () => {
        const entry = OPCODE_INVENTORY.find((e) => e.source === CPE_ERRATUM);
        expect(fixture.entries.CPE.states8085).toBe("9/17");
        expect([...entry.tstates].sort((a, b) => a - b)).toEqual([9, 18]);
        // Every other conditional call in the table agrees on 9/18, which is
        // what makes the lone 9/17 an erratum rather than a real difference.
        for (const cc of ["CC", "CNC", "CZ", "CNZ", "CP", "CM", "CPO"]) {
            expect(fixture.entries[cc].states8085).toBe("9/18");
        }
    });

    test("coverage is what the suite claims", () => {
        expect(checked).toHaveLength(246);
        const skipped = OPCODE_INVENTORY.filter((e) => !checked.includes(e)).map((e) => e.source.split(/[\s,]/, 1)[0]);
        expect(new Set(skipped)).toEqual(
            new Set(["dsub", "arhl", "rdel", "ldhi", "ldsi", "rstv", "shlx", "jnx5", "lhlx", "jx5"]),
        );
        // RIM and SIM are the two rows that do not come from Appendix A.
        expect(fixture.entries.RIM.from).toMatch(/Chapter 3/);
        expect(fixture.entries.SIM.from).toMatch(/Chapter 3/);
    });
});
