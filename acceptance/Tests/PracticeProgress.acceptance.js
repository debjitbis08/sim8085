import { test } from "../Dsl/Dsl.js";

/**
 * What happens to a learner's work when they solve a practice step.
 *
 * Anonymous progress lives in the tab and is honestly advertised as such;
 * signing in is what makes it durable, and nothing is lost in the crossing.
 */

const STEP_1 = "add-two-8bit-numbers/step-1";
const STEP_2 = "add-two-8bit-numbers/step-2";

test("a signed-in learner's passing program is kept", async ({ learner }) => {
    await learner.signsIn();
    await learner.confirmsSignedIn();

    await learner.solves(`step: ${STEP_1}`);

    await learner.confirmsTheirWorkWasSaved(`step: ${STEP_1}`);
    await learner.confirmsTheyAreToldItIsSavedToTheirAccount();
});

test("a program that does not pass its checks is not kept", async ({ learner }) => {
    await learner.signsIn();

    await learner.opensStep(`step: ${STEP_1}`);
    await learner.writesTheProgramTheStepStartedThemWith(`step: ${STEP_1}`);
    await learner.checksTheirWork();

    await learner.confirmsTheirProgramFailed();
    await learner.confirmsNothingWasSaved();
});

test("an anonymous learner keeps going, and is told what that progress is worth", async ({
    learner,
}) => {
    await learner.solves(`step: ${STEP_1}`);
    await learner.confirmsSignedOut();
    await learner.confirmsTheyAreToldItIsKeptOnlyHere();
    await learner.confirmsTheyAreToldProgressIsForThisTabOnly();
    await learner.confirmsNothingWasSaved();

    await learner.opensStep(`step: ${STEP_2}`);
    await learner.confirmsTheStepIsOpenToThem();
});

test("work done before signing in is kept, not lost, when they sign in", async ({ learner }) => {
    await learner.solves(`step: ${STEP_1}`);
    await learner.confirmsNothingWasSaved();

    await learner.signsIn();
    await learner.opensStep(`step: ${STEP_1}`);

    await learner.confirmsTheirWorkWasSaved(`step: ${STEP_1}`);
});

test("a step solved on one device is unlocked, and carried forward, on another", async ({
    learner,
}) => {
    await learner.onAnotherDevice(async (them) => {
        await them.signsIn();
        await them.solves(`step: ${STEP_1}`);
        await them.confirmsTheirWorkWasSaved(`step: ${STEP_1}`);
    });

    await learner.signsIn();
    await learner.opensStep(`step: ${STEP_2}`);

    await learner.confirmsTheStepIsOpenToThem();
    await learner.confirmsTheEditorCarriesTheirSolutionTo(`step: ${STEP_1}`);
});
