import { getSession } from "../../lib/supabase.js";

export async function identifyUser() {
    const cookieConsent = localStorage.getItem("cookie_consent");

    console.log("cookieConsent", cookieConsent);

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
