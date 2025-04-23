{
    var machineCode = [];
    var symbolTable = {};
    var ilc = 0;
    var mnemonics = {
        "nop"       : {code:0x00,size:1},
        "lxi b,d16" : {code:0x01,size:3},
        "stax b"    : {code:0x02,size:1},
        "inx b"     : {code:0x03,size:1},
        "inr b"     : {code:0x04,size:1},
        "dcr b"     : {code:0x05,size:1},
        "mvi b,d8"  : {code:0x06,size:2},
        "rlc"       : {code:0x07,size:1},
        "dad b"     : {code:0x09,size:1},
        "ldax b"    : {code:0x0A,size:1},
        "dcx b"     : {code:0x0B,size:1},
        "inr c"     : {code:0x0C,size:1},
        "dcr c"     : {code:0x0D,size:1},
        "mvi c,d8"  : {code:0x0E,size:2},
        "rrc"       : {code:0x0F,size:1},
        "lxi d,d16" : {code:0x11,size:3},
        "stax d"    : {code:0x12,size:1},
        "inx d"     : {code:0x13,size:1},
        "inr d"     : {code:0x14,size:1},
        "dcr d"     : {code:0x15,size:1},
        "mvi d,d8"  : {code:0x16,size:2},
        "ral"       : {code:0x17,size:1},
        "dad d"     : {code:0x19,size:1},
        "ldax d"    : {code:0x1A,size:1},
        "dcx d"     : {code:0x1B,size:1},
        "inr e"     : {code:0x1C,size:1},
        "dcr e"     : {code:0x1D,size:1},
        "mvi e,d8"  : {code:0x1E,size:2},
        "rar"       : {code:0x1F,size:1},
        "rim"       : {code:0x20,size:1},
        "lxi h,d16" : {code:0x21,size:3},
        "shld adr"  : {code:0x22,size:3},
        "inx h"     : {code:0x23,size:1},
        "inr h"     : {code:0x24,size:1},
        "dcr h"     : {code:0x25,size:1},
        "mvi h,d8"  : {code:0x26,size:2},
        "daa"       : {code:0x27,size:1},
        "dad h"     : {code:0x29,size:1},
        "lhld adr"  : {code:0x2A,size:3},
        "dcx h"     : {code:0x2B,size:1},
        "inr l"     : {code:0x2C,size:1},
        "dcr l"     : {code:0x2D,size:1},
        "mvi l,d8"  : {code:0x2E,size:2},
        "cma"       : {code:0x2F,size:1},
        "sim"       : {code:0x30,size:1},
        "lxi sp,d16": {code:0x31,size:3},
        "sta adr"   : {code:0x32,size:3},
        "inx sp"    : {code:0x33,size:1},
        "inr m"     : {code:0x34,size:1},
        "dcr m"     : {code:0x35,size:1},
        "mvi m,d8"  : {code:0x36,size:2},
        "stc"       : {code:0x37,size:1},
        "dad sp"    : {code:0x39,size:1},
        "lda adr"   : {code:0x3A,size:3},
        "dcx sp"    : {code:0x3B,size:1},
        "inr a"     : {code:0x3C,size:1},
        "dcr a"     : {code:0x3D,size:1},
        "mvi a,d8"  : {code:0x3E,size:2},
        "cmc"       : {code:0x3F,size:1},
        "mov b,b"   : {code:0x40,size:1},
        "mov b,c"   : {code:0x41,size:1},
        "mov b,d"   : {code:0x42,size:1},
        "mov b,e"   : {code:0x43,size:1},
        "mov b,h"   : {code:0x44,size:1},
        "mov b,l"   : {code:0x45,size:1},
        "mov b,m"   : {code:0x46,size:1},
        "mov b,a"   : {code:0x47,size:1},
        "mov c,b"   : {code:0x48,size:1},
        "mov c,c"   : {code:0x49,size:1},
        "mov c,d"   : {code:0x4A,size:1},
        "mov c,e"   : {code:0x4B,size:1},
        "mov c,h"   : {code:0x4C,size:1},
        "mov c,l"   : {code:0x4D,size:1},
        "mov c,m"   : {code:0x4E,size:1},
        "mov c,a"   : {code:0x4F,size:1},
        "mov d,b"   : {code:0x50,size:1},
        "mov d,c"   : {code:0x51,size:1},
        "mov d,d"   : {code:0x52,size:1},
        "mov d,e"   : {code:0x53,size:1},
        "mov d,h"   : {code:0x54,size:1},
        "mov d,l"   : {code:0x55,size:1},
        "mov d,m"   : {code:0x56,size:1},
        "mov d,a"   : {code:0x57,size:1},
        "mov e,b"   : {code:0x58,size:1},
        "mov e,c"   : {code:0x59,size:1},
        "mov e,d"   : {code:0x5A,size:1},
        "mov e,e"   : {code:0x5B,size:1},
        "mov e,h"   : {code:0x5C,size:1},
        "mov e,l"   : {code:0x5D,size:1},
        "mov e,m"   : {code:0x5E,size:1},
        "mov e,a"   : {code:0x5F,size:1},
        "mov h,b"   : {code:0x60,size:1},
        "mov h,c"   : {code:0x61,size:1},
        "mov h,d"   : {code:0x62,size:1},
        "mov h,e"   : {code:0x63,size:1},
        "mov h,h"   : {code:0x64,size:1},
        "mov h,l"   : {code:0x65,size:1},
        "mov h,m"   : {code:0x66,size:1},
        "mov h,a"   : {code:0x67,size:1},
        "mov l,b"   : {code:0x68,size:1},
        "mov l,c"   : {code:0x69,size:1},
        "mov l,d"   : {code:0x6A,size:1},
        "mov l,e"   : {code:0x6B,size:1},
        "mov l,h"   : {code:0x6C,size:1},
        "mov l,l"   : {code:0x6D,size:1},
        "mov l,m"   : {code:0x6E,size:1},
        "mov l,a"   : {code:0x6F,size:1},
        "mov m,b"   : {code:0x70,size:1},
        "mov m,c"   : {code:0x71,size:1},
        "mov m,d"   : {code:0x72,size:1},
        "mov m,e"   : {code:0x73,size:1},
        "mov m,h"   : {code:0x74,size:1},
        "mov m,l"   : {code:0x75,size:1},
        "hlt"       : {code:0x76,size:1},
        "mov m,a"   : {code:0x77,size:1},
        "mov a,b"   : {code:0x78,size:1},
        "mov a,c"   : {code:0x79,size:1},
        "mov a,d"   : {code:0x7A,size:1},
        "mov a,e"   : {code:0x7B,size:1},
        "mov a,h"   : {code:0x7C,size:1},
        "mov a,l"   : {code:0x7D,size:1},
        "mov a,m"   : {code:0x7E,size:1},
        "mov a,a"   : {code:0x7F,size:1},
        "add b"     : {code:0x80,size:1},
        "add c"     : {code:0x81,size:1},
        "add d"     : {code:0x82,size:1},
        "add e"     : {code:0x83,size:1},
        "add h"     : {code:0x84,size:1},
        "add l"     : {code:0x85,size:1},
        "add m"     : {code:0x86,size:1},
        "add a"     : {code:0x87,size:1},
        "adc b"     : {code:0x88,size:1},
        "adc c"     : {code:0x89,size:1},
        "adc d"     : {code:0x8A,size:1},
        "adc e"     : {code:0x8B,size:1},
        "adc h"     : {code:0x8C,size:1},
        "adc l"     : {code:0x8D,size:1},
        "adc m"     : {code:0x8E,size:1},
        "adc a"     : {code:0x8F,size:1},
        "sub b"     : {code:0x90,size:1},
        "sub c"     : {code:0x91,size:1},
        "sub d"     : {code:0x92,size:1},
        "sub e"     : {code:0x93,size:1},
        "sub h"     : {code:0x94,size:1},
        "sub l"     : {code:0x95,size:1},
        "sub m"     : {code:0x96,size:1},
        "sub a"     : {code:0x97,size:1},
        "sbb b"     : {code:0x98,size:1},
        "sbb c"     : {code:0x99,size:1},
        "sbb d"     : {code:0x9A,size:1},
        "sbb e"     : {code:0x9B,size:1},
        "sbb h"     : {code:0x9C,size:1},
        "sbb l"     : {code:0x9D,size:1},
        "sbb m"     : {code:0x9E,size:1},
        "sbb a"     : {code:0x9F,size:1},
        "ana b"     : {code:0xA0,size:1},
        "ana c"     : {code:0xA1,size:1},
        "ana d"     : {code:0xA2,size:1},
        "ana e"     : {code:0xA3,size:1},
        "ana h"     : {code:0xA4,size:1},
        "ana l"     : {code:0xA5,size:1},
        "ana m"     : {code:0xA6,size:1},
        "ana a"     : {code:0xA7,size:1},
        "xra b"     : {code:0xA8,size:1},
        "xra c"     : {code:0xA9,size:1},
        "xra d"     : {code:0xAA,size:1},
        "xra e"     : {code:0xAB,size:1},
        "xra h"     : {code:0xAC,size:1},
        "xra l"     : {code:0xAD,size:1},
        "xra m"     : {code:0xAE,size:1},
        "xra a"     : {code:0xAF,size:1},
        "ora b"     : {code:0xB0,size:1},
        "ora c"     : {code:0xB1,size:1},
        "ora d"     : {code:0xB2,size:1},
        "ora e"     : {code:0xB3,size:1},
        "ora h"     : {code:0xB4,size:1},
        "ora l"     : {code:0xB5,size:1},
        "ora m"     : {code:0xB6,size:1},
        "ora a"     : {code:0xB7,size:1},
        "cmp b"     : {code:0xB8,size:1},
        "cmp c"     : {code:0xB9,size:1},
        "cmp d"     : {code:0xBA,size:1},
        "cmp e"     : {code:0xBB,size:1},
        "cmp h"     : {code:0xBC,size:1},
        "cmp l"     : {code:0xBD,size:1},
        "cmp m"     : {code:0xBE,size:1},
        "cmp a"     : {code:0xBF,size:1},
        "rnz"       : {code:0xC0,size:1},
        "pop b"     : {code:0xC1,size:1},
        "jnz adr"   : {code:0xC2,size:3},
        "jmp adr"   : {code:0xC3,size:3},
        "cnz adr"   : {code:0xC4,size:3},
        "push b"    : {code:0xC5,size:1},
        "adi d8"    : {code:0xC6,size:2},
        "rst 0"     : {code:0xC7,size:1},
        "rz"        : {code:0xC8,size:1},
        "ret"       : {code:0xC9,size:1},
        "jz adr"    : {code:0xCA,size:3},
        "cz adr"    : {code:0xCC,size:3},
        "call adr"  : {code:0xCD,size:3},
        "aci d8"    : {code:0xCE,size:2},
        "rst 1"     : {code:0xCF,size:1},
        "rnc"       : {code:0xD0,size:1},
        "pop d"     : {code:0xD1,size:1},
        "jnc adr"   : {code:0xD2,size:3},
        "out d8"    : {code:0xD3,size:2},
        "cnc adr"   : {code:0xD4,size:3},
        "push d"    : {code:0xD5,size:1},
        "sui d8"    : {code:0xD6,size:2},
        "rst 2"     : {code:0xD7,size:1},
        "rc"        : {code:0xD8,size:1},
        "jc adr"    : {code:0xDA,size:3},
        "in d8"     : {code:0xDB,size:2},
        "cc adr"    : {code:0xDC,size:3},
        "sbi d8"    : {code:0xDE,size:2},
        "rst 3"     : {code:0xDF,size:1},
        "rpo"       : {code:0xE0,size:1},
        "pop h"     : {code:0xE1,size:1},
        "jpo adr"   : {code:0xE2,size:3},
        "xthl"      : {code:0xE3,size:1},
        "cpo adr"   : {code:0xE4,size:3},
        "push h"    : {code:0xE5,size:1},
        "ani d8"    : {code:0xE6,size:2},
        "rst 4"     : {code:0xE7,size:1},
        "rpe"       : {code:0xE8,size:1},
        "pchl"      : {code:0xE9,size:1},
        "jpe adr"   : {code:0xEA,size:3},
        "xchg"      : {code:0xEB,size:1},
        "cpe adr"   : {code:0xEC,size:3},
        "xri d8"    : {code:0xEE,size:2},
        "rst 5"     : {code:0xEF,size:1},
        "rp"        : {code:0xF0,size:1},
        "pop psw"   : {code:0xF1,size:1},
        "jp adr"    : {code:0xF2,size:3},
        "di"        : {code:0xF3,size:1},
        "cp adr"    : {code:0xF4,size:3},
        "push psw"  : {code:0xF5,size:1},
        "push a"    : {code:0xF5,size:1},
        "ori d8"    : {code:0xF6,size:2},
        "rst 6"     : {code:0xF7,size:1},
        "rm"        : {code:0xF8,size:1},
        "sphl"      : {code:0xF9,size:1},
        "jm adr"    : {code:0xFA,size:3},
        "ei"        : {code:0xFB,size:1},
        "cm adr"    : {code:0xFC,size:3},
        "cpi d8"    : {code:0xFE,size:2},
        "rst 7"     : {code:0xFF,size:1}
    };

    var directives = function (value) {
        return {
            "db": {}
        };
    };

    var twosComplement = function (d8) {
        return (0xFF + d8 + 1);
    };

    var getSymbolValue = function (symbolName, type, size, location) {
        if (!symbolTable[symbolName]) {
            var e = new Error();
            e.message = "Label " + symbolName + " is not defined.";

            if ((/h$/i).test(symbolName) && !Number.isNaN(parseInt(symbolName, 16))) {
                e.hint = ["Are you trying to specify a hexadecimal number? Try adding a 0 (zero) to the beginning of the number."];
            } else if ((/^[abcdehlm]$/i).test(symbolName)) {
                e.hint = ["Are you trying to specify a register? This instruction takes some data and not a register."];
            } else {
                e.hint = [
                    "Check the line on which the label is defined, there may be some issues on that line.",
                    "Make sure there is no space between the label and the : (colon) symbol.",
                    "Symbols defined using EQU can only be used after being defined."
                ];
            }

            e.location = location;
            throw e;
        }

        var symbolEntry = symbolTable[symbolName];
        var dataVal;

        if (type === "direct") {
            dataVal = symbolEntry.addr;
        } else if (Array.isArray(symbolEntry.value)) {
            dataVal = size === 16 ? (symbolEntry.value[0] << 8) | symbolEntry.value[1] : symbolEntry.value[0];
        } else {
            dataVal = symbolEntry.value;
        }

        return dataVal;
    };

    var getSymbolValueOrValue = function (value, type, size, location) {
        return typeof value === "string" ? getSymbolValue(value, type, size, location) : (
            Array.isArray(value)
                ?  size === 16 ? (symbolEntry.value[0] << 8) | symbolEntry.value[1] : value[0]
                : value
        );
    };
}

