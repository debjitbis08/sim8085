/**
 * Practice progress, with two backends behind one interface.
 *
 * Anonymous learners get sessionStorage: progress survives a reload but not a
 * new tab. That is deliberate — durable, cross-device progress is the reason
 * to sign in, and promising more than sessionStorage can deliver would be a
 * lie.
 *
 * Signed-in learners get a `practice_progress` row per step in Supabase, with
 * sessionStorage kept in front of it as a cache so reads stay synchronous and
 * the UI never waits on the network to decide what is unlocked.
 *
 * Drafts (work in progress) are always local. They change on every keystroke
 * and are not worth a round trip; only a passing solution is worth keeping.
 */

import { supabase, getUser } from "../supabase.js";

const PROGRESS_KEY = "practice:progress";
const DRAFT_PREFIX = "practice:draft:";
const SOLUTION_PREFIX = "practice:solution:";

/** In-memory mirror so reads are synchronous even before storage is touched. */
let completed = new Map();
/**
 * The steps the server has confirmed it holds — read back from it, or written
 * to it without complaint. Not merely "was signed in when it happened": a
 * write that failed leaves the step local, and the UI says so.
 */
let savedToAccount = new Set();
let userId = null;
let initialized = false;
let initPromise = null;

// ---------------------------------------------------------------------------
// Local storage helpers. Every one of these swallows failures: private
// browsing and full quotas must never break the check flow.
// ---------------------------------------------------------------------------

function readLocal(key, fallback = null) {
    if (typeof sessionStorage === "undefined") return fallback;
    try {
        return sessionStorage.getItem(key) ?? fallback;
    } catch {
        return fallback;
    }
}

function writeLocal(key, value) {
    if (typeof sessionStorage === "undefined") return;
    try {
        sessionStorage.setItem(key, value);
    } catch {
        /* see above */
    }
}

function readLocalProgress() {
    try {
        const parsed = JSON.parse(readLocal(PROGRESS_KEY, "{}"));
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
}

function persistProgress() {
    writeLocal(PROGRESS_KEY, JSON.stringify(Object.fromEntries(completed)));
}

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

/**
 * Hydrate the cache and, when signed in, reconcile it with the server.
 *
 * Safe to call from several components: the work happens once.
 */
export function initProgress() {
    if (initPromise) return initPromise;

    initPromise = (async () => {
        // Local first, so the UI has something correct to render immediately
        // whether or not the network answers.
        completed = new Map(Object.entries(readLocalProgress()).filter(([, done]) => done === true));

        try {
            const { user } = await getUser();
            userId = user?.id ?? null;
        } catch {
            userId = null;
        }

        if (userId && supabase) {
            await syncWithServer();
        }

        initialized = true;
        // Solutions may have arrived from the server; let the editor re-seed
        // if the learner has not started typing yet.
        dispatch("practice:progress-loaded");
        return { signedIn: !!userId };
    })();

    return initPromise;
}

function dispatch(name, detail = {}) {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent(name, { detail }));
}

/**
 * Merge server and local state.
 *
 * Completion is monotonic — a step never becomes un-done — so a union is the
 * correct merge and needs no timestamps or conflict resolution. Anything
 * completed locally before signing in is pushed up rather than dropped.
 */
async function syncWithServer() {
    const localOnly = [...completed.keys()];

    try {
        const { data, error } = await supabase
            .from("practice_progress")
            .select("step_key, solution")
            .eq("user_id", userId);

        if (error) throw error;

        const remoteKeys = new Set();
        for (const row of data ?? []) {
            remoteKeys.add(row.step_key);
            savedToAccount.add(row.step_key);
            completed.set(row.step_key, true);
            if (row.solution) writeLocal(SOLUTION_PREFIX + row.step_key, row.solution);
        }
        persistProgress();

        const toPush = localOnly.filter((stepKey) => !remoteKeys.has(stepKey));
        if (toPush.length) {
            const { error: pushError } = await supabase.from("practice_progress").upsert(
                toPush.map((stepKey) => ({
                    user_id: userId,
                    step_key: stepKey,
                    solution: readLocal(SOLUTION_PREFIX + stepKey),
                })),
                { onConflict: "user_id,step_key" },
            );

            if (pushError) throw pushError;
            for (const stepKey of toPush) savedToAccount.add(stepKey);
        }
    } catch (error) {
        // Offline, or the table is not provisioned yet. The local cache is
        // still valid, so carry on rather than blocking the learner.
        console.warn("Practice progress sync failed; continuing with local progress.", error);
    }
}

export function isSignedIn() {
    return !!userId;
}

export function isProgressLoaded() {
    return initialized;
}

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

export function isStepComplete(stepKey) {
    return completed.get(stepKey) === true;
}

export function completedStepKeys() {
    return [...completed.keys()];
}

/**
 * Where a completed step is being kept.
 *
 * "account" only once the server has actually accepted the write, so a step
 * that failed to upload reads as local — which is what the learner needs to
 * know. Everything else, including an anonymous learner, is "local".
 */
export function whereStepIsSaved(stepKey) {
    return savedToAccount.has(stepKey) ? "account" : "local";
}

/**
 * Record a passing step. The local write happens first so the UI updates
 * immediately; the server write is best effort.
 */
export async function markStepComplete(stepKey, solutionCode) {
    const alreadyDone = isStepComplete(stepKey);

    completed.set(stepKey, true);
    persistProgress();
    if (solutionCode != null) writeLocal(SOLUTION_PREFIX + stepKey, solutionCode);

    if (alreadyDone && solutionCode == null) return;
    if (!userId || !supabase) return;

    try {
        const { error } = await supabase.from("practice_progress").upsert(
            {
                user_id: userId,
                step_key: stepKey,
                solution: solutionCode ?? readLocal(SOLUTION_PREFIX + stepKey),
                completed_at: new Date().toISOString(),
            },
            { onConflict: "user_id,step_key" },
        );

        // A rejected write is reported in the result rather than thrown, so it
        // has to be read: the step would otherwise be shown as kept in the
        // account when nothing of it left the browser.
        if (error) throw error;

        savedToAccount.add(stepKey);
    } catch (error) {
        savedToAccount.delete(stepKey);
        console.warn("Could not save practice progress to the server.", error);
    }
}

// ---------------------------------------------------------------------------
// Drafts and solutions
// ---------------------------------------------------------------------------

export function saveDraft(stepKey, code) {
    writeLocal(DRAFT_PREFIX + stepKey, code);
}

export function getDraft(stepKey) {
    return readLocal(DRAFT_PREFIX + stepKey);
}

export function saveSolution(stepKey, code) {
    writeLocal(SOLUTION_PREFIX + stepKey, code);
}

export function getSolution(stepKey) {
    return readLocal(SOLUTION_PREFIX + stepKey);
}
