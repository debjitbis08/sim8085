/**
 * The defaults every test falls back to, so a test states only what it is
 * about. The email is aliased per test (see DslContext), so two tests both
 * using "the learner" are still two different people.
 */

export const DEFAULT_LEARNER = {
    email: "asha@example.test",
    password: "AcceptanceTest123!",
};

/**
 * The step most tests use. The first step of a free problem: it needs no
 * entitlement, nothing unlocked before it, and its solution is four lines.
 */
export const DEFAULT_STEP = "add-two-8bit-numbers/step-1";
