/**
 * What the acceptance tests need the system to be able to do, stated once and
 * without reference to *how* it is done. The DSL talks to this; only an
 * implementation knows about pages, buttons or storage.
 *
 * Swapping the implementation swaps the boundary the suite runs against — a
 * browser today, an in-process driver later, should the same tests need to run
 * as a fast feedback loop — without touching a single test.
 *
 * A base class rather than a bare interface, so an implementation that forgets
 * a step fails saying which one, at the moment a test asks for it.
 */
export class SystemProtocolDriver {
    /** Signs in the way the identity provider's redirect does. */
    signIn(_credentials) {
        this.unimplemented("signIn");
    }

    /** Fails the test unless the application shows a signed-in visitor. */
    confirmSignedIn() {
        this.unimplemented("confirmSignedIn");
    }

    /** Fails the test unless the application shows an anonymous visitor. */
    confirmSignedOut() {
        this.unimplemented("confirmSignedOut");
    }

    /** Opens a practice step, e.g. "add-two-8bit-numbers/step-1". */
    openStep(_stepKey) {
        this.unimplemented("openStep");
    }

    /** Replaces whatever is in the editor with this program. */
    writeProgram(_source) {
        this.unimplemented("writeProgram");
    }

    /** Runs the step's checks and waits for the verdict. */
    check() {
        this.unimplemented("check");
    }

    /** Fails the test unless the last check passed every case. */
    confirmCheckPassed() {
        this.unimplemented("confirmCheckPassed");
    }

    /** Fails the test unless the last check reported failing cases. */
    confirmCheckFailed() {
        this.unimplemented("confirmCheckFailed");
    }

    /** Fails the test unless the step is shown as done. */
    confirmStepComplete() {
        this.unimplemented("confirmStepComplete");
    }

    /**
     * Where the app is telling the learner their passing work has ended up:
     * "account" or "local".
     */
    whereWorkIsShownAsSaved() {
        this.unimplemented("whereWorkIsShownAsSaved");
    }

    /** Fails the test unless the step refuses to open until the one before it. */
    confirmStepLocked() {
        this.unimplemented("confirmStepLocked");
    }

    /** Fails the test unless the step can be worked on. */
    confirmStepUnlocked() {
        this.unimplemented("confirmStepUnlocked");
    }

    /** Fails the test unless the app says progress is being kept locally only. */
    confirmProgressIsSaidToBeLocal() {
        this.unimplemented("confirmProgressIsSaidToBeLocal");
    }

    /** The program the editor currently holds, as the learner sees it. */
    programInEditor() {
        this.unimplemented("programInEditor");
    }

    /**
     * What the server has stored for the account this driver is signed in as —
     * the check that the UI is not merely ticking a box locally.
     */
    savedProgress() {
        this.unimplemented("savedProgress");
    }

    /** Runs a body as the same person on a second device, then puts it away. */
    onAnotherDevice(_body) {
        this.unimplemented("onAnotherDevice");
    }

    unimplemented(step) {
        throw new Error(`${this.constructor.name} does not implement ${step}().`);
    }
}
