// Extracts the instruction timing table from Appendix A of Intel's 8080/8085
// Assembly Language Programming Manual into a fixture the test suite can diff
// against src/tests/opcode-inventory.js.
//
// The cycle counts in the inventory were transcribed from this table by hand.
// This script re-derives them mechanically so the transcription is checked
// rather than asserted -- the same reason the CP/M exercisers exist for flags.
//
//   node scripts/extract-appendix-a.mjs <path-to-manual.pdf>
//
// The manual is not in the repository (it is a copyrighted Intel document), so
// the generated fixture is committed and this script is only re-run when
// someone wants to verify it against the source.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const pdf = process.argv[2];
if (!pdf) {
    console.error("usage: node scripts/extract-appendix-a.mjs <manual.pdf>");
    process.exit(2);
}

// pdftotext -layout keeps the table columns apart; without it the rows collapse.
const text = execFileSync("pdftotext", ["-layout", pdf, "-"], { encoding: "utf8", maxBuffer: 64 << 20 });
const lines = text.split("\n");

const start = lines.findIndex((l) => /APPENDIX A\.\s+INSTRUCTION SUMMARY/.test(l));
if (start < 0) {
    console.error("could not find the Appendix A heading; is this the right manual?");
    process.exit(1);
}

// The scan of this edition has recognition errors in the mnemonic column. Each
// is unambiguous from the opcode bits printed alongside it, and is corrected
// here rather than silently dropped.
const OCR = {
    OCR: "DCR",     // D read as O
    AND: "ANA",     // the table prints the operation, the mnemonic is ANA
    JMP: "JMP", jMP: "JMP", jC: "JC", jZ: "JZ", jPE: "JPE",
    MVIM: "MVI M",
    CMPr: "CMP r",
    "01": "DI",     // DI read as digits
};
// Only these mnemonics have distinct register and memory timings; for the rest
// the operand does not change the count, so the key is the mnemonic alone.
const OPERAND_MATTERS = new Set([
    "INR", "DCR", "MOV", "MVI", "ADD", "ADC", "SUB", "SBB", "ANA", "XRA", "ORA", "CMP",
]);

const isCount = (t) => /^\d+(?:\/\d+)?$/.test(t) && t !== "0" && t !== "1";
const entries = new Map();
const conflicts = [];

for (let i = start; i < Math.min(start + 400, lines.length); i++) {
    const raw = lines[i];
    const t = raw.split(/\s+/).filter(Boolean);
    if (t.length < 4) continue;
    if (!isCount(t[t.length - 1]) || !isCount(t[t.length - 2])) continue;

    // The OCR table is consulted before the identifier check, because one of
    // the corrections is for a mnemonic scanned as digits.
    const mnemonic = OCR[t[0]] ?? (/^[A-Za-z][A-Za-z0-9]*$/.test(t[0]) ? t[0].toUpperCase() : null);
    if (mnemonic === null) continue;
    // The column header repeats "8080 8085", which reads as a pair of counts.
    if (mnemonic === "MNEMONIC") continue;

    const states8080 = t[t.length - 2];
    const states8085 = t[t.length - 1];
    let key = mnemonic;
    if (mnemonic.includes(" ")) {
        key = mnemonic; // already carries its operand, e.g. MVI M
    } else if (OPERAND_MATTERS.has(mnemonic)) {
        const operand = (t[1] ?? "").replace(/,$/, "");
        if (mnemonic === "MOV") {
            // Printed as MOV r1,r2 / MOV M,r / MOV r,M in a single operand
            // token. The register-to-register row has a corrupted first
            // register in this scan, so it is identified by exclusion.
            const op = (t[1] ?? "").toUpperCase();
            key = op.startsWith("M,") ? "MOV M,r" : op.endsWith(",M") ? "MOV r,M" : "MOV r1,r2";
        } else {
            key = `${mnemonic} ${operand === "M" ? "M" : "r"}`;
        }
    }

    const prior = entries.get(key);
    if (prior && (prior.states8080 !== states8080 || prior.states8085 !== states8085)) {
        conflicts.push({ key, prior, found: { states8080, states8085, line: i + 1 } });
        continue;
    }
    if (!prior) {
        entries.set(key, { states8080, states8085, line: i + 1, printed: raw.trim().replace(/\s+/g, " ") });
    }
}

// RIM and SIM are 8085-only, so Appendix A -- the 8080 instruction summary --
// has no row for them. Their timings come from the per-instruction entries in
// Chapter 3, where the absence of an 8080 column makes the figure unambiguous.
const eightyFiveOnly = /^(RIM|SIM)\s*\(\s*8085\s+PROCESSOR\s+ON\s*L?\s*Y\s*\)/i;
for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(eightyFiveOnly);
    if (!m) continue;
    const mnemonic = m[1].toUpperCase();
    if (entries.has(mnemonic)) continue;
    for (let j = i; j < Math.min(i + 80, lines.length); j++) {
        const st = lines[j].match(/^\s*States:\s*(\d+)\s*$/);
        if (!st) continue;
        entries.set(mnemonic, {
            states8080: null, // does not exist on the 8080
            states8085: st[1],
            line: j + 1,
            printed: lines[j].trim().replace(/\s+/g, " "),
            from: "Chapter 3 instruction description",
        });
        break;
    }
}

if (conflicts.length) {
    console.error("Rows disagree with each other, refusing to write the fixture:");
    for (const c of conflicts) console.error(" ", JSON.stringify(c));
    process.exit(1);
}

const fixture = {
    source: "Intel 8080/8085 Assembly Language Programming Manual, Appendix A (Instruction Summary)",
    generatedBy: "scripts/extract-appendix-a.mjs",
    note: [
        "Two timing columns: the 8080 and the 8085 differ on 27 mnemonics.",
        "Where a count is written a/b, a is the condition-not-met path and b the condition-met path.",
        "RIM and SIM have no Appendix A row -- this is the 8080 instruction summary with an 8085",
        "column added, and neither exists on the 8080 -- so they are taken from their Chapter 3",
        "instruction descriptions instead and carry a from field saying so. The ten undocumented",
        "8085 opcodes are absent for the same reason and are not recoverable from this manual at all.",
    ].join(" "),
    entries: Object.fromEntries([...entries].sort(([a], [b]) => a.localeCompare(b))),
};

writeFileSync("src/tests/fixtures/appendix-a-timings.json", JSON.stringify(fixture, null, 2) + "\n");
console.log(`wrote ${entries.size} entries to src/tests/fixtures/appendix-a-timings.json`);
