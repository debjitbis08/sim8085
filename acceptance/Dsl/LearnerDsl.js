import { expect } from "@playwright/test";

import { solutionFor, starterFor } from "../Support/Solutions.js";
import { DEFAULT_LEARNER, DEFAULT_STEP } from "../Support/TestPeople.js";
import { Params } from "./Utils/Params.js";

/**
 * Someone working through the practice exercises — the only actor these tests
 * need. They open a step, write 8085 assembly, press Check, and expect the work
 * to still be there tomorrow.
 *
 * Every step is written from their side of the screen. Nothing here knows what
 * a button is called; that is the driver's business.
 */
export class LearnerDsl {
    constructor(context, driver, credentials) {
        this.context = context;
        this.driver = driver;
        this.credentials = credentials;
    }

    /** Signs in to the account the fixture created for this test. */
    async signsIn() {
        await this.driver.signIn(this.credentials);
    }

    async confirmsSignedIn() {
        await this.driver.confirmSignedIn();
    }

    async confirmsSignedOut() {
        await this.driver.confirmSignedOut();
    }

    async opensStep(...args) {
        await this.driver.openStep(this.step(args));
    }

    /** The program a learner who has understood the step would have written. */
    async writesAWorkingProgram(...args) {
        await this.driver.writeProgram(solutionFor(this.step(args)));
    }

    /** The step's own starting code, which does not yet do what is asked. */
    async writesTheProgramTheStepStartedThemWith(...args) {
        await this.driver.writeProgram(starterFor(this.step(args)));
    }

    async checksTheirWork() {
        await this.driver.check();
    }

    /** Opens a step, solves it, and confirms it was accepted. */
    async solves(...args) {
        await this.opensStep(...args);
        await this.writesAWorkingProgram(...args);
        await this.checksTheirWork();
        await this.confirmsTheirProgramPassed();
    }

    async confirmsTheirProgramPassed() {
        await this.driver.confirmCheckPassed();
        await this.driver.confirmStepComplete();
    }

    /**
     * What the step itself says about where the work went. Separate from
     * confirmsTheirWorkWasSaved: one is what happened, this is what they were
     * told, and a learner deciding whether to close the tab has only the
     * second.
     */
    async confirmsTheyAreToldItIsSavedToTheirAccount() {
        await expect
            .poll(async () => await this.driver.whereWorkIsShownAsSaved(), { timeout: 15_000 })
            .toBe("account");
    }

    async confirmsTheyAreToldItIsKeptOnlyHere() {
        await expect
            .poll(async () => await this.driver.whereWorkIsShownAsSaved(), { timeout: 5_000 })
            .toBe("local");
    }

    async confirmsTheirProgramFailed() {
        await this.driver.confirmCheckFailed();
    }

    /**
     * The point of signing in: the step, and the program that passed it, are
     * still there when the browser is not. Asserted against what was stored,
     * not against a tick on the screen — the tick appears before the write and
     * would go on appearing if the write never happened.
     */
    async confirmsTheirWorkWasSaved(...args) {
        const stepKey = this.step(args);

        await expect
            .poll(async () => await this.driver.savedProgress(this.credentials), {
                message: `waiting for ${stepKey} to be saved`,
                timeout: 15_000,
            })
            .toEqual([expect.objectContaining({ step_key: stepKey, solution: solutionFor(stepKey) })]);
    }

    /** Nothing of theirs reached the server — because it should not have. */
    async confirmsNothingWasSaved() {
        // Given a moment, because "nothing was written" is only meaningful once
        // a write would have had time to land.
        await expect
            .poll(async () => await this.driver.savedProgress(this.credentials), { timeout: 5_000 })
            .toEqual([]);
    }

    async confirmsTheStepIsOpenToThem() {
        await this.driver.confirmStepUnlocked();
    }

    async confirmsTheStepIsLocked() {
        await this.driver.confirmStepLocked();
    }

    /**
     * A step opens with the learner's own solution to the step before it, which
     * is what makes the sequence feel like one program being built rather than
     * a series of unrelated puzzles.
     */
    async confirmsTheEditorCarriesTheirSolutionTo(...args) {
        const stepKey = this.step(args);

        await expect
            .poll(async () => await this.driver.programInEditor(), {
                message: `waiting for the editor to carry the solution to ${stepKey}`,
                timeout: 15_000,
            })
            .toBe(solutionFor(stepKey));
    }

    /** Anonymous progress is worth something, but the app says what. */
    async confirmsTheyAreToldProgressIsForThisTabOnly() {
        await this.driver.confirmProgressIsSaidToBeLocal();
    }

    /** The same person, at the same account, on a device they left at home. */
    async onAnotherDevice(body) {
        await this.driver.onAnotherDevice(async (driver) => {
            await body(new LearnerDsl(this.context, driver, this.credentials));
        });
    }

    step(args) {
        return new Params(this.context, args).optional("step", DEFAULT_STEP);
    }
}
