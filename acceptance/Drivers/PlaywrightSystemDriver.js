import { expect } from "@playwright/test";

import { accountId, issueSession, storedProgress } from "../Support/Database.js";
import { BASE_URL } from "../Support/Server.js";
import { SystemProtocolDriver } from "./SystemProtocolDriver.js";

/**
 * Drives the system through a real browser, against a real server, a real
 * simulator and a real database. The only layer allowed to know what anything
 * is called on screen.
 *
 * Finding things follows Playwright's documented locator priority — role and
 * accessible name first, then label, then text. CodeMirror is the one
 * exception: its editing surface carries no accessible name, so it is reached
 * by the class name it renders with.
 */
export class PlaywrightSystemDriver extends SystemProtocolDriver {
    constructor(page, browser) {
        super();
        this.page = page;
        this.browser = browser;
    }

    /**
     * Signs in through the application's own sign-in path.
     *
     * Sim8085 signs people in with Google, which no test can drive: the
     * credential screen belongs to Google. What the application actually does
     * is take an access and refresh token out of the URL fragment Google
     * redirects back with, so the driver obtains a real session from the real
     * auth server and delivers it in exactly that fragment. Everything from
     * there — establishing the session, persisting it, hydrating progress — is
     * the production path.
     */
    async signIn(credentials) {
        const session = await issueSession(credentials.email, credentials.password);

        const fragment = new URLSearchParams({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_in: String(session.expires_in),
            token_type: session.token_type,
        });

        await this.visit(`/#${fragment}`);

        // The app replaces the URL once it has taken the tokens out of it,
        // which is the signal that the session was established rather than
        // that the page merely loaded. Waiting for that reload to finish too:
        // navigating away while it is still in flight aborts it, and the next
        // step lands on a page that never ran.
        await this.page.waitForURL((url) => url.hash === "", {
            waitUntil: "load",
            timeout: 20_000,
        });
    }

    async confirmSignedIn() {
        await expect(this.profileMenu()).toBeVisible();
        await expect(this.signInLink()).toHaveCount(0);
    }

    async confirmSignedOut() {
        await expect(this.signInLink()).toBeVisible();
    }

    async openStep(stepKey) {
        await this.visit(`/practice/${stepKey}/`);

        // The panel hydrates as an island; waiting for its heading keeps every
        // later click from racing the handlers being attached.
        await expect(this.page.getByRole("heading", { level: 2 })).toBeVisible();
    }

    async writeProgram(source) {
        const editor = this.editor();
        await expect(editor).toBeVisible();

        await editor.click();
        await this.page.keyboard.press("ControlOrMeta+a");
        await this.page.keyboard.insertText(source);

        // CodeMirror reformats as you type — auto-indent, bracket completion —
        // and a program that was quietly mangled on the way in would fail its
        // checks for a reason that has nothing to do with the learner.
        expect(await this.programInEditor()).toBe(source.trimEnd());
    }

    async check() {
        const button = this.page.getByRole("button", { name: "Check" });
        await button.click();

        // The verdict is rendered when the worker has answered; waiting for the
        // button to come back would let an assertion run against the previous
        // verdict still on screen.
        await expect(this.verdict()).toBeVisible({ timeout: 60_000 });
    }

    async confirmCheckPassed() {
        await expect(this.page.getByText(/^All \d+ checks passed\.$/)).toBeVisible();
    }

    async confirmCheckFailed() {
        await expect(this.page.getByText(/^\d+ of \d+ checks failed\.$/)).toBeVisible();
    }

    async confirmStepComplete() {
        await expect(this.completionBadge()).toBeVisible();
    }

    /**
     * Reads the completion badge the way a learner does: hover it, and see what
     * it says about where the work went. The icon alone — a cloud or a laptop —
     * is not something a test can read, and the sentence is the part that has to
     * be right anyway.
     */
    async whereWorkIsShownAsSaved() {
        await this.completionBadge().hover();

        const said = (await this.page.getByRole("tooltip").innerText()).trim();

        if (/^Saved to your account/.test(said)) return "account";
        if (/^Kept in this tab/.test(said)) return "local";

        throw new Error(`The completion badge said something unexpected: ${said}`);
    }

    async confirmStepLocked() {
        await expect(this.page.getByText("Finish the previous step first")).toBeVisible();
    }

    async confirmStepUnlocked() {
        await expect(this.page.getByRole("button", { name: "Check" })).toBeVisible();
    }

    async confirmProgressIsSaidToBeLocal() {
        await expect(this.page.getByText("Progress is kept for this tab only.")).toBeVisible();
    }

    async programInEditor() {
        // Line elements joined by hand rather than innerText: CodeMirror draws
        // an empty line as a <br>, which innerText reports as a line break of
        // its own, so a program with a blank line in it reads back with an
        // extra one.
        const lines = await this.page.locator(".cm-line").allTextContents();

        return lines.join("\n").trimEnd();
    }

    async savedProgress(credentials) {
        return storedProgress(accountId(credentials.email));
    }

    /**
     * The same person, on a second device: a browser context of its own, so it
     * shares no session, no draft and no local progress with the first.
     */
    async onAnotherDevice(body) {
        // A context made this way inherits nothing from the config, baseURL
        // included, so it is given one.
        const context = await this.browser.newContext({ baseURL: BASE_URL });
        const page = await context.newPage();

        try {
            await body(new PlaywrightSystemDriver(page, this.browser));
        } finally {
            await context.close();
        }
    }

    /**
     * Navigation, retried when the application navigates out from under it.
     *
     * Signing in ends with the app reloading itself to get the tokens out of
     * the URL. Supabase clears the fragment as soon as it has read the tokens,
     * so there is no way to tell from the outside whether that reload has
     * already happened or is about to — and a navigation issued in that instant
     * is aborted by it. Trying again is both simpler and more honest than
     * guessing at the timing.
     */
    async visit(path) {
        for (let attempt = 1; ; attempt += 1) {
            try {
                await this.page.goto(path);
                return;
            } catch (error) {
                if (attempt === 3 || !String(error.message).includes("ERR_ABORTED")) throw error;
            }
        }
    }

    /** Says the step is done, and — on hover — where the work was kept. */
    completionBadge() {
        return this.page.getByRole("button", { name: "complete" });
    }

    editor() {
        return this.page.locator(".cm-content");
    }

    verdict() {
        return this.page.getByText(/checks (passed|failed)\./);
    }

    signInLink() {
        return this.page.getByRole("link", { name: "Login" });
    }

    profileMenu() {
        return this.page.locator("[x-data='userProfile'] button").first();
    }
}
