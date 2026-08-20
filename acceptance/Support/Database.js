/**
 * Direct access to the acceptance database: creating the accounts tests sign in
 * as, and reading back what the application stored.
 *
 * Tests never touch this. The driver does, for the two things the application
 * genuinely cannot do for a test — create a confirmed account without an email
 * round trip, and let an assertion look at what was actually persisted rather
 * than at what a screen is showing.
 */

import { createClient } from "@supabase/supabase-js";

import { assertLocal, readStack } from "./Stack.js";

const stack = readStack();

export const SUPABASE_URL = stack.API_URL;
export const SUPABASE_ANON_KEY = stack.ANON_KEY;

assertLocal(SUPABASE_URL);

/** Service role: bypasses RLS, which is exactly why no test may reach it. */
const adminClient = createClient(SUPABASE_URL, stack.SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * A confirmed account.
 *
 * The one state a test cannot reach through the application in reasonable
 * time: signing up for real means receiving an email. Everything after this —
 * solving a step, saving it, coming back to it — a test does as a person would.
 */
export async function createAccount(email, password) {
    const { data, error } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
    });

    if (error) throw new Error(`Could not create ${email}: ${error.message}`);

    accounts.set(email, data.user.id);

    return data.user.id;
}

/** Accounts this process created, so an assertion can find one by email. */
const accounts = new Map();

export function accountId(email) {
    const id = accounts.get(email);
    if (!id) throw new Error(`No account was created for ${email} in this run.`);

    return id;
}

/**
 * A session for an existing account, as GoTrue issues it.
 *
 * The tokens are handed to the application through the same URL fragment
 * Google's redirect delivers them in, so the app's own sign-in handling runs.
 * See PlaywrightSystemDriver#signIn.
 */
export async function issueSession(email, password) {
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await anonClient.auth.signInWithPassword({ email, password });

    if (error) throw new Error(`Could not sign in as ${email}: ${error.message}`);

    return data.session;
}

/** Every step this account has completed, as the database holds it. */
export async function storedProgress(userId) {
    const { data, error } = await adminClient
        .from("practice_progress")
        .select("step_key, solution, completed_at")
        .eq("user_id", userId)
        .order("step_key");

    if (error) throw new Error(`Could not read stored progress: ${error.message}`);

    return data;
}
