(function (CodeMirror) {
  "use strict";

  var CONTEXT = {
    SOL: 0,
    LABEL: 1,
    OPCODE: 2,
    OPERAND: 3
  };

  CodeMirror.defineMode('8085', function (_config, parserConfig) {
      var opcodes = /^(call|[crj](c|nc|z|nz|p|m|pe|po)|ret|rst|in[xr]?|out|lxi|push|pop|stax?|ldax?|xchg|(xt|sp|pc)hl|dad|mov|hlt|mvi|dc[rx]|ad[dci]|su[bi]|sb[bi]|an[di]|[xo]r[ai]|cmp|aci|cpi|rlc|rrc|ral|rar|jmp|cm[ac]|stc|daa|[sl]hld|[rs]im|[ed]i|nop|db|dw|ds)\b/i;
      var variables = /^(a|bc?|c|de?|e|hl?|l|psw|sp)\b/i;
      var numbers = /^([\da-f]+h|[0-7]+o|[01]+b|\d+d?)\b/i;
      var label = /^[?@a-z][a-zA-Z0-9]{0,5}:\b/i;

      return {
        startState: function () {
          return { context: CONTEXT.SOL };
        },
        token: function (stream, state) {
          if (stream.sol())
            state.context = CONTEXT.SOL;

          if (stream.eatSpace())
            return null;

          var w;

          if (stream.eatWhile(/\w/)) {
            w = stream.current();

            if (state.context === CONTEXT.SOL && label.test(w)) {
              state.context = CONTEXT.LABEL;
              return "label";
            }

            if (state.context === CONTEXT.SOL && opcodes.test(w)) {
              state.context = CONTEXT.OPCODE;
              return "keyword";
            }

            if (state.context === CONTEXT.OPCODE) {
              if (variables.test(w)) {
                return "variable";
              } else if (numbers.test(w)) {
                return "number";
              }
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
        }
      };
  });
}(CodeMirror));
