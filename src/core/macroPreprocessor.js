// Expands ASM80 macros before the grammar sees the source.
//
// Macros are a textual construct: a definition is a block of source lines, and
// an invocation is replaced by those lines with the parameters substituted.
// That does not fit a PEG grammar, which cannot re-enter itself on text it has
// generated, so it happens here instead.
//
//   TRUE    MACRO   WHERE
//           JC      WHERE
//           ENDM
//
//           TRUE    FOUND      ; assembles as JC FOUND
//
// Because an invocation of one line can become several, the output no longer
// lines up with what the user wrote. expandMacros therefore returns a lineMap
// giving, for each output line, the source line it came from, and
// simulator.js uses it to move error locations back before anyone sees them.

const DEFINITION = /^\s*([A-Za-z?@][A-Za-z0-9_?@]*)\s+MACRO\b\s*(.*)$/i;
const ENDM = /^\s*ENDM\b/i;
const CONDITIONAL = /^\s*(IF|ELSE|ENDIF)\b/i;

const stripComment = (line) => line.replace(/;.*$/, "");

// Guards against a macro that invokes itself, directly or in a cycle.
const MAX_DEPTH = 16;

function splitArguments(text) {
    const args = [];
    let current = "";
    let quoted = false;
    for (const ch of text) {
        if (ch === "'") quoted = !quoted;
        if (ch === "," && !quoted) {
            args.push(current.trim());
            current = "";
            continue;
        }
        current += ch;
    }
    if (current.trim() || args.length) args.push(current.trim());
    return args;
}

// Substitutes parameters by whole-identifier match, so a parameter named X does
// not rewrite a symbol named XY.
function substitute(line, parameters, args) {
    if (!parameters.length) return line;
    const byName = new Map(parameters.map((p, i) => [p.toUpperCase(), args[i] ?? ""]));
    return line.replace(/[A-Za-z?@][A-Za-z0-9_?@]*/g, (name) => {
        const replacement = byName.get(name.toUpperCase());
        return replacement === undefined ? name : replacement;
    });
}

// This pass runs before the grammar, so it cannot know which arm of an IF the
// assembler will take. A definition inside a conditional block would therefore
// become available whether or not the block is assembled, which is not what the
// source says; the definition is refused rather than quietly misread. Only the
// nesting is tracked here, never the conditions themselves.
function collectDefinitions(lines, locate) {
    const macros = new Map();
    const remaining = [];
    let current = null;
    let conditionalDepth = 0;

    lines.forEach((line, index) => {
        if (current) {
            if (ENDM.test(stripComment(line))) {
                macros.set(current.name.toUpperCase(), current);
                current = null;
            } else {
                current.body.push(line);
            }
            // A definition occupies its lines without producing any, so they are
            // blanked rather than dropped and the line numbering stays put.
            remaining.push({ text: "", from: index });
            return;
        }

        const conditional = CONDITIONAL.exec(stripComment(line));
        if (conditional) {
            const directive = conditional[1].toUpperCase();
            if (directive === "IF") conditionalDepth += 1;
            else if (directive === "ENDIF") conditionalDepth = Math.max(0, conditionalDepth - 1);
        }

        const definition = DEFINITION.exec(stripComment(line));
        if (definition) {
            if (conditionalDepth) {
                const error = new Error(`MACRO ${definition[1]} cannot be defined inside IF ... ENDIF.`);
                error.hint = [
                    "Macros are expanded before the conditions are decided, so a macro defined in a skipped block would still be available.",
                    "Move the definition outside the conditional block, or put the IF inside the macro body.",
                ];
                error.location = locate(index);
                throw error;
            }
            current = {
                name: definition[1],
                line: index,
                parameters: splitArguments(definition[2]),
                body: [],
            };
            remaining.push({ text: "", from: index });
            return;
        }

        remaining.push({ text: line, from: index });
    });

    if (current) {
        const error = new Error(`MACRO ${current.name} has no matching ENDM.`);
        error.location = locate(current.line);
        throw error;
    }

    return { macros, remaining };
}

function expandOnce(rows, macros) {
    let expanded = false;
    const out = [];

    for (const row of rows) {
        const body = stripComment(row.text);
        // An invocation is a macro name where a mnemonic would be, optionally
        // behind a label.
        const match = /^\s*(?:([A-Za-z?@][A-Za-z0-9_?@]*:)\s*)?([A-Za-z?@][A-Za-z0-9_?@]*)\s*(.*)$/.exec(body);
        const macro = match && macros.get(match[2].toUpperCase());
        if (!macro) {
            out.push(row);
            continue;
        }

        expanded = true;
        const args = splitArguments(match[3]);
        const label = match[1] ? `${match[1]} ` : "";
        if (!macro.body.length && label) {
            // The label still has to land somewhere.
            out.push({ text: label, from: row.from });
        }
        macro.body.forEach((line, i) => {
            out.push({ text: (i === 0 ? label : "") + substitute(line, macro.parameters, args), from: row.from });
        });
    }

    return { rows: out, expanded };
}

// Points an error at a whole source line, which is as precise as anything this
// pass knows about.
function lineLocator(source) {
    const starts = [0];
    for (let i = 0; i < source.length; i += 1) {
        if (source[i] === "\n") starts.push(i + 1);
    }
    return (index) => {
        const start = starts[index] ?? 0;
        const length = (starts[index + 1] ?? source.length + 1) - start - 1;
        return {
            start: { line: index + 1, column: 1, offset: start },
            end: { line: index + 1, column: Math.max(1, length + 1), offset: start + Math.max(0, length) },
        };
    };
}

export function expandMacros(source) {
    // Nothing to do for the overwhelming majority of programs, and skipping the
    // work also guarantees their locations are untouched.
    if (!/\bMACRO\b/i.test(source)) return { text: source, lineMap: null };

    const { macros, remaining } = collectDefinitions(source.split("\n"), lineLocator(source));
    if (!macros.size) return { text: source, lineMap: null };

    let rows = remaining;
    for (let depth = 0; depth < MAX_DEPTH; depth += 1) {
        const step = expandOnce(rows, macros);
        rows = step.rows;
        if (!step.expanded) break;
        if (depth === MAX_DEPTH - 1) {
            throw new Error("Macro expansion is too deeply nested; is a macro invoking itself?");
        }
    }

    return { text: rows.map((r) => r.text).join("\n"), lineMap: rows.map((r) => r.from) };
}

// Rewrites peggy locations, which refer to the expanded text, so they point at
// the source the user actually wrote.
export function remapLocations(value, lineMap, source) {
    if (!lineMap) return value;

    const lineStarts = [0];
    for (let i = 0; i < source.length; i += 1) {
        if (source[i] === "\n") lineStarts.push(i + 1);
    }

    const point = (p) => {
        if (!p || typeof p.line !== "number") return p;
        const originalLine = lineMap[p.line - 1];
        if (originalLine === undefined) return p;
        const start = lineStarts[originalLine] ?? 0;
        const nextStart = lineStarts[originalLine + 1] ?? source.length + 1;
        // An expanded line is not the user's text, so anything past the end of
        // the invocation is clamped back onto it.
        const column = Math.min(p.column, nextStart - start);
        return { line: originalLine + 1, column, offset: start + column - 1 };
    };

    const seen = new Set();
    const walk = (node) => {
        if (!node || typeof node !== "object" || seen.has(node)) return;
        seen.add(node);
        if (node.start && node.end && typeof node.start.line === "number") {
            node.start = point(node.start);
            node.end = point(node.end);
            return;
        }
        for (const key of Object.keys(node)) walk(node[key]);
    };
    walk(value);
    return value;
}
