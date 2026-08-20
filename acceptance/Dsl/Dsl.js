import { test as base } from "@playwright/test";

import { PlaywrightSystemDriver } from "../Drivers/PlaywrightSystemDriver.js";
import { createAccount } from "../Support/Database.js";
import { DEFAULT_LEARNER } from "../Support/TestPeople.js";
import { LearnerDsl } from "./LearnerDsl.js";
import { DslContext } from "./Utils/Params.js";

/**
 * The entry point for acceptance tests: each test is handed the actors it
 * needs, already wired to a protocol driver and to an account of its own.
 *
 * Which driver they share is decided here and nowhere else — this is the seam
 * that lets the same tests run against a different boundary.
 */
export const test = base.extend({
    world: async ({ page, browser }, use) => {
        await use({
            context: new DslContext(),
            driver: new PlaywrightSystemDriver(page, browser),
        });
    },

    learner: async ({ world }, use) => {
        // The account exists before the test starts, because signing up for
        // real means waiting on an email. Whether the learner signs in — and
        // when — is left to the test, because that is what these tests are
        // about.
        const credentials = {
            email: world.context.aliasEmail(DEFAULT_LEARNER.email),
            password: DEFAULT_LEARNER.password,
        };

        await createAccount(credentials.email, credentials.password);

        await use(new LearnerDsl(world.context, world.driver, credentials));
    },
});

export { expect } from "@playwright/test";
