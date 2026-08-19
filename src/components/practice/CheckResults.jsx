import { For, Show, createSignal } from "solid-js";
import { Reason } from "../../lib/practice/run-case.js";
import { hex8, hex16 } from "../../lib/practice/assert.js";

const FLAG_LABEL = { z: "Z", s: "S", p: "P", cy: "CY", ac: "AC" };

/**
 * Turn a setup or expectation into short, concrete pairs like "2000H = 3AH".
 * A case called "two ordinary values" tells a learner nothing about what was
 * actually run; the numbers do.
 */
function describeState(state) {
    if (!state) return [];
    const parts = [];

    for (const [address, value] of Object.entries(state.memory ?? {})) {
        parts.push(`${hex16(Number(address))} = ${hex8(value)}`);
    }
    for (const [name, value] of Object.entries(state.registers ?? {})) {
        parts.push(`${name.toUpperCase()} = ${hex8(value)}`);
    }
    for (const [name, value] of Object.entries(state.flags ?? {})) {
        parts.push(`${FLAG_LABEL[name] ?? name.toUpperCase()} = ${value ? "1" : "0"}`);
    }
    for (const [port, value] of Object.entries(state.io ?? {})) {
        parts.push(`port ${hex8(Number(port))} = ${hex8(value)}`);
    }
    if (state.sp !== undefined) parts.push(`SP = ${hex16(state.sp)}`);
    if (state.pc !== undefined) parts.push(`PC = ${hex16(state.pc)}`);
    if (state.maxTstates !== undefined) parts.push(`at most ${state.maxTstates} T-states`);

    return parts;
}

/**
 * The observed state, narrowed to what the case actually asserted. Showing all
 * seven registers when the case only cares about two buries the difference.
 */
function observedForExpect(expect, observed) {
    if (!expect || !observed) return null;
    const pick = (source, keys) =>
        Object.fromEntries(Object.keys(keys ?? {}).map((key) => [key, source?.[key]]));

    return {
        memory: observed.memory,
        io: observed.io,
        registers: pick(observed.registers, expect.registers),
        flags: pick(observed.flags, expect.flags),
        sp: expect.sp !== undefined ? observed.sp : undefined,
        pc: expect.pc !== undefined ? observed.pc : undefined,
    };
}

function Row(props) {
    return (
        <Show when={props.parts?.length}>
            <div class="flex gap-2 text-xs mt-0.5">
                <span class="text-inactive-foreground shrink-0 w-12">{props.label}</span>
                <span class={`font-mono ${props.tone ?? ""}`}>{props.parts.join(", ")}</span>
            </div>
        </Show>
    );
}

function CaseResult(props) {
    const observed = () => observedForExpect(props.result.expect, props.result.observed);

    return (
        <li class="py-2 border-b border-inactive-border last:border-b-0">
            <div class="flex gap-2 items-start">
                <span
                    class={`shrink-0 mt-0.5 ${props.result.pass ? "text-terminal" : "text-red-foreground"}`}
                    aria-hidden="true"
                >
                    {props.result.pass ? "✓" : "✗"}
                </span>
                <div class="min-w-0 grow">
                    <p class={props.result.pass ? "text-inactive-foreground" : ""}>{props.result.name}</p>

                    <Row label="Given" parts={describeState(props.result.setup)} />
                    <Row label="Expect" parts={describeState(props.result.expect)} />
                    <Show when={!props.result.pass}>
                        <Row label="Got" parts={describeState(observed())} tone="text-red-foreground" />
                    </Show>

                    <Show when={props.result.error}>
                        <p class="text-sm text-red-foreground mt-1">{props.result.error.message}</p>
                    </Show>

                    {/* Available whether the case passed or failed: seeing a
                        passing case run by hand is how the checks stop feeling
                        like a black box. */}
                    <button
                        type="button"
                        class="text-xs mt-2 px-2 py-1 rounded border border-active-border hover:bg-main-background cursor-pointer"
                        onClick={() => props.onDebug(props.result)}
                    >
                        Set up this case
                    </button>
                </div>
            </div>
        </li>
    );
}

