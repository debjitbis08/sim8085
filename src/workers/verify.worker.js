/**
 * Runs practice-step checks off the main thread.
 *
 * The worker owns its own simulator instance, so a check never disturbs the
 * state the learner is looking at in the app. The client is expected to impose
 * a wall-clock timeout and terminate the worker if it is breached — the
 * T-state budget bounds emulated time, not the time the host actually spends.
 */

import { verifySolution } from "../lib/practice/run-case.js";

self.onmessage = async (event) => {
    const { id, source, cases, constraints, budgetTstates } = event.data ?? {};

    try {
        const verdict = await verifySolution({ source, cases, constraints, budgetTstates });
        self.postMessage({ id, ok: true, verdict });
    } catch (error) {
        self.postMessage({
            id,
            ok: false,
            error: { message: error?.message ?? String(error), stack: error?.stack ?? null },
        });
    }
};