/**
 * Create Object code from intermediate
 * code and symbol table.
 */
machineCode = prg:program {
    var i = 0,
        line,
        lines = prg.length,
        data,
        dataVal,
        currentAddress = 0,
        pcStartValue,
        objCode = [];


    for (i = 0; i < lines; i += 1) {
        line = prg[i];

        // console.log("line", line);

        if (line == null) continue;

        if (line.opcode == null || typeof line.opcode === "string") {
            if (line.opcode === "end") {
                if (line.data.length) {
                    pcStartValue = line.data[0];
                }
                break;
            }
            if (line.opcode === "org") {
                var data = line.data[0];
                if (typeof data === 'function') {
                    currentAddress = data();
                } else {
                    currentAddress = Number(data);
                }
                continue;
            }
            if (line.opcode === "equ" || line.opcode === 'set') {
                var data = line.data[0];
                var label = line.label;
                if (symbolTable[label.value] && symbolTable[label.value].immutable) {
                    error("Cannot redefine symbols defined with EQU. Use SET for that purpose. Trying to redefine " + label.value, line.location);
                }
                var value = typeof data === 'function' ? data() : data;
                symbolTable[label.value] = {
                    addr: value,
                    value: value,
                    immutable: line.opcode === 'equ'
                };
                continue;
            }
        	if (Array.isArray(line.data)) {
            	objCode = objCode.concat(line.data.map(function (d) {
                    var ret = {
                        data: typeof d.value !== "undefined" ? d.value : d,
                        kind: typeof line.opcode === "string" ? line.opcode : "data",
                        currentAddress: currentAddress,
                        location: typeof d.location !== "undefined" ? d.location : line.location
                    };
                    currentAddress += 1;
                    return ret;
                }));
            }
            continue;
        };

        if (line.size === 1) {
            objCode.push({ data: line.opcode, kind: 'code', currentAddress: currentAddress, location: line.location });
            currentAddress += 1;
        } else if (line.size === 2) {
            data = line.data.value;

            if (typeof line.data.value === "string") {
                dataVal = getSymbolValue(line.data.value, line.data.type, 8, line.location);
            } else if (typeof line.data === "number") {
                // Handle number data directly
                dataVal = line.data;
            } else if (typeof line.data.value === "function") {
                dataVal = line.data.value();
            } else if (Array.isArray(line.data)) {
                // Handle array case, use the first element
                dataVal = line.data[0];
            } else if (typeof line.data.value === "number") {
                // Handle case where line.data.value is a number
                dataVal = line.data.value;
            } else if (typeof line.data.value === "object" && line.data.value.value) {
                // Handle object with a nested value
                dataVal = line.data.value.value;
            } else {
                // Default to 0 if no conditions are met
                dataVal = 0;
            }

            if (dataVal < 0) {
                dataVal = twosComplement(dataVal);
            }

            objCode.push({ data: line.opcode, kind: 'code', currentAddress: currentAddress, location: line.location });
            currentAddress += 1;
            objCode.push({ data: dataVal, kind: (typeof line.data.value === "string" && line.data.type === "direct") ? 'addr' : 'data', currentAddress: currentAddress, location: line.data.location });
            currentAddress += 1;
        } else {
            data = line.data.value;

            if (typeof line.data.value === "string") {
                dataVal = getSymbolValue(line.data.value, line.data.type, 16, line.location);
            } else if (typeof line.data === "number") {
                dataVal = line.data;
            } else if (typeof line.data.value === "number") {
                dataVal = line.data.value;
            } else if (typeof line.data.value === "function") {
                dataVal = line.data.value();
            } else if (typeof line.data.value === "object" && line.data.value.value) {
                dataVal = line.data.value.value;
            } else {
                dataVal = 0;
            }

            objCode.push({ data: line.opcode, kind: 'code', currentAddress: currentAddress, location: line.location });
            currentAddress += 1;
            objCode.push({ data: dataVal & 0xFF, kind: (typeof line.data.value === "string" && line.data.type === "direct") ? 'addr' : 'data', currentAddress: currentAddress, location: line.data.location });
            currentAddress += 1;
            objCode.push({ data: dataVal >> 8, kind: (typeof line.data.value === "string" && line.data.type === "direct") ? 'addr' : 'data', currentAddress: currentAddress, location: line.data.location });
            currentAddress += 1;
        }
    }

    return { pcStartValue, assembled: objCode };
}

