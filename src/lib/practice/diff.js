/**
 * A line diff between the step's starting code and the learner's own.
 *
 * Once a step carries the previous step's solution into the editor, the code
 * a learner sees is their own, and the scaffolding the step actually handed
 * them (comments marking where the new work goes, prior instructions laid out
 * a particular way) is invisible. This is what makes it visible again.
 *
 * Plain LCS. Step programs are tens of lines, so the quadratic table is far
 * cheaper than pulling in a diff library, and the guard below keeps a pasted
 * monster from locking the panel.
 */

const MAX_LINES = 400;

function splitLines(text) {
    // A trailing newline is an artifact of the file, not a line the learner wrote.
    return String(text ?? "").replace(/\n$/, "").split("\n");
}

/** Trailing whitespace differences are noise, not edits. */
function normalize(line) {
    return line.replace(/\s+$/, "");
}

/**
 * @returns {Array<{type: "same"|"removed"|"added", text: string}>}
 *   "removed" is in the starting code but not the learner's, "added" is theirs.
 */
export function diffLines(before, after) {
    const a = splitLines(before);
    const b = splitLines(after);

    if (a.length > MAX_LINES || b.length > MAX_LINES) {
        return [
            ...a.map((text) => ({ type: "removed", text })),
            ...b.map((text) => ({ type: "added", text })),
        ];
    }

    const na = a.map(normalize);
    const nb = b.map(normalize);

    // lengths[i][j] = LCS length of a[i..] and b[j..]
    const lengths = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
    for (let i = a.length - 1; i >= 0; i--) {
        for (let j = b.length - 1; j >= 0; j--) {
            lengths[i][j] =
                na[i] === nb[j] ? lengths[i + 1][j + 1] + 1 : Math.max(lengths[i + 1][j], lengths[i][j + 1]);
        }
    }

    const out = [];
    let i = 0;
    let j = 0;
    while (i < a.length && j < b.length) {
        if (na[i] === nb[j]) {
            out.push({ type: "same", text: b[j] });
            i++;
            j++;
        } else if (lengths[i + 1][j] >= lengths[i][j + 1]) {
            out.push({ type: "removed", text: a[i] });
            i++;
        } else {
            out.push({ type: "added", text: b[j] });
            j++;
        }
    }
    while (i < a.length) out.push({ type: "removed", text: a[i++] });
    while (j < b.length) out.push({ type: "added", text: b[j++] });

    return out;
}

export function isUnchanged(before, after) {
    return diffLines(before, after).every((line) => line.type === "same");
}
