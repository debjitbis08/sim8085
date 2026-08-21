const lowOpcodes = [
    "nop", "lxi b, 2000H", "stax b", "inx b", "inr b", "dcr b", "mvi b, 01H", "rlc",
    "dsub", "dad b", "ldax b", "dcx b", "inr c", "dcr c", "mvi c, 01H", "rrc",
    "arhl", "lxi d, 2000H", "stax d", "inx d", "inr d", "dcr d", "mvi d, 01H", "ral",
    "rdel", "dad d", "ldax d", "dcx d", "inr e", "dcr e", "mvi e, 01H", "rar",
    "rim", "lxi h, 2000H", "shld 2000H", "inx h", "inr h", "dcr h", "mvi h, 01H", "daa",
    "ldhi 01H", "dad h", "lhld 2000H", "dcx h", "inr l", "dcr l", "mvi l, 01H", "cma",
    "sim", "lxi sp, 2000H", "sta 2000H", "inx sp", "inr m", "dcr m", "mvi m, 01H", "stc",
    "ldsi 01H", "dad sp", "lda 2000H", "dcx sp", "inr a", "dcr a", "mvi a, 01H", "cmc",
];

const registers = ["b", "c", "d", "e", "h", "l", "m", "a"];
const moveOpcodes = registers.flatMap((destination) =>
    registers.map((source) => (destination === "m" && source === "m" ? "hlt" : `mov ${destination}, ${source}`)),
);
const aluOpcodes = ["add", "adc", "sub", "sbb", "ana", "xra", "ora", "cmp"].flatMap((operation) =>
    registers.map((register) => `${operation} ${register}`),
);
const highOpcodes = [
    "rnz", "pop b", "jnz 2000H", "jmp 2000H", "cnz 2000H", "push b", "adi 01H", "rst 0",
    "rz", "ret", "jz 2000H", "rstv", "cz 2000H", "call 2000H", "aci 01H", "rst 1",
    "rnc", "pop d", "jnc 2000H", "out 01H", "cnc 2000H", "push d", "sui 01H", "rst 2",
    "rc", "shlx", "jc 2000H", "in 01H", "cc 2000H", "jnx5 2000H", "sbi 01H", "rst 3",
    "rpo", "pop h", "jpo 2000H", "xthl", "cpo 2000H", "push h", "ani 01H", "rst 4",
    "rpe", "pchl", "jpe 2000H", "xchg", "cpe 2000H", "lhlx", "xri 01H", "rst 5",
    "rp", "pop psw", "jp 2000H", "di", "cp 2000H", "push psw", "ori 01H", "rst 6",
    "rm", "sphl", "jm 2000H", "ei", "cm 2000H", "jx5 2000H", "cpi 01H", "rst 7",
];

const sources = [...lowOpcodes, ...moveOpcodes, ...aluOpcodes, ...highOpcodes];
export const UNDOCUMENTED_OPCODES = new Set([0x08, 0x10, 0x18, 0x28, 0x38, 0xcb, 0xd9, 0xdd, 0xed, 0xfd]);

const controlMnemonics = new Set([
    "hlt", "jmp", "jnz", "jz", "jnc", "jc", "jpo", "jpe", "jp", "jm",
    "call", "cnz", "cz", "cnc", "cc", "cpo", "cpe", "cp", "cm",
    "ret", "rnz", "rz", "rnc", "rc", "rpo", "rpe", "rp", "rm",
    "pchl", "push", "pop", "xthl", "sphl", "rst",
]);