/**
 * Create intermediate object code with symbol strings.
 */
program = __ first:line rest:(eol+ __ l:(!. / l:line { return l; }) {return l})* {
    return [first].concat(rest);
}

opWithLabel = labels:(labelPart)* op:(operation / directive) comment? {
    if (labels.length) {
        labels.forEach(function (label) {
            symbolTable[label.value] = {
                addr: ilc,
                value: op.data ?
                        Array.isArray(op.data) ?
                            op.data.map(function (d) {
                                return d.value ? d.value : d;
                            })
                            : op.data.value ?
                                op.data.value : op.data
                        : ilc
            };
        });
    }

    if (op !== null) {
      ilc += op.size;
      return { ...op, labels };
    }
}

defineSymbolWithLabel = label:labelPartWithOptionalColon op:defineDirective comment? {
    return { ...op, label };
}

line = op:(defineSymbolWithLabel / opWithLabel) / (comment:comment) / w:((whitespace / eol)+) {
    if (typeof op !== "undefined") return op;
} / lineError

lineError "Error in this line" = lineWithError:.* {
    var content = lineWithError.join("");

    const ignoredCodes = new Set([0x09, 0x0A, 0x0D]); // tab, newline, carriage return

    const spoofedChars = [...content].filter(c => {
        const code = c.charCodeAt(0);
        return (code < 32 || code > 126) && !ignoredCodes.has(code);
    });

    if (spoofedChars.length > 0) {
        const examples = spoofedChars.map(c => {
            const hex = c.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0");
            return `'${c}' (U+${hex})`;
        });

        error(JSON.stringify({
            type: "Invalid Syntax",
            message: "Failed to compile the code ",
            hint: [
                `The line contains non-ASCII characters: ${examples.join(", ")}`,
                "These may look like normal letters but are not. This usually happens when copying from PDFs or websites.",
                "Try typing the instruction manually using English keyboard layout."
            ]
        }));
    } else {
        error(JSON.stringify({
            type: "Invalid Syntax",
            message: "Failed to compile the code ",
            hint: [
                "Check if you made a typo or used an unsupported instruction."
            ]
        }));
    }
}

