import {
  HighlightStyle,
  LanguageSupport,
  StreamLanguage,
  syntaxHighlighting,
} from "@codemirror/language";
import { Tag, tags } from "@lezer/highlight";

const tokenTable = {
  comment: tags.comment,
  identifier: tags.variableName,
  register: Tag.define(),
  number: tags.number,
  string: tags.string,
  label: Tag.define(),
  opcode: Tag.define(),
  directive: Tag.define(),
  keyword: Tag.define(),
  operator: tags.operator,
  punctuation: tags.punctuation,
  unassigned: Tag.define(),
};

const opcodes = /^(call|[crj](c|nc|z|nz|p|m|pe|po)|ret|rst|in[xr]?|out|lxi|push|pop|stax?|ldax?|xchg|(xt|sp|pc)hl|dad|mov|hlt|mvi|dc[rx]|ad[dci]|su[bi]|sb[bi]|an[di]|[xo]r[ai]|cmp|aci|cpi|rlc|rrc|ral|rar|jmp|cm[ac]|stc|daa|[sl]hld|[rs]im|[ed]i|nop)\b/i;
const directives = /^(db|dw|ds|org)\b/i;
const registers = /^(a|bc?|c|de?|e|hl?|l|psw|sp)\b/i;
const numbers = /^([\da-f]+h|[0-7]+o|[01]+b|\d+d?)\b/i;
const label = /^[?@a-z][a-zA-Z0-9]{0,5}/i;

const CONTEXT = {
  SOL: 0,
  LABEL: 1,
  OPCODE: 2,
  OPERAND: 3
};

let context = CONTEXT.SOL;

const language = StreamLanguage.define({
  name: "8085",
  token: (stream) => {
    if (stream.sol())
      context = CONTEXT.SOL;

    if (stream.eatSpace())
      return null;

    if (stream.eat(/[*+-]/)) {
      return "operator";
    }

    if (stream.eat(/[(),[\]]/)) {
      return "punctuation";
    }

    let w;

    if (stream.eatWhile(/\w/)) {
      w = stream.current();

      console.log(w, context);

      if (context === CONTEXT.SOL && opcodes.test(w)) {
        context = CONTEXT.OPCODE;
        console.log("Got opcode: ", w);
        context = CONTEXT.OPERAND
        return "opcode";
      }

      if (context === CONTEXT.SOL && directives.test(w)) {
        context = CONTEXT.OPCODE;
        console.log("Got opcode: ", w);
        context = CONTEXT.OPERAND
        return "directive";
      }

      if (context === CONTEXT.OPERAND) {
        if (registers.test(w)) {
          return "register";
        } else if (numbers.test(w)) {
          return "number";
        }
      }
      if (context === CONTEXT.SOL && label.test(w)) {
        if (stream.eat(":")) {
          context = CONTEXT.LABEL;
          console.log("Got Label: ", w);
          context = CONTEXT.SOL;
          return "label";
        } else return "identifier";
      }
      if (context = CONTEXT.OPERAND && label.test(w))  {
        return "label";
      }
    } else if (stream.eat(';')) {
      stream.skipToEnd();
      return 'comment';
    } else if (stream.eat('"')) {
      while (w = stream.next()) {
        if (w == '"')
          break;

        if (w == '\\')
          stream.next();
      }
      return 'string';
    } else {
      stream.next();
    }

    return null;
  },
  languageData: {
    commentTokens: { line: ";" },
    closeBrackets: { brackets: ["(", "[", '"'] },
  },
  tokenTable,
});

const syntaxHighlighter = syntaxHighlighting(
  HighlightStyle.define([
    { tag: tokenTable.opcode, class: "text-green-700 dark:text-green-400" },
    { tag: tokenTable.directive, class: "text-blue-700 dark:text-blue-400" },
    { tag: tokenTable.label, class: "text-yellow-700 dark:text-yellow-400" },
    { tag: tokenTable.comment, class: "text-gray-500 dark:text-gray-500 italic" },
    { tag: tokenTable.register, class: "text-red-700 dark:text-red-400" },
    { tag: tokenTable.number, class: "text-orange-700 dark:text-orange-400" },
    { tag: tokenTable.operator, class: "text-pink-700 dark:text-pink-400" },
  ])
);

export function Syntax8085() {
  return new LanguageSupport(language, [syntaxHighlighter]);
}
