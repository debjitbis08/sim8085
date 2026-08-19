/**
 * Main-thread bridge to the verification worker.
 *
 * Owns the wall-clock timeout the worker cannot enforce on itself: the
 * T-state budget bounds emulated time, but building the simulator or an
 * unforeseen pathological program could still stall the worker. On a breach
 * the worker is terminated and the next check starts a fresh one, so a bad
 * program can never wedge the session.
 */

import { unwrap } from "solid-js/store";
import { Reason } from "./run-case.js";

export const DEFAULT_TIMEOUT_MS = 10_000;

let worker = null;
let nextRequestId = 1;
const pending = new Map();

function spawnWorker() {
    const created = new Worker(new URL("../../workers/verify.worker.js", import.meta.url), {
        type: "module",
    });

    created.onmessage = (event) => {
        const { id, ok, verdict, error } = event.data ?? {};
        const request = pending.get(id);
        if (!request) return;
        pending.delete(id);
        clearTimeout(request.timer);
        if (ok) {
            request.resolve(verdict);
        } else {
            request.resolve({
                pass: false,
                reason: Reason.RUNTIME_ERROR,
                error: error ?? { message: "The checker failed unexpectedly." },
                caseResults: [],
            });
        }
    };

    created.onerror = (event) => {
        failAllPending({
            pass: false,
            reason: Reason.RUNTIME_ERROR,
            error: { message: event?.message ?? "The checker crashed." },
            caseResults: [],
        });
        disposeWorker();
    };

    return created;
}

function ensureWorker() {
    if (!worker) worker = spawnWorker();
    return worker;
}

function failAllPending(verdict) {
    for (const [, request] of pending) {
        clearTimeout(request.timer);
        request.resolve(verdict);
    }
    pending.clear();
}

/** Terminate the worker; the next check spawns a clean one. */
export function disposeWorker() {
    if (worker) {
        worker.terminate();
        worker = null;
    }
}

/**
 * @param {object} input
 * @param {string} input.source
 * @param {Array} input.cases
 * @param {number} [input.budgetTstates]
 * @param {number} [input.timeoutMs]
 * @returns {Promise<object>} always resolves with a verdict; never rejects
 */
export function check({ source, cases, constraints, budgetTstates, timeoutMs = DEFAULT_TIMEOUT_MS }) {
    const id = nextRequestId++;

    return new Promise((resolve) => {
        const timer = setTimeout(() => {
            pending.delete(id);
            // The worker is stuck mid-run and cannot be asked to stop, so drop
            // it entirely rather than leaving it burning a core.
            disposeWorker();
            resolve({
                pass: false,
                reason: Reason.TIMEOUT,
                error: { message: "The check took too long and was stopped. Look for a loop that never ends." },
                caseResults: [],
            });
        }, timeoutMs);

        pending.set(id, { resolve, timer });

        try {
            // Astro hands island props to Solid through createStore, so `cases`
            // arrives as a deep proxy. structuredClone — and therefore
            // postMessage — refuses proxies, so unwrap to the plain underlying
            // data first. unwrap leaves a non-store value untouched.
            ensureWorker().postMessage({
                id,
                source,
                cases: unwrap(cases),
                constraints: unwrap(constraints),
                budgetTstates,
            });
        } catch (error) {
            pending.delete(id);
            clearTimeout(timer);
            disposeWorker();
            resolve({
                pass: false,
                reason: Reason.RUNTIME_ERROR,
                error: { message: error?.message ?? String(error) },
                caseResults: [],
            });
        }
    });
}