label_opcode_whitespace = [ \t\r\n]

label_opcode_separator = (label_opcode_whitespace+ comment*)*

labelPart = label:label ":" label_opcode_separator {
    return { value: label.value, location: label.location, type: "definition" }
} / label whitespace* ":"  label_opcode_separator {
    error("There should not be space between the label the ':' symbol");
}

labelPartWithOptionalColon = label:label ":"? label_opcode_separator {
    return { value: label.value, location: label.location, type: "definition" }
} / label whitespace* ":"  label_opcode_separator {
    error("There should not be space between the label the ':' symbol");
}

label "label" = first:[a-zA-Z?@] rest:([a-zA-Z0-9_]*) {
	return { value: first + rest.join(""), location: location() };
}

labelImmediate "label" = lbl:label {
    return { value: lbl.value, location: lbl.location, type: "immediate" }
}

labelDirect "label" = lbl:label {
    return { value: lbl.value, location: lbl.location, type: "direct" }
}

paramList = whitespace+ first:value rest:(whitespace* ',' whitespace* v:value { return v; })* {
    return [first].concat(rest);
}

value = register / label

register "Register Name" = l:[AaBbCcDdEeHhLlMm] !identLetter { return l.toLowerCase(); }
registerA = l:[Aa] !identLetter { return l.toLowerCase(); }

registerPair = registerPairB / registerPairD / registerPairH

registerPairB "B and C register pair (written as, B or b)" =
    l:[Bb] !identLetter { return l.toLowerCase(); }
registerPairD "D and E register pair (written as, D or d)" =
    l:[Dd] !identLetter { return l.toLowerCase(); }
registerPairH "H and L register pair (written as, H or h)" =
    l:[Hh] !identLetter { return l.toLowerCase(); }
registerPairPSW "Program status word (Contents of A and status flags, written as PSW or psw)" =
    l:("PSW" / "psw") !identLetter { return l.toLowerCase(); }
stackPointer "Stack Pointer (written as, SP or sp)" =
    l:("SP" / "sp") !identLetter { return l.toLowerCase(); }

expression_list "comma separated expression" = d:expressionImmediate ds:("," __ expressionImmediate)* {
    return { value: [typeof d.value === 'function' ? d.value() : d.value].concat(ds.map(function (d_) { return d_[2].value; }).flat()).flat(), location: location() };
}

data8_list "comma separated byte values" = d:data8 ds:("," __ data8)* {
    return { value: d.value.concat(ds.map(function (d_) { return d_[2].value; }).flat()).flat(), location: location() };
}

data16_list "comma separated byte values" = d:data16 ds:("," __ data16)* {
    return { value: [d.value].concat(ds.map(function (d_) { return d_[2].value; })).flat(), location: location() };
}

data8 "byte" = n:(numLiteral / stringLiteral) {
    if (typeof n.value === 'number') {
        if (n.value > 0xFF) {
            error("8-bit data expected.");
        } else {
            return { value: [n.value], location: n.location };
        }
    } else if (Array.isArray(n.value)) {
        // Handle string literal where n.value is an array of ASCII values
        if (n.value[0] > 0xFF) {
            error("8-bit data expected for string.");
        } else {
            return { value: n.value, location: n.location }; // Return the ASCII value of the single character
        }
    }
}

data16 "word" = n:(numLiteral / stringLiteral) {
    if (typeof n.value === 'number') {
        if (n.value > 0xFFFF) {
            error("16-bit data expected");
        } else {
            return { value: n.value, location: n.location };
        }
    } else if (Array.isArray(n.value)) {
        // Handle string literal where n.value is an array of ASCII values
        if (n.value.length !== 2) {
            error("16-bit data expected for string.");
        } else {
            // Combine the two ASCII values to form a 16-bit word
            const highByte = n.value[0] << 8;
            const lowByte = n.value[1];
            return { value: highByte | lowByte, location: n.location };
        }
    }
}

numLiteral "numeric literal" =  hexLiteral / binLiteral / octalLiteral / decLiteral

decLiteral "decimal literal" = decForm2 / decForm1

decForm1 = neg:[-]? digits:digit+ {
    return { value: parseInt((!neg ? "":"-") + digits.join(""), 10), location: location() };
}

decForm2 = neg:[-]? digits:digit+ "D"i {
    return { value: parseInt((!neg ? "":"-") + digits.join(""), 10), location: location() };
}

hexLiteral "hex literal" = hexForm1 / hexForm2

hexForm1 = '0x' hexits:hexit+ {
    return { value: parseInt(hexits.join(""), 16), location: location() };
}

hexForm2 = hexits:hexit+ "H"i {
    return { value: parseInt(hexits.join(""), 16), location: location() };
}

octalLiteral "Octal Literal" = octits:octit+ ("O" / "Q" / "o" / "q") {
    return { value: parseInt(octits.join(""), 8), location: location() };
}

binLiteral "binary literal" = bits:bit+ "B"i {
    return { value: parseInt(bits.join(""), 2), location: location() };
}

stringLiteral "string literal" = "'" chars:char* "'" {
    return { value: chars, location: location() };
}

char =
    escapedChar / // Handle escaped characters
    asciiChar // Match any printable ASCII character except single quote

