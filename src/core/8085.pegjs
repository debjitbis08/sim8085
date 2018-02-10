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
        objCode = [];

    for (i = 0; i < lines; i += 1) {
        line = prg[i];

        if (line == null) continue;

        if (!line.opcode) {
        	if (Array.isArray(line.data)) {
            	objCode = objCode.concat(line.data.map(function (d) {
                	return { data: d.value, kind: 'data', location: d.location };
                }));
            }
            continue;
        };

        if (line.size === 1) {
            objCode.push({ data: line.opcode, kind: 'code', location: line.location });
        } else if (line.size === 2) {
            data = line.data.value;
            if (typeof line.data.value === "string" && !symbolTable[line.data.value]) {
                var e = new Error();
                e.message = "Label " + line.data.value + " is not defined.";
                e.location = line.location;
                if (typeof line !== "undefined" && typeof column !== "undefined") {
                    e.line = line; e.column = column;
                }
                throw e;
            }

            dataVal = (typeof line.data.value === "string")
                ? line.data.type === "direct"
                ? symbolTable[line.data.value].addr
                : symbolTable[line.data.value].value
                : (typeof line.data.value === "number") ? line.data.value
                : typeof line.data.value === "object" && line.data.value.value ? line.data.value.value
                : 0;
            if (dataVal < 0) {
                dataVal = twosComplement(dataVal);
            }
            objCode.push({ data: line.opcode, kind: 'code', location: line.location });
            objCode.push({ data: dataVal, kind: 'data', location: line.data.location });
        } else {
            data = line.data.value;
            if (typeof line.data.value === "string" && !symbolTable[line.data.value]) {
                var e = new Error();
                e.message = "Label " + line.data.value + " is not defined.";
                e.location = line.location;
                if (typeof line !== "undefined" && typeof column !== "undefined") {
                    e.line = line; e.column = column;
                }
                throw e;
            }


            dataVal = (typeof line.data.value === "string")
                ? line.data.type === "direct"
                ? symbolTable[line.data.value].addr
                : symbolTable[line.data.value].value
                : (typeof line.data.value === "number") ? line.data.value
                : typeof line.data.value === "object" && line.data.value.value ? line.data.value.value
                : 0;
            objCode.push({ data: line.opcode, kind: 'code', location: line.location });
            objCode.push({ data: dataVal & 0xFF, kind: 'data', location: line.data.location });
            objCode.push({ data: dataVal >> 8, kind: 'data', location: line.data.location });
        }
    }

    console.log(objCode);
    return objCode;
}

/**
 * Create intermediate object code with symbol strings.
 */
program = __ first:line rest:(eol l:line {return l})* {return [first].concat(rest);}

labelDir = label:labelPart? dir:directive {
    if (label && label !== "") {
        symbolTable[label.value] = { addr: ilc, value: op[0] };
    }
    
    if (dir !== null) {
      ilc += dir.size;
      return dir;
    }
}

labelOp = label:labelPart? op:(operation / directive) {
    if (label && label !== "") {
        symbolTable[label.value] = {
            addr: ilc,
            value: op.opcode != null ? op.opcode :
                op.data ? Array.isArray(op.data) ? op.data[0].value : op.data.value : null
        };
    }

    if (op !== null) {
      ilc += op.size;
      return op;
    }
}

line = lineOp

lineOp = whitespace* lop:labelOp? comment:comment? { return lop; }
lineDir = whitespace* lop:labelDir? comment:comment? { return lop; } 

