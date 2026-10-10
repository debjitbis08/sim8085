import { getSession } from "../../lib/supabase.js";

// Who PostHog should treat this visitor as. Called on every page load.
//
// - Signed in: the account ID, with or without cookie consent. Their events
//   belong to their account either way.
// - Accepted cookies, not signed in: a stored random ID, kept for continuity.
//   Its events bill as identified rather than anonymous, a deliberate tradeoff.
// - Anyone else: nothing. PostHogInitialize.astro put them in cookieless mode,
//   where PostHog derives the ID on its servers and identifying them would undo
//   the privacy that mode exists for.
export async function identifyUser() {
    const cookieConsent = localStorage.getItem("cookie_consent");

    const { session, error } = await getSession();

    if (!error && session?.user) {
        // Init guessed "not signed in" from storage but there is a session:
        // leave cookieless mode alone rather than attach an identity to it.
        if (posthog.config?.cookieless_mode === "always") return;

        const name = session.user?.user_metadata?.name || "";

        posthog.identify(session.user.id, {
            email: session.user.email,
            name,
        });
    } else if (cookieConsent === "yes") {
        let id = localStorage.getItem("anon_id");

        if (!id) {
            const bytes = new Uint8Array(16);
            crypto.getRandomValues(bytes);
            id = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
            localStorage.setItem("anon_id", id);
        }

        posthog.identify(id, {
            anon: true,
        });
    }
}
