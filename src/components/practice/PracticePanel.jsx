import { For, Show, createSignal, onMount } from "solid-js";
import { store } from "../../store/store.js";
import { check } from "../../lib/practice/verify-client.js";
import {
    initProgress,
    isSignedIn,
    isStepComplete,
    markStepComplete,
    saveSolution,
} from "../../lib/practice/progress.js";
import { isStepUnlocked } from "../../lib/practice/gating.js";
import { canAccess, unseal } from "../../lib/practice/access.js";
import { getUserTier } from "../../lib/subscription.js";
import { CheckResults } from "./CheckResults.jsx";
import { StarterCode } from "./StarterCode.jsx";

/**
 * The practice tab: the step brief, the Check button, and what the check said.
 *
 * The rest of the app stays exactly as it is, so a learner who cannot see why
 * a case fails has the memory view, the register view and the debugger right
 * there. That is the whole reason this lives inside the simulator instead of
 * on a page of its own.
 */
export function PracticePanel(props) {
    const [verdict, setVerdict] = createSignal(null);
    const [running, setRunning] = createSignal(false);
    const [complete, setComplete] = createSignal(false);
    const [unlocked, setUnlocked] = createSignal(true);
    const [signedIn, setSignedIn] = createSignal(false);
    const [hintsShown, setHintsShown] = createSignal(0);
    // null while the tier is still being determined, so a paid step shows
    // "checking" rather than flashing a paywall at someone who has paid.
    const [entitled, setEntitled] = createSignal(props.access === "plus" ? null : true);
    const [content, setContent] = createSignal(props.content ?? null);

    const refreshGate = () => {
        setComplete(isStepComplete(props.stepKey));
        setUnlocked(isStepUnlocked(props.stepKey, props.orderedStepKeys, isStepComplete));
    };

    onMount(async () => {
        // Render from the local cache immediately, then correct once the
        // server has been consulted. Waiting on the network to decide whether
        // to show the exercise would make every page load feel broken.
        refreshGate();

        if (props.access === "plus") {
            let tier = "FREE";
            try {
                ({ tier } = await getUserTier());
            } catch {
                // Offline or the tier lookup failed. Fail closed: a paid step
                // stays shut rather than opening because a request errored.
                tier = "FREE";
            }
            const allowed = canAccess(props.access, tier);
            setEntitled(allowed);
            if (allowed && props.sealed) setContent(unseal(props.sealed));
        }

        await initProgress();
        setSignedIn(isSignedIn());
        refreshGate();
    });

    async function runCheck() {
        if (running()) return;
        setRunning(true);
        setVerdict(null);

        try {
            const result = await check({
                source: store.activeFile.content,
                cases: content()?.cases,
                constraints: content()?.constraints,
                budgetTstates: props.budgetTstates,
            });
            setVerdict(result);

            if (result.pass) {
                saveSolution(props.stepKey, store.activeFile.content);
                setComplete(true);
                await markStepComplete(props.stepKey, store.activeFile.content);
            }
        } catch (error) {
            // The checker is meant to resolve with a verdict rather than throw.
            // If it ever does throw, say so instead of leaving a button that
            // looks like it did nothing.
            setVerdict({
                pass: false,
                reason: "runtime-error",
                error: { message: error?.message ?? String(error) },
                caseResults: [],
            });
        } finally {
            setRunning(false);
        }
    }

    // Hand a failing case to the live simulator so it can be stepped through.
    function debugCase(result) {
        window.dispatchEvent(
            new CustomEvent("practice:debug-case", { detail: { setup: result.setup, name: result.name } }),
        );
    }

    return (
        <div class="flex flex-col gap-4 pb-8">
            <header>
                {/* A back control rather than a bare link: from inside a step
                    the useful action is leaving it, and the problem title on
                    its own read as something to click for more detail. */}
                <button
                    type="button"
                    class="inline-flex items-center gap-1.5 text-xs text-inactive-foreground hover:text-terminal cursor-pointer"
                    onClick={() => props.onBack?.()}
                >
                    <span aria-hidden="true">←</span>
                    <span>All problems</span>
                </button>
                <p class="text-xs uppercase tracking-wide text-inactive-foreground font-mono mt-3">
                    Step {props.step.stepNumber} of {props.totalSteps}
                    <Show when={complete()}>
                        <span class="text-terminal ml-2">✓ complete</span>
                    </Show>
                </p>
                <h2 class="text-xl mt-1">{props.step.title}</h2>
            </header>

            {/* Entitlement is checked before the step gate: being told to
                finish step 2 first is noise when you cannot open the problem
                at all. */}
            <Show
                when={entitled() !== false}
                fallback={
                    <div class="border border-yellow-foreground rounded p-4 text-center">
                        <p class="font-semibold mb-1">This problem is part of Sim8085 Plus</p>
                        <p class="text-sm text-inactive-foreground mb-3">
                            {props.problem.title} and its step-by-step checks are available to Plus members.
                        </p>
                        <a
                            href="/upgrade/"
                            class="inline-block px-3 py-1.5 rounded border border-yellow-foreground text-yellow-foreground hover:bg-yellow-foreground hover:text-page-background"
                        >
                            See Plus
                        </a>
                        <p class="text-xs text-inactive-foreground mt-3">
                            Already a member?{" "}
                            <a href="/login/" class="underline hover:text-terminal">
                                Sign in
                            </a>
                            .
                        </p>
                    </div>
                }
            >
                <Show
                    when={entitled() !== null}
                    fallback={<p class="text-sm text-inactive-foreground">Checking your access…</p>}
                >
                    <Show
                        when={unlocked()}
                        fallback={
                            <div class="border border-inactive-border rounded p-4 text-center">
                                <p class="font-semibold mb-1">Finish the previous step first</p>
                                <p class="text-sm text-inactive-foreground mb-3">
                                    This exercise builds directly on the one before it.
                                </p>
                                <Show when={props.prevHref}>
                                    <a
                                        href={props.prevHref}
                                        class="inline-block px-3 py-1.5 rounded border border-terminal text-terminal hover:bg-terminal hover:text-page-background"
                                    >
                                        Go to the previous step
                                    </a>
                                </Show>
                            </div>
                        }
                    >
                        {/* Trusted first-party markdown, rendered at build time. */}
                        <div class="practice-brief text-sm leading-relaxed" innerHTML={content()?.briefHtml} />

                        <div class="flex items-center gap-2 sticky bottom-0 bg-secondary-background py-2">
                            <button
                                type="button"
                                class="px-3 py-1.5 rounded border border-terminal text-terminal hover:bg-terminal hover:text-page-background disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                onClick={runCheck}
                                disabled={running()}
                            >
                                {running() ? "Checking…" : "Check"}
                            </button>
                            <Show when={complete() && props.nextHref}>
                                <a
                                    href={props.nextHref}
                                    class="px-3 py-1.5 rounded border border-active-border hover:border-terminal"
                                >
                                    Next step →
                                </a>
                            </Show>
                        </div>

                        <CheckResults verdict={verdict()} onDebug={debugCase} />

                        <StarterCode starterCode={content()?.starterCode} />

                <Show when={content()?.hints?.length}>
                            <div class="border-t border-inactive-border pt-3">
                                <For each={content().hints.slice(0, hintsShown())}>
                                    {(hint) => <p class="text-sm text-inactive-foreground mb-2">{hint}</p>}
                                </For>
                                <Show when={hintsShown() < content().hints.length}>
                                    <button
                                        type="button"
                                        class="text-sm underline text-inactive-foreground hover:text-foreground cursor-pointer"
                                        onClick={() => setHintsShown((n) => n + 1)}
                                    >
                                        {hintsShown() === 0 ? "Show a hint" : "Show another hint"}
                                    </button>
                                </Show>
                            </div>
                        </Show>
                    </Show>
                </Show>
            </Show>

            {/* Say plainly what anonymous progress is worth, rather than
                letting someone lose an afternoon's work to a closed tab. */}
            <Show when={!signedIn()}>
                <p class="text-xs text-inactive-foreground border-t border-inactive-border pt-3">
                    Progress is kept for this tab only.{" "}
                    <a href="/login/" class="underline hover:text-terminal">
                        Sign in
                    </a>{" "}
                    to save it across devices.
                </p>
            </Show>

            <nav class="flex justify-between text-sm border-t border-inactive-border pt-3">
                <Show when={props.prevHref} fallback={<span />}>
                    <a href={props.prevHref} class="text-inactive-foreground hover:text-terminal">
                        ← Previous
                    </a>
                </Show>
                <Show when={props.nextHref}>
                    <a href={props.nextHref} class="text-inactive-foreground hover:text-terminal">
                        Next →
                    </a>
                </Show>
            </nav>
        </div>
    );
}
