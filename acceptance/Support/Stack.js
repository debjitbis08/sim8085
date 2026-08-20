/**
 * The local Supabase stack the acceptance suite runs against, and the commands
 * that bring it up and put it back to a known state.
 *
 * Deliberately not the production project. The suite resets the database it is
 * given before every run, so tests start from a known state and cannot be
 * flattered — or broken — by what a previous run left behind. Pointing that at
 * a database anyone cares about would destroy it, hence {@link assertLocal}.
 */

import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

/** Repo root: every Supabase command has to run where supabase/ lives. */
const ROOT = resolve(fileURLToPath(import.meta.url), "../../..");

/**
 * `supabase status -o env`, parsed.
 *
 * Read from the running stack rather than hardcoded: the local keys change
 * whenever the stack is recreated or the CLI is upgraded, and a stale copy
 * fails as a confusing 401 rather than as "your key is out of date".
 */
export function readStack() {
    return parseEnv(supabaseCli(["status", "-o", "env"], { quiet: true }));
}

/**
 * The stack, started first if it is not already up.
 *
 * Starting it here rather than telling someone to start it is the difference
 * between a suite that runs on a clean machine and one that runs on yours.
 * `supabase start` on an already-running stack is a no-op, so this is only
 * slow the first time.
 */
export function ensureStackRunning() {
    try {
        return readStack();
    } catch {
        console.log("Acceptance: starting the local Supabase stack...");
        supabaseCli(["start"]);
        return readStack();
    }
}

/**
 * Drops the local database and replays every migration in supabase/migrations
 * followed by supabase/seed.sql.
 *
 * This is the one piece of state a test cannot reach through the application:
 * the schema itself. It also means the suite proves the migrations apply
 * cleanly from nothing, which the deployed app never checks.
 */
export function resetDatabase() {
    supabaseCli(["db", "reset"]);
}

/**
 * Refuses to run against anything but a local stack.
 *
 * A mistyped environment variable should stop the run, not empty a database
 * somebody's users are keeping their progress in.
 */
export function assertLocal(url) {
    const { hostname } = new URL(url);

    if (hostname !== "127.0.0.1" && hostname !== "localhost" && hostname !== "::1") {
        throw new Error(
            `The acceptance suite resets the database it runs against, and ${url} is not a ` +
                `local one. Refusing to continue.`,
        );
    }
}

function supabaseCli(args, { quiet = false } = {}) {
    try {
        return execFileSync("supabase", args, {
            cwd: ROOT,
            encoding: "utf8",
            stdio: quiet ? ["ignore", "pipe", "ignore"] : ["ignore", "pipe", "inherit"],
            // Starting the stack pulls images the first time.
            timeout: 10 * 60 * 1000,
        });
    } catch (error) {
        if (error.code === "ENOENT") {
            throw new Error(
                "The Supabase CLI is not on PATH, so the acceptance suite cannot start its " +
                    "database.\n\n  https://supabase.com/docs/guides/local-development\n",
            );
        }
        throw error;
    }
}

function parseEnv(text) {
    const values = {};

    for (const line of text.split("\n")) {
        const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
        if (match) values[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
    }

    return values;
}