/** Failures first: that is what the learner needs to act on. */
function orderedResults(results) {
    return [...results].sort((a, b) => Number(a.pass) - Number(b.pass));
}

export function CheckResults(props) {
    const [showPassing, setShowPassing] = createSignal(false);

    const verdict = () => props.verdict;
    const results = () => orderedResults(verdict()?.caseResults ?? []);
    const failing = () => results().filter((r) => !r.pass);
    const passing = () => results().filter((r) => r.pass);

    return (
        <Show when={verdict()}>
            {/* An assembly error has no per-case results: the program never ran. */}
            <Show when={verdict().reason === Reason.ASSEMBLY_ERROR}>
                <div class="border border-red-foreground rounded p-3">
                    <p class="font-semibold text-red-foreground">
                        {verdict().error.type || "The program did not assemble"}
                    </p>
                    <p class="text-sm mt-1">{verdict().error.message}</p>
                    <Show when={verdict().error.line}>
                        <p class="text-xs text-inactive-foreground mt-1 font-mono">
                            Line {verdict().error.line}, column {verdict().error.column}
                        </p>
                    </Show>
                    <For each={verdict().error.hint ?? []}>
                        {(hint) => <p class="text-xs text-inactive-foreground mt-1">{hint}</p>}
                    </For>
                </div>
            </Show>

            {/*
              Anything that failed before the cases could run (a timeout, a bad
              spec, a checker crash) still has to say something. Without this
              the panel would silently do nothing on failure.
            */}
            <Show when={verdict().reason !== Reason.ASSEMBLY_ERROR && !verdict().caseResults?.length}>
                <div class="border border-red-foreground rounded p-3">
                    <p class="font-semibold text-red-foreground">The check could not run</p>
                    <p class="text-sm mt-1">
                        {verdict().error?.message ?? `Unexpected result: ${verdict().reason}`}
                    </p>
                </div>
            </Show>

            {/*
              Rules about how the program is written. Shown above the cases:
              when both fail, the rule is usually why the approach is wrong,
              and fixing it changes the code the cases run against.
            */}
            <Show when={verdict().constraintDiffs?.length}>
                <div class="border border-yellow-foreground rounded p-3">
                    <p class="font-semibold text-yellow-foreground mb-1">
                        {verdict().constraintDiffs.length === 1
                            ? "Your program breaks one of this exercise's rules"
                            : `Your program breaks ${verdict().constraintDiffs.length} of this exercise's rules`}
                    </p>
                    <For each={verdict().constraintDiffs}>
                        {(diff) => <p class="text-sm mt-1">{diff.message}</p>}
                    </For>
                </div>
            </Show>

            <Show when={results().length}>
                <div>
                    <Show when={!failing().length}>
                        <p
                            class={`font-semibold mb-1 ${
                                verdict().pass ? "text-terminal" : "text-inactive-foreground"
                            }`}
                        >
                            All {results().length} checks passed.
                        </p>
                    </Show>
                    <Show when={failing().length}>
                        <p class="text-red-foreground font-semibold mb-1">
                            {failing().length} of {results().length} checks failed.
                        </p>
                    </Show>

                    <p class="text-xs text-inactive-foreground mb-2">
                        Each check loads the memory and registers under "Given", runs your program, and
                        compares the result with "Expect". Use "Set up this case" to load one into the
                        simulator and step through it yourself.
                    </p>

                    <ul>
                        <For each={failing()}>
                            {(result) => <CaseResult result={result} onDebug={props.onDebug} />}
                        </For>
                    </ul>

                    <Show when={failing().length && passing().length}>
                        <button
                            type="button"
                            class="text-xs text-inactive-foreground underline mt-2 cursor-pointer"
                            onClick={() => setShowPassing((v) => !v)}
                        >
                            {showPassing() ? "Hide" : "Show"} {passing().length} passing
                        </button>
                    </Show>

                    <Show when={!failing().length || showPassing()}>
                        <ul>
                            <For each={passing()}>
                                {(result) => <CaseResult result={result} onDebug={props.onDebug} />}
                            </For>
                        </ul>
                    </Show>
                </div>
            </Show>
        </Show>
    );
}
