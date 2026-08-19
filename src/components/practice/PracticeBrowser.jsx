import { For, Show, createMemo, createSignal, onMount } from "solid-js";
import { FaSolidCheck } from "solid-icons/fa";
import { initProgress, isStepComplete } from "../../lib/practice/progress.js";
import { nextIncompleteStep } from "../../lib/practice/gating.js";

/**
 * The problem catalogue in the left panel, the practice equivalent of the
 * files tree.
 *
 * Deliberately one line per problem. Steps are the working surface once you
 * are inside a problem, and listing them here would triple the length of a
 * list whose job is to let you pick something and get on with it. Clicking a
 * problem lands on the first step you have not finished, so the list doubles
 * as "where was I".
 */

const DIFFICULTIES = ["beginner", "intermediate", "advanced"];

const DIFFICULTY_CLASS = {
    beginner: "text-green-foreground border-green-foreground",
    intermediate: "text-yellow-foreground border-yellow-foreground",
    advanced: "text-red-foreground border-red-foreground",
};

const SELECT_CLASS =
    "w-full text-xs px-1 py-1 rounded border border-inactive-border bg-main-background text-foreground";

export function PracticeBrowser(props) {
    const [completed, setCompleted] = createSignal(new Set());
    const [query, setQuery] = createSignal("");
    const [difficulty, setDifficulty] = createSignal("all");
    const [tag, setTag] = createSignal("all");

    const catalogue = () => props.catalogue ?? [];

    const refresh = () =>
        setCompleted(
            new Set(
                catalogue()
                    .flatMap((p) => p.steps.map((s) => s.stepKey))
                    .filter((key) => isStepComplete(key)),
            ),
        );

    onMount(async () => {
        refresh();
        await initProgress();
        refresh();
    });

    const tags = createMemo(() => [...new Set(catalogue().flatMap((p) => p.tags ?? []))].sort());

    const visible = createMemo(() => {
        const text = query().trim().toLowerCase();
        return catalogue().filter((problem) => {
            if (difficulty() !== "all" && problem.difficulty !== difficulty()) return false;
            if (tag() !== "all" && !(problem.tags ?? []).includes(tag())) return false;
            if (!text) return true;
            // Search the tags too: "loops" should find a problem whose title
            // never says the word.
            const haystack = [problem.title, problem.description, ...(problem.tags ?? [])]
                .join(" ")
                .toLowerCase();
            return haystack.includes(text);
        });
    });

    const doneCount = (problem) => problem.steps.filter((s) => completed().has(s.stepKey)).length;

    /** Land on the first unfinished step, or the last one if it is all done. */
    const resumeHref = (problem) => {
        const keys = problem.steps.map((s) => s.stepKey);
        const next = nextIncompleteStep(keys, (key) => completed().has(key));
        const target = next ? problem.steps.find((s) => s.stepKey === next) : problem.steps[0];
        return target?.href ?? "/practice/";
    };

    const clearFilters = () => {
        setQuery("");
        setDifficulty("all");
        setTag("all");
    };

    const isFiltered = () => query().trim() !== "" || difficulty() !== "all" || tag() !== "all";

    return (
        <div class="h-full flex flex-col gap-3">
            {/* Only present when the list was opened from inside a step, so
                the learner can get back without losing their place. */}
            <Show when={props.onBackToStep}>
                <button
                    type="button"
                    class="inline-flex items-center gap-1.5 text-xs text-inactive-foreground hover:text-terminal cursor-pointer self-start"
                    onClick={() => props.onBackToStep()}
                >
                    <span aria-hidden="true">←</span>
                    <span>Back to {props.backToStepTitle ?? "the exercise"}</span>
                </button>
            </Show>

            <h2 class="text-xl pb-1 border-b border-b-inactive-border">Practice</h2>

            <Show
                when={catalogue().length}
                fallback={<p class="text-sm text-inactive-foreground">No problems published yet.</p>}
            >
                <input
                    type="search"
                    placeholder="Search problems"
                    class="w-full text-sm px-2 py-1 rounded border border-inactive-border bg-main-background focus:border-terminal outline-none"
                    value={query()}
                    onInput={(e) => setQuery(e.currentTarget.value)}
                />

                <div class="flex gap-2">
                    <select
                        class={SELECT_CLASS}
                        value={difficulty()}
                        onChange={(e) => setDifficulty(e.currentTarget.value)}
                        aria-label="Filter by difficulty"
                    >
                        <option value="all">All levels</option>
                        <For each={DIFFICULTIES}>{(level) => <option value={level}>{level}</option>}</For>
                    </select>

                    <select
                        class={SELECT_CLASS}
                        value={tag()}
                        onChange={(e) => setTag(e.currentTarget.value)}
                        aria-label="Filter by topic"
                    >
                        <option value="all">All topics</option>
                        <For each={tags()}>{(name) => <option value={name}>{name}</option>}</For>
                    </select>
                </div>

                <Show when={isFiltered()}>
                    <div class="flex items-center justify-between text-xs text-inactive-foreground">
                        <span>
                            {visible().length} of {catalogue().length}
                        </span>
                        <button type="button" class="underline hover:text-terminal cursor-pointer" onClick={clearFilters}>
                            Clear
                        </button>
                    </div>
                </Show>

                <ul class="flex flex-col">
                    <For
                        each={visible()}
                        fallback={<p class="text-sm text-inactive-foreground py-2">Nothing matches that.</p>}
                    >
                        {(problem) => {
                            const done = () => doneCount(problem);
                            const finished = () => done() === problem.steps.length && problem.steps.length > 0;
                            const current = () => problem.slug === props.currentProblemSlug;

                            return (
                                <li class="border-b border-inactive-border last:border-b-0">
                                    <a
                                        href={resumeHref(problem)}
                                        class={`block py-2 hover:text-terminal ${current() ? "text-terminal" : ""}`}
                                    >
                                        <div class="flex items-start gap-2">
                                            <span class="grow leading-snug">{problem.title}</span>
                                            <Show when={finished()}>
                                                <FaSolidCheck class="text-terminal shrink-0 mt-1" />
                                            </Show>
                                        </div>
                                        <div class="flex items-center gap-2 mt-1">
                                            <span
                                                class={`text-[10px] uppercase tracking-wide px-1 rounded border ${
                                                    DIFFICULTY_CLASS[problem.difficulty]
                                                }`}
                                            >
                                                {problem.difficulty}
                                            </span>
                                            <Show when={problem.access === "plus"}>
                                                <span class="text-[10px] uppercase tracking-wide px-1 rounded border border-yellow-foreground text-yellow-foreground">
                                                    Plus
                                                </span>
                                            </Show>
                                            <span class="text-xs text-inactive-foreground font-mono ml-auto">
                                                {done()}/{problem.steps.length}
                                            </span>
                                        </div>
                                    </a>
                                </li>
                            );
                        }}
                    </For>
                </ul>
            </Show>
        </div>
    );
}
