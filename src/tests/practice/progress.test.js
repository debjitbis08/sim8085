/**
 * Covers the anonymous path, which is what runs when Supabase is not
 * configured — as in this test environment. The signed-in path is exercised
 * in the browser.
 */

import { describe, test, expect, beforeEach, vi } from "vitest";

function installStorage() {
    const data = new Map();
    globalThis.sessionStorage = {
        getItem: (key) => (data.has(key) ? data.get(key) : null),
        setItem: (key, value) => data.set(key, String(value)),
        removeItem: (key) => data.delete(key),
        clear: () => data.clear(),
    };
    globalThis.window = {
        dispatchEvent: () => true,
        addEventListener: () => {},
        removeEventListener: () => {},
    };
    globalThis.CustomEvent = class CustomEvent {
        constructor(type, init) {
            this.type = type;
            this.detail = init?.detail;
        }
    };
    return data;
}

async function freshModule() {
    vi.resetModules();
    return import("../../lib/practice/progress.js");
}

describe("progress (anonymous)", () => {
    let data;

    beforeEach(() => {
        data = installStorage();
    });

    test("reports nothing complete for a new learner", async () => {
        const progress = await freshModule();
        await progress.initProgress();
        expect(progress.isStepComplete("p/step-1")).toBe(false);
        expect(progress.isSignedIn()).toBe(false);
    });

    test("marking a step complete is visible immediately and persisted", async () => {
        const progress = await freshModule();
        await progress.initProgress();
        await progress.markStepComplete("p/step-1", "HLT");

        expect(progress.isStepComplete("p/step-1")).toBe(true);
        expect(JSON.parse(data.get("practice:progress"))).toEqual({ "p/step-1": true });
        expect(data.get("practice:solution:p/step-1")).toBe("HLT");
    });

    test("progress survives a reload", async () => {
        const first = await freshModule();
        await first.initProgress();
        await first.markStepComplete("p/step-1", "HLT");

        // Same storage, fresh module: what a page reload looks like.
        const second = await freshModule();
        await second.initProgress();
        expect(second.isStepComplete("p/step-1")).toBe(true);
    });

    test("drafts are kept separately from passing solutions", async () => {
        const progress = await freshModule();
        await progress.initProgress();

        progress.saveDraft("p/step-1", "work in progress");
        progress.saveSolution("p/step-1", "the answer");

        expect(progress.getDraft("p/step-1")).toBe("work in progress");
        expect(progress.getSolution("p/step-1")).toBe("the answer");
    });

    test("completion is monotonic", async () => {
        const progress = await freshModule();
        await progress.initProgress();
        await progress.markStepComplete("p/step-1", "first");
        await progress.markStepComplete("p/step-1", "second");

        expect(progress.completedStepKeys()).toEqual(["p/step-1"]);
        expect(progress.getSolution("p/step-1")).toBe("second");
    });

    test("corrupt stored progress is ignored rather than thrown on", async () => {
        data.set("practice:progress", "{not json");
        const progress = await freshModule();
        await progress.initProgress();
        expect(progress.isStepComplete("p/step-1")).toBe(false);
    });

    test("survives storage being unavailable", async () => {
        // Private browsing: every storage call throws.
        globalThis.sessionStorage = {
            getItem: () => {
                throw new Error("denied");
            },
            setItem: () => {
                throw new Error("denied");
            },
        };
        const progress = await freshModule();
        await progress.initProgress();
        await progress.markStepComplete("p/step-1", "HLT");

        // The in-memory mirror still works for this page view.
        expect(progress.isStepComplete("p/step-1")).toBe(true);
    });

    test("initProgress does the work once even if called concurrently", async () => {
        const progress = await freshModule();
        const [a, b] = await Promise.all([progress.initProgress(), progress.initProgress()]);
        expect(a).toBe(b);
    });
});
