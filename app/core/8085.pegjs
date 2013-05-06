program = __ first:line rest:(eol l:line {return l})* {return [first].concat(rest);}

line = whitespace* label:labelPart? op:operation? comment:comment? {
    return {
        label: label === "" ? null:label,
        op: op,
        comment: comment
    };
}

operation = inst:instruction whitespace* {
    return inst;
}

labelPart = label:label ":" whitespace* {return label;}
label = first:[a-zA-Z?@] rest:([a-zA-Z0-9]*) {return first + rest.join("");}

paramList = whitespace+ first:value rest:(whitespace* ',' whitespace* v:value { return v; })* {
    return [first].concat(rest);
}

value = register / label

register = l:[AaBbCcDdEeHhLlMm] !identLetter { return l.toLowerCase(); }

registerPair = l:[BbDdHh] !identLetter { return l.toLowerCase(); }

registerPairB = l:[Bb] !identLetter { return l.toLowerCase(); }
registerPairD = l:[Dd] !identLetter { return l.toLowerCase(); }
registerPairH = l:[Hh] !identLetter { return l.toLowerCase(); }
registerPairPSW = l:("PSW" / "psw") !identLetter { return l.toLowerCase(); }
stackPointer = l:("SP" / "sp") !identLetter { return l.toLowerCase(); }


data8 = numLiteral
data16 = numLiteral

numLiteral "numeric literal" = binLiteral / hexLiteral / decLiteral
 
decLiteral "decimal literal" =
digits:digit+ { return parseInt(digits.join(""), 10); }
 
hexLiteral "hex literal" =
'0x' hexits:hexit+ { return parseInt(hexits.join(""), 16); }
 
binLiteral "binary literal" =
'0b' bits:bit+ { return parseInt(bits.join(""), 2); }


identifier "identifier" = ltrs:identLetter+ { return ltrs.join(""); }
identLetter "letter/underscore" = [a-zA-Z_]
digit "digit" = [0-9]
hexit "hex digit" = [0-9a-fA-F]
bit "bit" = [01]

comment = ";" c:[^\n\r\n\u2028\u2029]* {return c.join("");}

__ = (whitespace / eol )*

eol "line end" = "\n" / "\r\n" / "\r" / "\u2028" / "\u2029"

whitespace "whitespace" = [ \t\v\f\u00A0\uFEFF\u1680\u180E\u2000-\u200A\u202F\u205F\u3000]

instruction = zeroOperandOp / one_operand_op

zeroOperandOp =
    op_stc / op_cmc / op_cma / op_daa / op_sphl / op_pchl / op_hlt / op_rlc / op_rrc / op_rar /
    op_ret / op_rc / op_rnc / op_rz / op_rnz/ op_rp / op_rm / op_rpe / op_rpo / op_xchg / op_xthl / 
    op_ei / op_di /op_nop

one_operand_op =
    op:(op_inr / op_dcr / op_stax / op_ldax / op_add / op_adc / op_sub / op_sbb / op_ana / op_xra /
    op_ora / op_cmp / op_push / op_pop / op_dad / op_inx / op_dcx / op_adi / op_aci / op_sui /
    op_sbi / op_ani / op_xri / op_ori / op_cpi / op_sta / op_lda / op_shld / op_lhld /
    op_jmp / op_jc / op_jnc / op_jz / op_jnz / op_jm / op_jp / op_jpe / op_jpo /
    op_cmp / op_cc / op_cnc / op_cz / op_cnz / op_cm / op_cp / op_cpe / op_cpo)
    {
        return {
            inst:op[0],
            params:[op[2]]
        };
    }
    
op_stc = "STC"
op_cmc = "CMC"
op_cma = "CMA"
op_daa = "DAA"
op_sphl = "SPHL"
op_pchl = "PCHL"
op_hlt = "HLT"
op_rlc = "RLC"
op_rrc = "RRC"
op_rar = "RAR"
op_ret = "RET"
op_rc = "RC"
op_rnc = "RNC"
op_rz = "RZ"
op_rnz = "RNZ"
op_rp = "RP"
op_rm = "RM"
op_rpe = "RPE"
op_rpo = "RPO"
op_xchg = "XCHG"
op_xthl = "XTHL"
op_ei = "EI"
op_di = "DI"
op_nop = "NOP"


op_inr = "INR" whitespace+ register
op_dcr = "DCR" whitespace+ register
op_stax = "STAX" whitespace+ (registerPairB / registerPairD)
op_ldax = "LDAX" whitespace+ (registerPairB / registerPairD)
op_add = "ADD" whitespace+ register
op_adc = "ADC" whitespace+ register
op_sub = "SUB" whitespace+ register
op_sbb = "SBB" whitespace+ register
op_ana = "ANA" whitespace+ register
op_xra = "XRA" whitespace+ register
op_ora = "ORA" whitespace+ register
op_cmp = "CMP" whitespace+ register
op_push = "PUSH" whitespace+ (registerPair / registerPairPSW)
op_pop = "POP" whitespace+ (registerPair / registerPairPSW)
op_dad = "DAD" whitespace+ (registerPair / stackPointer)
op_inx = "INX" whitespace+ (registerPair / stackPointer)
op_dcx = "DCX" whitespace+ (registerPair / stackPointer)
op_adi = ("ADI" / "adi") whitespace+ (data8 / label)
op_aci = ("ACI" / "aci") whitespace+ (data8 / label)
op_sui = ("SUI" / "sui") whitespace+ (data8 / label)
op_sbi = ("SBI" / "sbi") whitespace+ (data8 / label)
op_ani = ("ANI" / "ani") whitespace+ (data8 / label)
op_xri = ("XRI" / "xri") whitespace+ (data8 / label)
op_ori = ("ORI" / "ori") whitespace+ (data8 / label)
op_cpi = ("CPI" / "cpi") whitespace+ (data8 / label)
op_sta = ("STA" / "sta") whitespace+ (data16 / label)
op_lda = ("LDA" / "lda") whitespace+ (data16 / label)
op_shld = ("SHLD" / "shld") whitespace+ (data16 / label)
op_lhld = ("LHLD" / "lhld") whitespace+ (data16 / label)

op_jmp = ("JMP" / "jmp") whitespace+ (data16 / label)
op_jc = ("JC" / "jc") whitespace+ (data16 / label)
op_jnc = ("JNC" / "jnc") whitespace+ (data16 / label)
op_jz = ("JZ" / "jz") whitespace+ (data16 / label)
op_jnz = ("JNZ" / "jnz") whitespace+ (data16 / label)
op_jm = ("JM" / "jm") whitespace+ (data16 / label)
op_jp = ("JP" / "jp") whitespace+ (data16 / label)
op_jpe = ("JPE" / "jpe") whitespace+ (data16 / label)
op_jpo = ("JPO" / "jpo") whitespace+ (data16 / label)

op_call = ("CALL" / "call") whitespace+ (data16 / label)
op_cc = ("CC" / "cc") whitespace+ (data16 / label)
op_cnc = ("CNC" / "cnc") whitespace+ (data16 / label)
op_cz = ("CZ" / "cz") whitespace+ (data16 / label)
op_cnz = ("CNZ" / "cnz") whitespace+ (data16 / label)
op_cm = ("CM" / "cm") whitespace+ (data16 / label)
op_cp = ("CP" / "cp") whitespace+ (data16 / label)
op_cpe = ("CPE" / "cpe") whitespace+ (data16 / label)
op_cpo = ("CPO" / "cpo") whitespace+ (data16 / label)
