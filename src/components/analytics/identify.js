import { getSession } from "../../lib/supabase.js";

// Anonymous visitors are identified on purpose: a fingerprint (consent declined) or a
// stored random id (consent given) is how we keep continuity for people without a
// PostHog cookie. This means their events bill as identified rather than anonymous,
// which is a deliberate tradeoff for that continuity.
export async function identifyUser() {
    const cookieConsent = localStorage.getItem("cookie_consent");

    const { session, error } = await getSession();

    if (!error && session?.user) {
        const name = session.user?.user_metadata?.name || "";

        posthog.identify(session.user.id, {
            email: session.user.email,
            name,
        });
    } else if (cookieConsent === "no") {
        const { getFingerprint } = await import("@thumbmarkjs/thumbmarkjs");
        const fingerprint = await getFingerprint();

        posthog.identify(fingerprint, {
            anon: true,
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