asciiChar = [\x20-\x26\x28-\x7E] {
    return text().charCodeAt(0); // Return the ASCII value of the matched character
}

escapedChar = "\\" ch:[\\'"] {
    return ch.charCodeAt(0); // Return the ASCII value of the escaped character
}


identifier "identifier" = ltrs:identLetter+ {
    return { value: ltrs.join(""), location: location() };
}
identLetter "letter/underscore" = [a-zA-Z_]
digit "digit" = [0-9]
hexit "hex digit" = [0-9a-fA-F]
octit "octal digit" = [0-7]
bit "bit" = [01]

expressionImmediate "expression" = arithmeticImmediate

// / shift / logical / compare / byteIsolation

arithmeticImmediate "Arithmetic Expression" = additionImmediate

additionImmediate "Addition"
  = left:subtractionImmediate whitespace* "+" whitespace* right:additionImmediate {
    return { value: function () {
        var l = getSymbolValueOrValue(left.value, 'immediate', 8, location());
        var r = getSymbolValueOrValue(right.value, 'immediate', 8, location());
        return l + r;
    }, location: location() };
  }
  / subtractionImmediate

subtractionImmediate "Subtraction"
  = left:multiplicationImmediate whitespace* "-" whitespace* right:subtractionImmediate {
    return { value: function () {
        var l = getSymbolValueOrValue(left.value, 'immediate', 8, location());
        var r = getSymbolValueOrValue(right.value, 'immediate', 8, location());
        return l - r;
    }, location: location() };
  }
  / multiplicationImmediate

multiplicationImmediate "Multiplication"
  = left:divisionImmediate whitespace* "*" whitespace* right:multiplicationImmediate {
    return { value: function () {
        var l = getSymbolValueOrValue(left.value, 'immediate', 8, location());
        var r = getSymbolValueOrValue(right.value, 'immediate', 8, location());
        return l * r;
    }, location: location() };
  }
  / divisionImmediate

divisionImmediate "Division"
  = left:moduloImmediate whitespace* "/" whitespace* right:divisionImmediate {
    return { value: function () {
        var l = getSymbolValueOrValue(left.value, 'immediate', 8, location());
        var r = getSymbolValueOrValue(right.value, 'immediate', 8, location());
        return l / r;
    }, location: location() };
  }
  / moduloImmediate

moduloImmediate "Modulo"
  = left:(numLiteral / labelImmediate) whitespace* "MOD"i whitespace* right:moduloImmediate {
    return { value: function () {
        var l = getSymbolValueOrValue(left.value, 'immediate', 8, location());
        var r = getSymbolValueOrValue(right.value, 'immediate', 8, location());
        return l % r;
    }, location: location() };
  }
  / labelImmediate
  / numLiteral
  / stringLiteral
  / shiftImmediate
  / "(" addition:additionImmediate ")" { return addition; }

shiftImmediate "Shift Expression" = shiftRightImmediate

shiftRightImmediate "Shift Right"
  = left:shiftLeftImmediate whitespace+ "SHR"i whitespace+ right:shiftRightImmediate {
    return { value: function () {
        var l = getSymbolValueOrValue(left.value, 'immediate', 8, location());
        var r = getSymbolValueOrValue(right.value, 'immediate', 8, location());
        return l >> r;
    }, location: location() };
  }
  / shiftLeftImmediate


shiftLeftImmediate "Shift Left"
  = left:(numLiteral / labelImmediate) whitespace+ "SHL"i whitespace+ right:shiftLeftImmediate {
    return { value: function () {
        var l = getSymbolValueOrValue(left.value, 'immediate', 8, location());
        var r = getSymbolValueOrValue(right.value, 'immediate', 8, location());
        return l << r;
    }, location: location() };
  }
  / labelImmediate
  / numLiteral
  / "(" shr:shiftImmediate ")" { return shr; }

expressionDirect "expression" = arithmeticDirect

// / shift / logical / compare / byteIsolation

arithmeticDirect "Arithmetic Expression" = additionDirect

additionDirect "Addition"
  = left:subtractionDirect whitespace* "+" whitespace* right:additionDirect {
    return { value: function () {
        var l = getSymbolValueOrValue(left.value, 'direct', 8, location());
        var r = getSymbolValueOrValue(right.value, 'direct', 8, location());
        return l + r;
    }, location: location() };
  }
  / subtractionDirect

subtractionDirect "Subtraction"
  = left:multiplicationDirect whitespace* "-" whitespace* right:subtractionDirect {
    return { value: function () {
        var l = getSymbolValueOrValue(left.value, 'direct', 8, location());
        var r = getSymbolValueOrValue(right.value, 'direct', 8, location());
        return l - r;
    }, location: location() };
  }
  / multiplicationDirect

multiplicationDirect "Multiplication"
  = left:divisionDirect whitespace* "*" whitespace* right:multiplicationDirect {
    return { value: function() {
        var l = getSymbolValueOrValue(left.value, 'direct', 8, location());
        var r = getSymbolValueOrValue(right.value, 'direct', 8, location());
        return l * r;
    }, location: location() };
  }
  / divisionDirect

divisionDirect "Division"
  = left:moduloDirect whitespace* "/" whitespace* right:divisionDirect {
    return { value: function () {
        var l = getSymbolValueOrValue(left.value, 'direct', 8, location());
        var r = getSymbolValueOrValue(right.value, 'direct', 8, location());
        return l / r;
    }, location: location() };
  }
  / moduloDirect

moduloDirect "Modulo"
  = left:(numLiteral / labelDirect) whitespace* "MOD"i whitespace* right:moduloDirect {
    return { value: function () {
        var l = getSymbolValueOrValue(left.value, 'direct', 8, location());
        var r = getSymbolValueOrValue(right.value, 'direct', 8, location());
        return l % r;
    }, location: location() };
  }
  / labelDirect
  / numLiteral
  / shiftDirect
  / "(" addition:additionDirect ")" { return addition; }

shiftDirect "Shift Expression" = shiftRightDirect

shiftRightDirect "Shift Right"
  = left:shiftLeftDirect whitespace+ "SHR"i whitespace+ right:shiftRightDirect {
    return { value: function () {
        var l = getSymbolValueOrValue(left.value, 'direct', 8, location());
        var r = getSymbolValueOrValue(right.value, 'direct', 8, location());
        return l >> r;
    }, location: location() };
  }
  / shiftLeftDirect


shiftLeftDirect "Shift Left"
  = left:(numLiteral / labelDirect) whitespace+ "SHL"i whitespace+ right:shiftLeftDirect {
    return { value: function () {
        var l = getSymbolValueOrValue(left.value, 'direct', 8, location());
        var r = getSymbolValueOrValue(right.value, 'direct', 8, location());
        return l << r;
    }, location: location() };
  }
  / labelDirect
  / numLiteral
  / "(" shr:shiftDirect ")" { return shr; }

