/**
 * Named, optional test parameters — the mechanism that lets an acceptance test
 * state only what matters to it ("a learner on step 2") and leave everything
 * else to a sensible default.
 *
 * Arguments are written as `'name: value'` strings so a test reads as prose:
 *
 *   learner.opensStep('step: sum-an-array/step-1');
 */
export class Params {
    constructor(context, args) {
        this.context = context;
        this.args = args;
    }

    optional(name, defaultValue) {
        return this.value(name) ?? defaultValue;
    }

    /** A parameter that may be absent altogether, taken verbatim. */
    nullable(name) {
        return this.value(name) ?? undefined;
    }

    /**
     * An email address, aliased. Tests write the address a person would
     * actually be given ('asha@example.test'); the system sees a tagged variant
     * of it, unique to this test.
     */
    optionalEmail(name, defaultValue) {
        return this.context.aliasEmail(this.value(name) ?? defaultValue);
    }

    value(name) {
        const prefix = `${name}: `;

        for (const arg of this.args) {
            if (arg.startsWith(prefix)) return arg.slice(prefix.length).trim();
        }

        return null;
    }
}

/**
 * State shared by every actor in a single test: chiefly the alias table.
 *
 * An alias maps the value a test writes ('asha@example.test') to the value the
 * system is given ('asha+k4x9-1@example.test'), so tests can reuse readable,
 * realistic values without one test's Asha being another test's Asha.
 *
 * The mapping is remembered, so the same value written twice in one test
 * resolves to the same thing both times — which is how a learner signs back in
 * to the account the fixture created for them.
 */
export class DslContext {
    constructor(runToken = newRunToken()) {
        this.aliases = new Map();
        this.runToken = runToken;
    }

    aliasEmail(email) {
        const existing = this.aliases.get(email);
        if (existing !== undefined) return existing;

        const at = email.lastIndexOf("@");
        if (at === -1) throw new Error(`'${email}' is not an email address.`);

        // A plus-tag is the standard way to vary an address without changing
        // who it belongs to.
        const aliased = `${email.slice(0, at)}+${this.runToken}@${email.slice(at + 1)}`;
        this.aliases.set(email, aliased);

        return aliased;
    }
}

/** Tests handed out a token so far in this process. */
let issued = 0;

/**
 * A token no other test uses: the clock separates runs, the process id
 * separates workers, and the counter separates tests within one worker — that
 * last part by construction rather than by hoping two tests never begin in the
 * same millisecond.
 */
function newRunToken() {
    issued += 1;

    const clock = Date.now().toString(36).slice(-4);
    const worker = process.pid.toString(36);

    return `${clock}${worker}-${issued}`;
}
