# Acceptance tests

Executable specifications of what Sim8085 does for the people who use it,
written in their language and run against the real thing: a real server, a real
browser, the real 8085 simulator, a real database.

    pnpm test:acceptance                 # whole suite
    pnpm test:acceptance --ui            # pick and watch individual cases
    pnpm test:acceptance --headed        # watch it drive the browser

Nothing has to be running first. The local Supabase stack is started if it is
not already up, and rebuilt from `supabase/migrations` plus `supabase/seed.sql`
before the run. Docker and the Supabase CLI are the only things expected to be
on the machine.

    ACCEPTANCE_SKIP_RESET=1 pnpm test:acceptance    # skip the ~60s reset while writing tests

## The four layers

A test never touches a page, a button or a request. Four layers keep it that
way, each one allowed to know only about the one below it:

| Layer                 | Knows about                  | Lives in   |
| --------------------- | ---------------------------- | ---------- |
| **Test case**         | What a learner wants         | `Tests/`   |
| **DSL (per actor)**   | The business language        | `Dsl/`     |
| **Protocol driver**   | How to make the system do it | `Drivers/` |
| **System under test** | —                            | the app    |

Each layer changes for one reason. A relabelled button changes the driver. A new
rule about what counts as progress changes the DSL. A new scenario changes only
a test.

```js
test("work done before signing in is kept, not lost, when they sign in", async ({ learner }) => {
    await learner.solves(`step: ${STEP_1}`);
    await learner.confirmsNothingWasSaved();

    await learner.signsIn();
    await learner.opensStep(`step: ${STEP_1}`);

    await learner.confirmsTheirWorkWasSaved(`step: ${STEP_1}`);
});
```

## What is real, and what is not

Everything is real except the identity provider.

Sim8085 signs people in with Google, and no test can drive that: the credential
screen belongs to Google. What the application itself does is take an access and
a refresh token out of the URL fragment Google redirects back with — so the
driver gets a genuine session from the local auth server and delivers it in
exactly that fragment. Establishing the session, persisting it, hydrating
progress and reconciling it with the server are all the production path.

The simulator is deliberately not faked. Whether a program passes its checks is
the thing under test; substituting it would be the one swap that costs real
coverage. Each of these tests assembles and runs 8085 programs for real, in the
worker the application uses.

## Writing a test

- **Say what, never how.** No URLs, labels or selectors above the driver.
- **Supply what the person supplies.** Parameters are the things a learner
  states — which step they are on — and nothing the UI never asked for.
- **State only what the case depends on.** Everything unmentioned takes a
  default, so the one thing a test varies is the one thing it is about.
- **Emails are aliased.** Write the address a real person would have
  ('asha@example.test'); the system is handed a variant unique to this test
  ('asha+k4x9-1@example.test'), so tests never collide.
- **Assert an outcome, not a screen.** Saved progress is asserted against what
  the database holds, because the tick appears before the write and would go on
  appearing if the write never happened.

## Finding things on the page

Only the driver does this, and it does it the way a user does, following
Playwright's documented locator priority: `getByRole` first, then `getByLabel`,
then `getByText`. CodeMirror's editing surface is the one exception — it carries
no accessible name at all, so it is reached by class.

## Test data

Two things a test cannot do for itself, both in `Support/`:

- **An account**, because signing up for real means receiving an email.
- **The schema**, because a migration is not something a learner runs.

Everything else — solving a step, saving it, coming back to it on another
device — a test does through the application, the way a person would.

The suite refuses to run against a non-local database (`assertLocal()` in
`Support/Stack.js`): a reset is destructive, and a mistyped environment variable
should stop the run rather than empty a database somebody's progress is in. It
also runs on its own port (4326), so it never talks to a dev server someone left
running.