comment "comment" = ";" c:[^\n\r\n\u2028\u2029]* {return c.join("");}

__ = (whitespace / eol )*

eol "line end" = "\n" / "\r\n" / "\r" / "\u2028" / "\u2029"

whitespace "whitespace" = [ \t\v\f\u00A0\uFEFF\u1680\u180E\u2000-\u200A\u202F\u205F\u3000]

directive = dir:(dataDefinition / orgDirective / endDirective) whitespace* {
    var opcode = dir.name[0].toLowerCase();
    return {
        opcode: opcode,
        data: dir.params,
        size: opcode === "org" || opcode === 'equ' || opcode === 'end' ? 0 : dir.params.length,
        location: location()
    };
}

defineDirective = dir:(defineSymbol / setSymbol) whitespace* {
    var opcode = dir.name[0].toLowerCase();
    return {
        opcode: opcode,
        data: dir.params,
        size: 0,
        location: location()
    };
}

operation = inst:(carryBitInstructions / singleRegInstructions / nopInstruction /
    dataTransferInstructions / regOrMemToAccInstructions / rotateAccInstructions /
    regPairInstructions / immediateInstructions / ioInstructions / directAddressingInstructions /
    jumpInstructions / callInstructions / returnInstructions / haltInstruction) whitespace* {

    var paramTypes = inst.paramTypes,
        data,
        paramTypesStr = paramTypes.join(","),
        opcode = mnemonics[inst.name.toLowerCase() + (paramTypesStr === "" ? "" : " ") + paramTypesStr];

    if (opcode == null) {
        error("Invalid instruction. Please check if you have used the correct operands for the instruction.");
    }

    if (typeof paramTypes[0] !== "undefined" &&
        (paramTypes[0] === "adr" || paramTypes[0] === "d16" || paramTypes[0] === "d8")) {
        data = inst.params[0];
    }
    else if (typeof paramTypes[1] !== "undefined" &&
        (paramTypes[1] === "adr" || paramTypes[1] === "d16" || paramTypes[1] === "d8")) {
        data = inst.params[1];
    }
    return {
        opcode: opcode.code,
        data: data,
        size: opcode.size,
        location: location()
    };
}

invalidInstructionError = str:(.*) {
    const ignoredCodes = new Set([0x09, 0x0A, 0x0D]); // tab, newline, carriage return

    const spoofedChars = [...str].filter(c => {
        const code = c.charCodeAt(0);
        return (code < 32 || code > 126) && !ignoredCodes.has(code);
    });

    if (spoofedChars.length > 0) {
        const examples = spoofedChars.map(c => {
            const hex = c.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0");
            return `'${c}' (U+${hex})`;
        });

        error(JSON.stringify({
            type: "Invalid Instruction",
            message: "Unknown or Invalid instruction used",
            hint: [
                `The instruction contains non-ASCII characters: ${examples.join(", ")}`,
                "These may look like normal letters but are not. This usually happens when copying from PDFs or websites.",
                "Try typing the instruction manually using English keyboard layout."
            ]
        }));
    } else {
        error(JSON.stringify({
            type: "Invalid Instruction",
            message: "Unknown or Invalid instruction used",
            hint: [
                "Check if you made a typo or used an unsupported instruction."
            ]
        }));
    }
}

carryBitInstructions = op:(op_stc / op_cmc) {
    return {
        name: op,
        paramTypes:[],
        params: []
    };
}

singleRegInstructions = op:(op_inr / op_dcr / op_cma / op_daa) {
    var name, params, paramTypes;

    if (typeof op === "string") {
        name = op;
        params = [];
        paramTypes = [];
    } else {
        name = op[0];
        paramTypes = [op[2]];
        params = [op[2]];
    }
    return {
        name: name,
        paramTypes: paramTypes,
        params: params
    };
}

nopInstruction = op:(op_nop) {
    return {
        name: op,
        paramTypes: [],
        params: []
    }
}

dataTransferInstructions = op:(op_mov / op_stax / op_ldax) {
    var name = op[0].toLowerCase(),
        params,
        paramTypes;

    if (name === "mov") {
        params = [op[2],op[6]];
        paramTypes = params;
    } else {
        params = [op[2]];
        paramTypes = params;
    }

    return {
        name: name,
        params: params,
        paramTypes: paramTypes
    }
}

regOrMemToAccInstructions = op:(op_add / op_adc / op_sub / op_sbb / op_ana / op_xra / op_ora / op_cmp) {
    return {
        name: op[0],
        paramTypes: [op[2]],
        params: [op[2]]
    }
}

rotateAccInstructions = op:(op_rlc / op_rrc / op_ral / op_rar) {
    return {
        name: op,
        paramTypes: [],
        params: []
    }
}

regPairInstructions = op:(op_push / op_pop / op_dad / op_inx / op_dcx / op_xchg / op_xthl / op_sphl) {
    var name, params, paramTypes;

    if (typeof op === "string") {
        name = op;
        params = [];
        paramTypes = [];
    } else {
        name = op[0];
        params = [op[2]];
        paramTypes = [op[2]];
    }

    return {
        name: name,
        params: params,
        paramTypes: paramTypes
    };
}

immediateInstructions = op:(op_lxi / op_mvi / op_adi / op_aci / op_sui / op_sbi / op_ani / op_xri / op_ori / op_cpi) {
    var name = op[0].toLowerCase(), params, paramTypes;
    if (name === "lxi") {
        params = [op[2],op[6]];
        paramTypes = [op[2],"d16"];
    } else if (name === "mvi") {
        params = [op[2],op[6]];
        paramTypes = [op[2],"d8"];
    } else {
        params = [op[2]];
        paramTypes = ["d8"];
    }

    return {
        name: name,
        params: params,
        paramTypes: paramTypes
    };
}

ioInstructions = op:(op_in / op_out) {
    var name = op[0].toLowerCase(), params, paramTypes;
    return {
        name: name,
        params: [op[2]],
        paramTypes: ["d8"]
    };
}

directAddressingInstructions = op:(op_sta / op_lda / op_shld / op_lhld) {
    return {
        name: op[0],
        params: [op[2]],
        paramTypes: ["adr"]
    }
}

jumpInstructions = op:(op_pchl / op_jmp / op_jc / op_jnc / op_jz / op_jnz / op_jpe / op_jpo / op_jp / op_jm) {
    var name,
        params,
        paramTypes;

    if (typeof op === "string") {
        name = op;
        params = [];
        paramTypes = [];
    } else {
        name = op[0];
        params = [op[2]];
        paramTypes = ["adr"];
    }

    return {
        name: name,
        params: params,
        paramTypes: paramTypes
    };
}

