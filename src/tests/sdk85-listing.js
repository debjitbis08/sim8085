import { readFileSync } from "node:fs";
import { OPCODE_INVENTORY } from "./opcode-inventory.js";

// Parses src/core/sdk85-monitor.lst -- the assembler listing Intel published
// for the SDK-85 monitor ROM, version 2.1 (1977).
//
// The listing pairs every source line with the object code Intel's own
// assembler produced for it, which makes it an external reference for our
// assembler: 933 real instructions across 53 mnemonics, written by Intel for
// the machine we are emulating. Nothing else in the suite checks the assembler
// against anything but itself.
//
// Line format is fixed-column:
//
//   0008    22EF20       175         SHLD    LSAV     ; SAVE H & L REGISTERS
//   |       |            |           |
//   address object bytes line number source
//
// A multi-byte DB continues on following lines carrying only an address and one
// byte. A "+" after the line number marks a line produced by macro expansion.
const LISTING = new URL("../core/sdk85-monitor.lst", import.meta.url);

const ROW = /^([0-9A-F]{4})    ([0-9A-F]+)\s+(\d+)\+?\s(.*)$/;

const MNEMONICS = new Set(OPCODE_INVENTORY.map((e) => e.source.split(/[\s,]/, 1)[0].toUpperCase()));
// Operand tokens that name a register or register pair rather than a symbol.
const REGISTERS = new Set(["A", "B", "C", "D", "E", "H", "L", "M", "SP", "PSW"]);

function parseRow(line) {
    const m = ROW.exec(line);
    if (!m) return null;
    const [, address, bytes, lineNumber, rest] = m;
    if (bytes.length % 2) return null;
    return {
        address: parseInt(address, 16),
        bytes: bytes.match(/../g).map((b) => parseInt(b, 16)),
        lineNumber: Number(lineNumber),
        source: rest.replace(/;.*$/, "").trimEnd(),
    };
}

// Finds the mnemonic in a source line, skipping any label. Labels in this
// listing carry a colon, but the mnemonic is located by lookup rather than by
// position so a colonless one cannot silently shift the operand.
function splitInstruction(source) {
    const tokens = source.trim().split(/\s+/).filter(Boolean);
    const at = tokens.findIndex((t) => MNEMONICS.has(t.toUpperCase()));
    if (at < 0) return null;
    // A token before the mnemonic is only allowed to be a label.
    if (at > 1 || (at === 1 && !/^[A-Za-z_$?@][A-Za-z0-9_$?@]*:?$/.test(tokens[0]))) return null;
    return { mnemonic: tokens[at].toUpperCase(), operand: tokens.slice(at + 1).join(" ") };
}

// An ASM80 numeric literal: decimal, or hex/binary/octal with a suffix. It
// always starts with a digit, which is what keeps 0C0H from looking like a
// symbol.
const NUMERIC = /^\d[0-9A-Fa-f]*[HhBbDdOoQq]?$/;

// Rewrites each operand to something that assembles on its own, with no symbol
// table. Registers and plain literals are kept; anything else -- a symbol, an
// expression, a quoted character -- becomes a zero. The opcode and the
// instruction length depend on the operand's shape, never on its value, so
// substituting the whole expression is safe and avoids having to understand
// ASM80's operator set.
// Splits on commas that separate operands, not on a comma that is itself the
// operand -- the monitor really does contain CPI ','.
function splitOperands(operand) {
    const parts = [];
    let current = "";
    let quoted = false;
    for (const ch of operand) {
        if (ch === "'") quoted = !quoted;
        if (ch === "," && !quoted) {
            parts.push(current);
            current = "";
            continue;
        }
        current += ch;
    }
    parts.push(current);
    return parts;
}

function neutralise(operand) {
    if (!operand.trim()) return { rewritten: "", symbols: 0 };
    let symbols = 0;
    const parts = splitOperands(operand).map((part) => {
        const token = part.trim();
        if (REGISTERS.has(token.toUpperCase())) return token;
        if (NUMERIC.test(token)) return token;
        symbols += 1;
        return "0";
    });
    return { rewritten: parts.join(","), symbols };
}