const semanticSuites = {
    nop: "basic.test.js", hlt: "basic.test.js",
    lxi: "lxi.test.js", stax: "stax.test.js", inx: "inx.test.js", inr: "inr.test.js",
    dcr: "dcr.test.js", mvi: "mvi.test.js", rlc: "rlc.test.js", dsub: "dsub.test.js",
    dad: "dad.test.js", ldax: "ldax.test.js", dcx: "dcx.test.js", rrc: "rrc.test.js",
    arhl: "arhl.test.js", ral: "ral.test.js", rdel: "rdel.test.js", rar: "rar.test.js",
    rim: "interrupts.test.js", shld: "shld.test.js", daa: "daa.test.js", ldhi: "ldhi.test.js",
    lhld: "lhld.test.js", cma: "cma.test.js", sim: "interrupts.test.js", sta: "sta.test.js",
    stc: "stc.test.js", ldsi: "ldsi.test.js", lda: "lda.test.js", cmc: "cmc.test.js",
    mov: "mov.test.js", add: "add.test.js", adc: "adc.test.js", sub: "sub.test.js",
    sbb: "sbb.test.js", ana: "ana.test.js", xra: "xra.test.js", ora: "ora.test.js",
    cmp: "cmp.test.js", adi: "adi.test.js", aci: "aci.test.js", sui: "sui.test.js",
    sbi: "sbi.test.js", ani: "ani.test.js", xri: "xri.test.js", ori: "ori.test.js",
    cpi: "cpi.test.js", push: "push.test.js", pop: "pop.test.js", rst: "rst.test.js",
    rnz: "return.test.js", rz: "return.test.js", ret: "return.test.js", rnc: "return.test.js",
    rc: "return.test.js", rpo: "return.test.js", rpe: "return.test.js", rp: "return.test.js",
    rm: "return.test.js", jnz: "jump.test.js", jmp: "jump.test.js", jz: "jump.test.js",
    jnc: "jump.test.js", jc: "jump.test.js", jpo: "jump.test.js", jpe: "jump.test.js",
    jp: "jump.test.js", jm: "jump.test.js", cnz: "call.test.js", cz: "call.test.js",
    call: "call.test.js", cnc: "call.test.js", cc: "call.test.js", cpo: "call.test.js",
    cpe: "call.test.js", cp: "call.test.js", cm: "call.test.js", rstv: "rstv.test.js",
    shlx: "shlx.test.js", jnx5: "jx5.test.js", in: "io.test.js", out: "io.test.js",
    xthl: "xthl.test.js", pchl: "pchl.test.js", xchg: "xchg.test.js", lhlx: "lhlx.test.js",
    di: "interrupts.test.js", ei: "interrupts.test.js", sphl: "sphl.test.js", jx5: "jx5.test.js",
};

const memorySetup = { registers: { h: 0x20, l: 0x00 }, memory: { 0x2000: 0x11 } };

// Documented cycle counts are an independent transcription of Appendix A in
// Intel's 8080/8085 Assembly Language Programming Manual. Its lone CPE 9/17
// entry is a table erratum; CPE uses the same 9/18 execution path as the
// other seven conditional calls.
function fixedTiming(source, mnemonic) {
    const operand = source.split(/\s+/, 2)[1];
    const fixedCycles = {
        nop: 4, rlc: 4, rrc: 4, ral: 4, rar: 4, rim: 4, daa: 4, cma: 4,
        sim: 4, stc: 4, cmc: 4, xchg: 4, di: 4, ei: 4,
        lxi: 10, inx: 6, dcx: 6, dad: 10, stax: 7, ldax: 7,
        shld: 16, lhld: 16, sta: 13, lda: 13, in: 10, out: 10,
        adi: 7, aci: 7, sui: 7, sbi: 7, ani: 7, xri: 7, ori: 7, cpi: 7,
    };
    let cycles = fixedCycles[mnemonic];
    if (mnemonic === "inr" || mnemonic === "dcr") cycles = operand === "m" ? 10 : 4;
    if (mnemonic === "mvi") cycles = operand === "m," ? 10 : 7;
    if (mnemonic === "mov") cycles = source.slice(4).includes("m") ? 7 : 4;
    if (["add", "adc", "sub", "sbb", "ana", "xra", "ora", "cmp"].includes(mnemonic)) cycles = operand === "m" ? 7 : 4;

    let setup = {};
    if (source.includes(" m") || source.includes("m,")) setup = memorySetup;
    if (source === "stax b") setup = { registers: { b: 0x20, c: 0x00 } };
    if (source === "stax d") setup = { registers: { d: 0x20, e: 0x00 } };
    if (source === "ldax b") setup = { registers: { b: 0x20, c: 0x00 }, memory: { 0x2000: 0x11 } };
    if (source === "ldax d") setup = { registers: { d: 0x20, e: 0x00 }, memory: { 0x2000: 0x11 } };
    if (source === "lhld 2000H") setup = { memory: { 0x2000: 0x11, 0x2001: 0x22 } };
    if (source === "lda 2000H") setup = { memory: { 0x2000: 0x11 } };
    if (source === "in 01H") setup = { io: { 0x01: 0x5a } };
    return [{ description: `${cycles} T-states`, program: `${source}\nhlt`, expected: cycles + 5, setup }];
}

const conditions = {
    jnz: ["z", false], jz: ["z", true], jnc: ["cy", false], jc: ["cy", true],
    jpo: ["p", false], jpe: ["p", true], jp: ["s", false], jm: ["s", true],
    cnz: ["z", false], cz: ["z", true], cnc: ["cy", false], cc: ["cy", true],
    cpo: ["p", false], cpe: ["p", true], cp: ["s", false], cm: ["s", true],
    rnz: ["z", false], rz: ["z", true], rnc: ["cy", false], rc: ["cy", true],
    rpo: ["p", false], rpe: ["p", true], rp: ["s", false], rm: ["s", true],
};

