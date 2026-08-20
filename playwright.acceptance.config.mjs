import { defineConfig, devices } from "@playwright/test";

import { ensureStackRunning } from "./acceptance/Support/Stack.js";
import { BASE_URL, PORT } from "./acceptance/Support/Server.js";

/**
 * The acceptance suite. Runs against a real server, a real browser, the real
 * 8085 simulator and a database of its own — rebuilt from migrations before the
 * run.
 *
 *     pnpm test:acceptance                 # whole suite
 *     pnpm test:acceptance --ui            # pick and watch individual cases
 *     pnpm test:acceptance --headed        # watch it drive the browser
 *
 * Nothing has to be running first: the local Supabase stack is started here if
 * it is not already up, and reset in global setup.
 */
const stack = ensureStackRunning();

export default defineConfig({
    testDir: "./acceptance/Tests",
    testMatch: "**/*.acceptance.js",
    globalSetup: "./acceptance/Support/GlobalSetup.js",

    // One worker: the suite shares one server process and one database, and the
    // reset in global setup would pull the ground out from under a parallel run.
    fullyParallel: false,
    workers: 1,
    timeout: 120_000,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? "list" : [["list"], ["html", { open: "never" }]],

    use: {
        baseURL: BASE_URL,
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
    },

    projects: [{ name: "chromium", use: devices["Desktop Chrome"] }],

    webServer: {
        command: `pnpm astro dev --port ${PORT}`,
        url: BASE_URL,
        reuseExistingServer: false,
        timeout: 120_000,
        stdout: "pipe",
        stderr: "pipe",
        env: {
            ...process.env,

            // The local stack, not whatever .env points at. Vite gives
            // process.env precedence over every .env file, so this is what the
            // browser bundle is built with — and a run can never reach
            // production by having picked up someone's .env.
            SUPABASE_URL: stack.API_URL,
            SUPABASE_ANON_KEY: stack.ANON_KEY,
            SUPABASE_JWT_SECRET: stack.JWT_SECRET,

            // Required by the env schema, and irrelevant here: no test buys
            // anything. Named so a checkout opened by accident is obvious.
            DODO_PLUS_PAYMENT_LINK: "https://example.test/acceptance/plus",
            DODO_DONATION_PAYMENT_LINK: "https://example.test/acceptance/donate",

            USE_TRACKING: "false",
            OPENAI_ENABLED: "false",
        },
    },
});