callInstructions = op:(op_call / op_cc / op_cnc / op_cz / op_cnz / op_cpe / op_cpo / op_cp / op_cm) {
    return {
        name: op[0],
        params: [op[2]],
        paramTypes: ["adr"]
    };
}

returnInstructions = op:(op_ret / op_rc / op_rnc / op_rz / op_rnz / op_rm / op_rpe / op_rpo / op_rp) {
    return {
        name: op,
        params: [],
        paramTypes: []
    };
}

/*
resetInstruction = op:(op_rst) {
}
*/

haltInstruction = op:(op_hlt) {
    return {
        name: op,
        params: [],
        paramTypes: []
    };
}

defineSymbol = dir:(dir_equ) {
    return {
        name: dir,
        params: [dir[2].value]
    }
}

setSymbol = dir:(dir_set) {
    return {
        name: dir,
        params: [dir[2].value]
    }
}

dataDefinition = dir:(dir_db) {
    return {
       name: dir,
       params: dir[2].value.map(function (v) { return v; })
    };
}

orgDirective = dir:(dir_org) {
    ilc = dir[2].value;
    return {
        name: dir,
        params: [dir[2].value]
    };
}

endDirective = dir:(dir_end) {
    return {
        name: dir,
        // Whitespace and value together in a single array
        params: dir[1] ? [dir[1][1].value] : []
    };
}

dir_db  = "DB"i  whitespace+ (expression_list / data8_list)
dir_equ = "EQU"i whitespace+ (expressionImmediate / data16)
dir_set = "SET"i whitespace+ (expressionImmediate / data16)
dir_org = "ORG"i whitespace+ (expressionImmediate / data16)
dir_end = "END"i (whitespace+ (expressionImmediate / data16))?

op_stc  = "STC"i
op_cmc  = "CMC"i
op_cma  = "CMA"i
op_daa  = "DAA"i
op_sphl = "SPHL"i
op_pchl = "PCHL"i
op_hlt  = "HLT"i
op_rlc  = "RLC"i
op_rrc  = "RRC"i
op_rar  = "RAR"i
op_ral  = "RAL"i
op_ret  = "RET"i
op_rc   = "RC"i
op_rnc  = "RNC"i
op_rz   = "RZ"i
op_rnz  = "RNZ"i
op_rp   = "RP"i
op_rm   = "RM"i
op_rpe  = "RPE"i
op_rpo  = "RPO"i
op_xchg = "XCHG"i
op_xthl = "XTHL"i
op_ei   = "EI"i
op_di   = "DI"i
op_nop  = "NOP"i

op_inr  = op:"INR"i operands:singleRegisterOperand { return [op].concat(operands); }
op_dcr  = op:"DCR"i operands:singleRegisterOperand { return [op].concat(operands); }
op_add  = op:"ADD"i operands:singleRegisterOperand { return [op].concat(operands); }
op_adc  = op:"ADC"i operands:singleRegisterOperand { return [op].concat(operands); }
op_sub  = op:"SUB"i operands:singleRegisterOperand { return [op].concat(operands); }
op_sbb  = op:"SBB"i operands:singleRegisterOperand { return [op].concat(operands); }
op_ana  = op:"ANA"i operands:singleRegisterOperand { return [op].concat(operands); }
op_xra  = op:"XRA"i operands:singleRegisterOperand { return [op].concat(operands); }
op_ora  = op:"ORA"i operands:singleRegisterOperand { return [op].concat(operands); }
op_cmp  = op:"CMP"i operands:singleRegisterOperand { return [op].concat(operands); }

singleRegisterOperand = w:whitespace+ r:register { return [w, r]; } / singleRegisterOperandError

singleRegisterOperandError = .* {
    error(`{
        "type": "Invalid Operands",
        "message": "Invalid operands syntax for instruction",
        "hint": ["The operand should be a single register."]
    }`);
}

op_stax = op:"STAX"i operands:ldaxStaxOperands { return [op].concat(operands); }
op_ldax = op:"LDAX"i operands:ldaxStaxOperands { return [op].concat(operands); }

ldaxStaxOperands = w:whitespace+ r:(registerPairB / registerPairD) {
    return [w, r];
} / ldaxStaxOperandError

ldaxStaxOperandError = .* {
    error(`{
        "type": "Invalid Operands",
        "message": "Invalid operands for LDAX/STAX instruction",
        "hint": ["The operand should be either the register pair B or D."]
    }`)
}

op_push = op:"PUSH"i operands:pushPopOperands { return [op].concat(operands); }
op_pop  = op:"POP"i  operands:pushPopOperands { return [op].concat(operands); }

pushPopOperands = w:whitespace+ r:(registerPair / registerPairPSW) {
    return [w, r];
} / pushPopOperandError

pushPopOperandError = .* {
    error(`{
        "type": "Invalid Operands",
        "message": "Invalid operands for PUSH/POP instruction",
        "hint": ["The operand should be either a register pair or PSW.", "A register pair is written as B, D or H.", "Program status word (Contents of A and status flags, written as PSW or psw)"]
    }`)
}

op_dad  = op:"DAD"i operands:registerPairOrStackPointerOperand { return [op].concat(operands); }
op_inx  = op:"INX"i operands:registerPairOrStackPointerOperand { return [op].concat(operands); }
op_dcx  = op:"DCX"i operands:registerPairOrStackPointerOperand { return [op].concat(operands); }

registerPairOrStackPointerOperand = w:whitespace+ o:(registerPair / stackPointer) {
    return [w, o];
} / registerPairOrStackPointerOperandError

registerPairOrStackPointerOperandError = .* {
    error(`{
        "type": "Invalid Operands",
        "message": "Invalid operands syntax for instruction",
        "hint": ["The operand should be either a register pair or stack pointer.", "A register pair is written as B, D or H."]
    }`);
}

op_adi  = op:"ADI"i operands:immediate_instruction_operands { return [op].concat(operands); }
op_aci  = op:"ACI"i operands:immediate_instruction_operands { return [op].concat(operands); }
op_sui  = op:"SUI"i operands:immediate_instruction_operands { return [op].concat(operands); }
op_sbi  = op:"SBI"i operands:immediate_instruction_operands { return [op].concat(operands); }
op_ani  = op:"ANI"i operands:immediate_instruction_operands { return [op].concat(operands); }
op_xri  = op:"XRI"i operands:immediate_instruction_operands { return [op].concat(operands); }
op_ori  = op:"ORI"i operands:immediate_instruction_operands { return [op].concat(operands); }
op_cpi  = op:"CPI"i operands:immediate_instruction_operands { return [op].concat(operands); }
op_in   = op:"IN"i  operands:immediate_instruction_operands { return [op].concat(operands); }
op_out  = op:"OUT"i operands:immediate_instruction_operands { return [op].concat(operands); }