// The listing is a scan, and the scan has recognition errors. Address
// contiguity catches most of the ones in the address column; the object-code
// column has no such redundancy, so an error there is only visible as a
// disagreement with a correct assembler.
//
// Every entry below was confirmed by hand, and each is a plausible misreading:
// B as 8, D as 0, C as B, or a transposed pair of digits. The second
// transcription of the same listing at github.com/otabuzzman/SDK85 agrees with
// this one on all 2057 bytes, including these, which rules out one transcriber
// slipping but not a defect in the page both were made from.
export const LISTING_ERRATA = [
    {
        lineNumber: 1773,
        address: 0x05ac,
        printed: 0x00,
        correct: 0x0d,
        source: "DCR     C",
        // The next instruction is listed at the following address, so the
        // instruction really is one byte; only the value is wrong.
        reason: "DCR C is 0Dh, scanned as 00h",
    },
];
const ERRATA_LINES = new Set(LISTING_ERRATA.map((e) => e.lineNumber));

const rows = readFileSync(LISTING, "latin1").split("\n").map(parseRow).filter(Boolean);

const all = rows.flatMap((row) => {
    const split = splitInstruction(row.source);
    if (!split) return [];
    const { rewritten, symbols } = neutralise(split.operand);
    return [{
        ...row,
        ...split,
        // Quoted text would be mangled by the identifier rewrite; no instruction
        // operand in this listing contains any, and the flag keeps it that way.
        quoted: /['"]/.test(split.operand),
        program: `${split.mnemonic} ${rewritten}`.trim(),
        // With no symbol in the operand, every byte is predictable, not just
        // the opcode.
        literal: symbols === 0,
    }];
});

export const LISTING_INSTRUCTIONS = all.filter((i) => !ERRATA_LINES.has(i.lineNumber));
export const LISTING_ERRATA_INSTRUCTIONS = all.filter((i) => ERRATA_LINES.has(i.lineNumber));

// Corrections to the listing's object code, keyed by address, for the
// whole-image comparison in sdk85-image.test.js. Four records carry a corrupt
// address rather than a corrupt byte: the byte is right but printed against the
// wrong location, which is why some entries restore a byte the listing never
// shows at all.
export const IMAGE_ERRATA = [
    { address: 0x0384, correct: 0xf3, reason: "the DB 0F3H record is right; the DB 1 record below claims this address too" },
    { address: 0x03b4, correct: 0x01, reason: "DB 1, whose address 03B4h was scanned as 0384h" },
    { address: 0x03bd, correct: 0x15, reason: "address 03BDh was scanned as 63BDh" },
    { address: 0x03e7, correct: 0x0c, reason: "LETRC is 0Ch, scanned as BCh" },
    { address: 0x05ac, correct: 0x0d, reason: "DCR C is 0Dh, scanned as 00h" },
    { address: 0x06e3, correct: 0xb4, reason: "the low byte of DIGTB is B4h, scanned as 84h" },
    { address: 0x0707, correct: 0x06, reason: "the code byte here; the register table record below claims this address too" },
    { address: 0x07d7, correct: 0xf1, reason: "DB ISAV AND 0FFH, whose address 07D7h was scanned as 0707h" },
    { address: 0x070a, correct: 0xca, reason: "the code byte here; the register table record below claims this address too" },
    { address: 0x07da, correct: 0xf0, reason: "DB HSAV AND 0FFH, whose address 07DAh was scanned as 07DAh printed as 070Ah" },
];

// A record whose address is corrupt and whose byte is already restored above,
// so the record itself has nowhere to go.
const DROPPED_ADDRESSES = new Set([0x63bd]);

// The monitor ROM as the listing records it, one byte per address, with the
// errata applied.
export const LISTING_IMAGE = (() => {
    const corrected = new Map(IMAGE_ERRATA.map((e) => [e.address, e.correct]));
    const image = new Map();
    // Scanned afresh rather than reusing `rows`, because the continuation lines
    // of a multi-byte DB carry an address and a byte but no line number, and so
    // are not instruction rows.
    for (const line of readFileSync(LISTING, "latin1").split("\n")) {
        const m = /^([0-9A-F]{4})    ([0-9A-F]+)(?:\s|$)/.exec(line);
        if (!m || m[2].length % 2) continue;
        const base = parseInt(m[1], 16);
        m[2].match(/../g).forEach((b, i) => {
            const address = base + i;
            if (corrected.has(address) || DROPPED_ADDRESSES.has(address)) return;
            image.set(address, parseInt(b, 16));
        });
    }
    for (const [address, byte] of corrected) image.set(address, byte);
    return image;
})();
