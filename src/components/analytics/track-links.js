import { trackEvent } from "./tracker.js";

/**
 * Report clicks on links marked `data-track="<event name>"`, with any other
 * `data-track-*` attributes as properties (`data-track-to="editor"` becomes
 * `{ to: "editor" }`). The problem slug comes from the nearest `data-problem`.
 *
 * For the static practice pages, where the links that matter are plain HTML
 * rather than island components.
 */
export function trackLeaveLinks(root = document) {
    root.addEventListener("click", (event) => {
        const link = event.target.closest?.("[data-track]");
        if (!link) return;

        const props = {};
        for (const [key, value] of Object.entries(link.dataset)) {
            if (key.startsWith("track") && key !== "track") {
                props[key.slice(5).replace(/^./, (c) => c.toLowerCase())] = value;
            }
        }
        const problem = link.closest("[data-problem]")?.dataset.problem;
        if (problem) props.problem = problem;
        props.page = window.location.pathname;

        // The click navigates away, so send it with the page's last breath.
        trackEvent(link.dataset.track, props, { transport: "sendBeacon" });
    });
}