labelPart = label:label ":" whitespace* {
    return { value: label.value, location: label.location, type: "definition" }
}
label "label" = first:[a-zA-Z?@] rest:([a-zA-Z0-9]*) {
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

data8_list "comma separated byte values" = d:data8 ds:("," __ data8)* {
  return { value: [d.value].concat(ds.map(function (d_) { return d_[2].value; })), location: location() };
}

data16_list "comma separated byte values" = d:data16 ds:("," __ data16)* {
  return { value: [d.value].concat(ds.map(function (d_) { return d_[2].value; })), location: location() };
}

data8 "byte" = n:numLiteral {
    if (n > 0xFF) {
        var e = new Error();
        e.message = "8-bit data expected.";
        if (typeof line !== "undefined" && typeof column !== "undefined") {
            e.line = line; e.column = column;
        }
        throw e;
    } else {
        return { value: n, location: location() };
    }
}

data16 "word" = n:numLiteral {
    if (n > 0xFFFF) {
        var e = new Error();
        e.message = "16-bit data expected.";
        if (typeof line !== "undefined" && typeof column !== "undefined") {
            e.line = line; e.column = column;
        }
        throw e;
    } else {
        return { value: n, location: location() };
    }
}

numLiteral "numeric literal" = binLiteral / hexLiteral / octalLiteral / decLiteral

decLiteral "decimal literal" = decForm1 / decForm2

decForm1 = neg:[-]? digits:digit+ {
    return { value: parseInt((!neg ? "":"-") + digits.join(""), 10), location: location() };
}

decForm2 = neg:[-]? digits:digit+ "D" {
    return { value: parseInt((!neg ? "":"-") + digits.join(""), 10), location: location() };
}

hexLiteral "hex literal" = hexForm1 / hexForm2

hexForm1 = '0x' hexits:hexit+ {
    return { value: parseInt(hexits.join(""), 16), location: location() };
}

hexForm2 = hexits:hexit+ ("H" / "h") {
    return { value: parseInt(hexits.join(""), 16), location: location() };
}

octalLiteral "Octal Literal" = octits:octit+ ("O" / "Q" / "o" / "q") {
    return { value: parseInt(octits.join(""), 8), location: location() };
}

binLiteral "binary literal" = bits:bit+ "B" {
    return { value: parseInt(bits.join(""), 2), location: location() };
}


identifier "identifier" = ltrs:identLetter+ {
    return { value: ltrs.join(""), location: location() };
}
identLetter "letter/underscore" = [a-zA-Z_]
digit "digit" = [0-9]
hexit "hex digit" = [0-9a-fA-F]
octit "octal digit" = [0-7]
bit "bit" = [01]

expression "expression" = arithmetic

// / shift / logical / compare / byteIsolation

arithmetic "Arithmetic Expression" = addition

addition "Addition"
  = left:subtraction whitespace* "+" whitespace* right:addition {
    return { value: left + right, location: location() };
  }
  / subtraction

subtraction "Subtraction"
  = left:multiplication whitespace* "-" whitespace* right:subtraction {
    return { value: left - right, location: location() };
  }
  / multiplication

multiplication "Multiplication"
  = left:division whitespace* "*" whitespace* right:multiplication {
    return { value: left * right, location: location() };
  }
  / division

division "Division"
  = left:modulo whitespace* "/" whitespace* right:division {
    return { value: left / right, location: location() };
  }
  / modulo

modulo "Modulo"
  = left:(numLiteral / label) whitespace* "MOD"i whitespace* right:modulo {
    return { value: left % right, location: location() };
  }
  / numLiteral
  / label
  / shift
  / "(" addition:addition ")" { return addition; }

shift "Shift Expression" = shiftRight

shiftRight "Shift Right"
  = left:shiftLeft whitespace+ "SHR"i whitespace+ right:shiftRight {
    return { value: left >> right, location: location() };
  }
  / shiftLeft


shiftLeft "Shift Left"
  = left:(numLiteral / label) whitespace+ "SHL"i whitespace+ right:shiftLeft {
    return { value: left << right, location: location() };
  }
  / numLiteral
  / labelImmediate
  / "(" shr:shift ")" { return shr; }


comment "comment" = ";" c:[^\n\r\n\u2028\u2029]* {return c.join("");}

__ = (whitespace / eol )*

eol "line end" = "\n" / "\r\n" / "\r" / "\u2028" / "\u2029"

whitespace "whitespace" = [ \t\v\f\u00A0\uFEFF\u1680\u180E\u2000-\u200A\u202F\u205F\u3000]

directive = dir:(dataDefinition) {
    return {
        opcode: null,
        data: dir.params,
        size: dir.params.length,
        location: location()
    };
}

operation = inst:(carryBitInstructions / singleRegInstructions / nopInstruction /
    dataTransferInstructions / regOrMemToAccInstructions / rotateAccInstructions /
    regPairInstructions / immediateInstructions / directAddressingInstructions /
    jumpInstructions / callInstructions / returnInstructions / haltInstruction) whitespace* {

    var paramTypes = inst.paramTypes,
        data,
        paramTypesStr = paramTypes.join(","),
        opcode = mnemonics[inst.name.toLowerCase() + (paramTypesStr === "" ? "" : " ") + paramTypesStr];

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

directAddressingInstructions = op:(op_sta / op_lda / op_shld / op_lhld) {
    return {
        name: op[0],
        params: [op[2]],
        paramTypes: ["adr"]
    }
}

jumpInstructions = op:(op_pchl / op_jmp / op_jc / op_jnc / op_jz / op_jnz / op_jp / op_jm / op_jpe / op_jpo) {
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

callInstructions = op:(op_call / op_cc / op_cnc / op_cz / op_cnz / op_cp / op_cm / op_cpe / op_cpo) {
    return {
        name: op[0],
        params: [op[2]],
        paramTypes: ["adr"]
    };
}

returnInstructions = op:(op_ret / op_rc / op_rnc / op_rz / op_rnz / op_rm / op_rp / op_rpe / op_rpo) {
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

dataDefinition = dir:(dir_db) {
    return {
       name: dir,
       params: dir[2].value.map(function (v) { return v; })
    };
}


dir_db  = ("DB"   / "db"  ) whitespace+ data8_list

op_stc  = ("STC"  / "stc" )
op_cmc  = ("CMC"  / "cmc" )
op_cma  = ("CMA"  / "cma" )
op_daa  = ("DAA"  / "daa" )
op_sphl = ("SPHL" / "sphl")
op_pchl = ("PCHL" / "pchl")
op_hlt  = ("HLT"  / "hlt" )
op_rlc  = ("RLC"  / "rlc" )
op_rrc  = ("RRC"  / "rrc" )
op_rar  = ("RAR"  / "rar" )
op_ral  = ("RAL"  / "ral" )
op_ret  = ("RET"  / "ret" )
op_rc   = ("RC"   / "rc"  )
op_rnc  = ("RNC"  / "rnc" )
op_rz   = ("RZ"   / "rz"  )
op_rnz  = ("RNZ"  / "rnz" )
op_rp   = ("RP"   / "rp"  )
op_rm   = ("RM"   / "rm"  )
op_rpe  = ("RPE"  / "rpe" )
op_rpo  = ("RPO"  / "rpo" )
op_xchg = ("XCHG" / "xchg")
op_xthl = ("XTHL" / "xthl")
op_ei   = ("EI"   / "ei"  )
op_di   = ("DI"   / "di"  )
op_nop  = ("NOP"  / "nop" )


op_inr  = ("INR"  / "inr" ) whitespace+ register
op_dcr  = ("DCR"  / "dcr" ) whitespace+ register
op_stax = ("STAX" / "stax") whitespace+ (registerPairB / registerPairD)
op_ldax = ("LDAX" / "ldax") whitespace+ (registerPairB / registerPairD)
op_add  = ("ADD"  / "add" ) whitespace+ register
op_adc  = ("ADC"  / "adc" ) whitespace+ register
op_sub  = ("SUB"  / "sub" ) whitespace+ register
op_sbb  = ("SBB"  / "sbb" ) whitespace+ register
op_ana  = ("ANA"  / "ana" ) whitespace+ register
op_xra  = ("XRA"  / "xra" ) whitespace+ register
op_ora  = ("ORA"  / "ora" ) whitespace+ register
op_cmp  = ("CMP"  / "cmp" ) whitespace+ register
op_push = ("PUSH" / "push") whitespace+ (registerPair / registerPairPSW / registerA)
op_pop  = ("POP"  / "pop" ) whitespace+ (registerPair / registerPairPSW)
op_dad  = ("DAD"  / "dad" ) whitespace+ (registerPair / stackPointer)
op_inx  = ("INX"  / "inx" ) whitespace+ (registerPair / stackPointer)
op_dcx  = ("DCX"  / "dcx" ) whitespace+ (registerPair / stackPointer)
op_adi  = ("ADI"  / "adi" ) whitespace+ (data8 / labelImmediate / expression)
op_aci  = ("ACI"  / "aci" ) whitespace+ (data8 / labelImmediate / expression)
op_sui  = ("SUI"  / "sui" ) whitespace+ (data8 / labelImmediate / expression)
op_sbi  = ("SBI"  / "sbi" ) whitespace+ (data8 / labelImmediate / expression)
op_ani  = ("ANI"  / "ani" ) whitespace+ (data8 / labelImmediate / expression)
op_xri  = ("XRI"  / "xri" ) whitespace+ (data8 / labelImmediate / expression)
op_ori  = ("ORI"  / "ori" ) whitespace+ (data8 / labelImmediate / expression)
op_cpi  = ("CPI"  / "cpi" ) whitespace+ (data8 / labelImmediate / expression)
op_sta  = ("STA"  / "sta" ) whitespace+ (data16 / labelDirect / expression )
op_lda  = ("LDA"  / "lda" ) whitespace+ (data16 / labelDirect / expression)
op_shld = ("SHLD" / "shld") whitespace+ (data16 / labelDirect / expression)
op_lhld = ("LHLD" / "lhld") whitespace+ (data16 / labelDirect / expression)

op_jmp  = ("JMP"  / "jmp" ) whitespace+ (labelDirect / data16 / expression)
op_jc   = ("JC"   / "jc"  ) whitespace+ (labelDirect / data16 / expression)
op_jnc  = ("JNC"  / "jnc" ) whitespace+ (labelDirect / data16 / expression)
op_jz   = ("JZ"   / "jz"  ) whitespace+ (labelDirect / data16 / expression)
op_jnz  = ("JNZ"  / "jnz" ) whitespace+ (labelDirect / data16 / expression)
op_jm   = ("JM"   / "jm"  ) whitespace+ (labelDirect / data16 / expression)
op_jp   = ("JP"   / "jp"  ) whitespace+ (labelDirect / data16 / expression)
op_jpe  = ("JPE"  / "jpe" ) whitespace+ (labelDirect / data16 / expression)
op_jpo  = ("JPO"  / "jpo" ) whitespace+ (labelDirect / data16 / expression)

op_call = ("CALL" / "call") whitespace+ (data16 / labelDirect / expression)
op_cc   = ("CC"   / "cc"  ) whitespace+ (data16 / labelDirect / expression)
op_cnc  = ("CNC"  / "cnc" ) whitespace+ (data16 / labelDirect / expression)
op_cz   = ("CZ"   / "cz"  ) whitespace+ (data16 / labelDirect / expression)
op_cnz  = ("CNZ"  / "cnz" ) whitespace+ (data16 / labelDirect / expression)
op_cm   = ("CM"   / "cm"  ) whitespace+ (data16 / labelDirect / expression)
op_cp   = ("CP"   / "cp"  ) whitespace+ (data16 / labelDirect / expression)
op_cpe  = ("CPE"  / "cpe" ) whitespace+ (data16 / labelDirect / expression)
op_cpo  = ("CPO"  / "cpo" ) whitespace+ (data16 / labelDirect / expression)

op_mov  = ("MOV"  / "mov" ) whitespace+ register whitespace* [,] whitespace* register
op_lxi  = ("LXI"  / "lxi" ) whitespace+ (registerPair / stackPointer) whitespace* [,] whitespace* (data16 / labelImmediate / expression)
op_mvi  = ("MVI"  / "mvi" ) whitespace+ register whitespace* [,] whitespace* (data8 / labelImmediate / expression)