function controlTiming(opcode, source, mnemonic) {
    if (mnemonic === "hlt") return [{ description: "5 T-states", program: "hlt", expected: 5, setup: {} }];
    if (mnemonic === "jmp") return [{ description: "10 T-states", program: `${source}\nhlt\norg 2000H\nhlt`, expected: 15, setup: {} }];
    if (mnemonic === "call") return [{ description: "18 T-states", program: `${source}\nhlt\norg 2000H\nhlt`, expected: 23, setup: {} }];
    if (mnemonic === "ret") return [{ description: "10 T-states", program: "ret\nhlt\norg 0100H\nhlt", expected: 15, setup: { sp: 0x2000, memory: { 0x2000: 0x00, 0x2001: 0x01 } } }];
    if (conditions[mnemonic]) {
        const [flag, takenValue] = conditions[mnemonic];
        const isReturn = mnemonic.startsWith("r");
        const isCall = mnemonic.startsWith("c");
        const program = isReturn ? `${source}\nhlt\norg 0100H\nhlt` : `${source}\nhlt\norg 2000H\nhlt`;
        const stack = isReturn ? { sp: 0x2000, memory: { 0x2000: 0x00, 0x2001: 0x01 } } : {};
        const takenCycles = isReturn ? 12 : isCall ? 18 : 10;
        const notTakenCycles = isReturn ? 6 : isCall ? 9 : 7;
        return [
            { description: `taken in ${takenCycles} T-states`, program, expected: takenCycles + 5, setup: { ...stack, flags: { [flag]: takenValue } } },
            { description: `not taken in ${notTakenCycles} T-states`, program, expected: notTakenCycles + 5, setup: { ...stack, flags: { [flag]: !takenValue } } },
        ];
    }
    if (mnemonic === "pchl") return [{ description: "6 T-states", program: "pchl\norg 0100H\nhlt", expected: 11, setup: { registers: { h: 0x01, l: 0x00 } } }];
    if (mnemonic === "push") return [{ description: "12 T-states", program: `${source}\nhlt`, expected: 17, setup: {} }];
    if (mnemonic === "pop") return [{ description: "10 T-states", program: `${source}\nhlt`, expected: 15, setup: { sp: 0x2000, memory: { 0x2000: 0x00, 0x2001: 0x00 } } }];
    if (mnemonic === "xthl") return [{ description: "16 T-states", program: "xthl\nhlt", expected: 21, setup: { sp: 0x2000, memory: { 0x2000: 0x12, 0x2001: 0x34 } } }];
    if (mnemonic === "sphl") return [{ description: "6 T-states", program: "sphl\nhlt", expected: 11, setup: { registers: { h: 0x20, l: 0x00 } } }];
    if (mnemonic === "rst") {
        const vector = opcode & 0x38;
        return [{ description: "12 T-states", program: `org 0100H\n${source}\nhlt\norg ${vector.toString(16)}H\nhlt`, expected: 17, setup: { pc: 0x0100 } }];
    }
    return [];
}

function undocumentedTiming(source, mnemonic) {
    if (mnemonic === "rstv") return [
        { description: "6 T-states when V is clear", program: "rstv\nhlt", expected: 11, setup: { flags: { v: false } } },
        { description: "12 T-states when V is set", program: "rstv\nhlt", expected: 17, setup: { flags: { v: true }, memory: { 0x40: 0x76 } } },
    ];
    if (mnemonic === "jx5" || mnemonic === "jnx5") {
        const takenValue = mnemonic === "jx5";
        return [
            { description: "10 T-states when taken", program: `${source}\nhlt\norg 2000H\nhlt`, expected: 15, setup: { flags: { k: takenValue } } },
            { description: "7 T-states when not taken", program: `${source}\nhlt\norg 2000H\nhlt`, expected: 12, setup: { flags: { k: !takenValue } } },
        ];
    }
    const cycles = { dsub: 10, arhl: 7, rdel: 10, ldhi: 10, ldsi: 10, shlx: 10, lhlx: 10 }[mnemonic];
    const setup = mnemonic === "shlx" ? { registers: { d: 0x20, e: 0x00 } } : {};
    return [{ description: `${cycles} T-states`, program: `${source}\nhlt`, expected: cycles + 5, setup }];
}

export const OPCODE_INVENTORY = sources.map((source, opcode) => {
    const mnemonic = source.split(/[\s,]/, 1)[0];
    const timingSuite = UNDOCUMENTED_OPCODES.has(opcode)
        ? "undocumented-timing.test.js"
        : controlMnemonics.has(mnemonic)
          ? "control-flow-timing.test.js"
          : "documented-timing.test.js";
    const timingCases = timingSuite === "undocumented-timing.test.js"
        ? undocumentedTiming(source, mnemonic)
        : timingSuite === "control-flow-timing.test.js"
          ? controlTiming(opcode, source, mnemonic)
          : fixedTiming(source, mnemonic);
    return {
        opcode,
        hex: opcode.toString(16).padStart(2, "0").toUpperCase(),
        source,
        semanticSuite: semanticSuites[mnemonic],
        timingSuite,
        timingCases,
    };
});
