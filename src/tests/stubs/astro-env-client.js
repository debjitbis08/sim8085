/**
 * Stand-in for Astro's `astro:env/client` virtual module, which only exists
 * during an Astro build. Aliased in vitest.config.mjs so modules that reach
 * supabase.js transitively stay testable.
 *
 * Every value is empty, which puts the app on its unconfigured path: supabase
 * stays null, tracking stays off. That is the right default for tests — no
 * accidental network calls.
 */
export const SUPABASE_URL = "";
export const SUPABASE_ANON_KEY = "";
export const USE_TRACKING = false;
export const POSTHOG_API_KEY = "";
export const MAX_AD_ROTATIONS = 0;
export const DODO_PLUS_PRODUCT_ID = "";
export const DODO_PLUS_PAYMENT_LINK = "";
export const DODO_DONATION_PAYMENT_LINK = "";