immediate_instruction_operands = w:whitespace+ o:(expressionImmediate / data8 / labelImmediate) {
    return [w, o]
} / immediate_instruction_operands_error

immediate_instruction_operands_error = .* {
    error(`{
        "type": "Invalid Operands",
        "message": "Invalid operands syntax for instruction",
        "hint": ["The operand should be either an expression, 8-byte data or a label."]
    }`);
}

op_sta  = op:"STA"i operands:loadStoreOperands { return [op].concat(operands); }
op_lda  = op:"LDA"i operands:loadStoreOperands { return [op].concat(operands); }
op_shld = op:"SHLD"i operands:loadStoreOperands { return [op].concat(operands); }
op_lhld = op:"LHLD"i operands:loadStoreOperands { return [op].concat(operands); }

loadStoreOperands = w:whitespace+ operand:(data16 / labelDirect) {
    return [w, operand];
} / loadStoreOperandError

loadStoreOperandError = .* {
    error(`{
        "type": "Invalid Operand for STA/LDA/SHLD/LHLD",
        "message": "Invalid operands syntax for instruction",
        "hint": ["Expected a 2 byte data or a label."]
    }`);
}

op_jmp  = inst:("JMP"  / "jmp" ) operand:jump_operand { return [inst].concat(operand); }
op_jc   = inst:("JC"   / "jc"  ) operand:jump_operand { return [inst].concat(operand); }
op_jnc  = inst:("JNC"  / "jnc" ) operand:jump_operand { return [inst].concat(operand); }
op_jz   = inst:("JZ"   / "jz"  ) operand:jump_operand { return [inst].concat(operand); }
op_jnz  = inst:("JNZ"  / "jnz" ) operand:jump_operand { return [inst].concat(operand); }
op_jm   = inst:("JM"   / "jm"  ) operand:jump_operand { return [inst].concat(operand); }
op_jp   = inst:("JP"   / "jp"  ) operand:jump_operand { return [inst].concat(operand); }
op_jpe  = inst:("JPE"  / "jpe" ) operand:jump_operand { return [inst].concat(operand); }
op_jpo  = inst:("JPO"  / "jpo" ) operand:jump_operand { return [inst].concat(operand); }

jump_operand = w:whitespace+ operand:(expressionDirect / labelDirect / data16) / jump_operand_error {
    return [w, operand]
}

jump_operand_error = .* {
    error(`{
        "type": "Invalid Operands",
        "message": "Invalid operands syntax for Jump instruction",
        "hint": ["Expected a 2 byte address, label or an expression."]
    }`);
}

op_call = inst:"CALL"i operands:call_operand { return [inst].concat(operands); }
op_cc   = inst:"CC"i operands:call_operand { return [inst].concat(operands); }
op_cnc  = inst:"CNC"i operands:call_operand { return [inst].concat(operands); }
op_cz   = inst:"CZ"i operands:call_operand { return [inst].concat(operands); }
op_cnz  = inst:"CNZ"i operands:call_operand { return [inst].concat(operands); }
op_cm   = inst:"CM"i operands:call_operand { return [inst].concat(operands); }
op_cp   = inst:"CP"i operands:call_operand { return [inst].concat(operands); }
op_cpe  = inst:"CPE"i operands:call_operand { return [inst].concat(operands); }
op_cpo  = inst:"CPO"i operands:call_operand { return [inst].concat(operands); }

call_operand = w:whitespace+ operand:(expressionDirect / data16 / labelDirect) / call_operand_error {
    return [w, operand];
}

call_operand_error = .* {
    error(`{
        "type": "Invalid Operands",
        "message": "Invalid operands syntax for Call instruction",
        "hint": ["Expected a 2 byte address, label or an expression."]
    }`);
}

op_mov = inst:"MOV"i operands:movOperands {
    return [inst].concat(operands);
}

movOperands = w:whitespace+ dest:register w1:whitespace* ',' w2:whitespace* src:register {
    if (dest === src && dest.toLowerCase() === "m") {
        error(`{
            "type": "Invalid Operands",
            "message": "Invalid operands syntax for MOV instruction",
            "hint": ["Both the operands cannot be memory locations."]
        }`);
    }
    return [w, dest, w1, ',', w2, src];
} / whitespace+ register whitespace* register {
    error(`{
        "type": "Invalid Operands",
        "message": "Invalid operands syntax for MOV instruction",
        "hint": ["You forgot to add a ',' (comma) between the operands. Expected syntax: MOV register, register."]
    }`);
} / movOperandsError

movOperandsError = .* {
    error(`{
        "type": "Invalid Operands",
        "message": "Invalid operands syntax for MOV instruction",
        "hint": ["Expected syntax: MOV register, register."]
    }`);
}

op_lxi  = op:"LXI"i operands:lxiOperands { return [op].concat(operands); }

lxiOperands = w1:whitespace+ r:(registerPair / stackPointer) w2:whitespace* c:[,] w3:whitespace* d:(expressionDirect / data16 / labelDirect) {
    return [w1, r, w2, c, w3, d];
} / whitespace+ (registerPair / stackPointer) whitespace* whitespace* (expressionDirect / data16 / labelDirect) {
    error(`{
        "type": "Invalid Operands",
        "message": "Invalid operands syntax for LXI instruction",
        "hint": ["You forgot to add a ',' (comma) between the operands. Expected LXI register, data."]
    }`);
} / .* {
    error(`{
        "type": "Invalid Operands",
        "message": "Invalid operands for LXI instruction",
        "hint": ["Expected word, a label or an expression. Also make sure the operands are separated by a comma. Expected LXI register, data."]
    }`);
}

op_mvi  = inst:"MVI"i operands:mvi_operands {
    return [inst].concat(operands);
}

mvi_operands = w1:whitespace+ dest:register w2:whitespace* c:[,] w3:whitespace* data:(expressionImmediate / data8 / labelImmediate) {
    return [w1, dest, w2, c, w3, data];
} / whitespace+ r:register whitespace* data:(expressionImmediate / data8 / labelImmediate) {
    error(`{
        "type": "Invalid Operands",
        "message": "Invalid operands syntax for MVI instruction",
        "hint": ["You forgot to add a ',' (comma) between the operands. Expected MVI register, data."]
    }`);
} / mvi_operand_error

mvi_operand_error = .* {
    error(`{
        "type": "Invalid Operands",
        "message": "Invalid operands for MVI instruction",
        "hint": ["Expected byte, a label or an expression. Also make sure the operands are separated by a comma. Expected MVI register, data."]
    }`);
}
