/**
 * Which steps of a problem are open to the learner.
 *
 * Steps unlock in order: the first is always open, and each later one opens
 * once the step before it is complete. Kept pure and separate from storage so
 * the rule is testable on its own.
 *
 * This is guidance, not enforcement. Step content ships in the static bundle,
 * so a determined visitor can read ahead; the gate exists to keep people from
 * wandering into step 4 by accident, not to keep them out.
 */

/**
 * @param {string[]} orderedStepKeys - the problem's steps, in step order
 * @param {(stepKey: string) => boolean} isComplete
 * @returns {Set<string>} the step keys that are open
 */
export function unlockedSteps(orderedStepKeys, isComplete) {
    const unlocked = new Set();

    for (const [index, stepKey] of orderedStepKeys.entries()) {
        if (index === 0) {
            unlocked.add(stepKey);
            continue;
        }

        // A step you have already finished stays open even if you somehow
        // reach it out of order — locking completed work would be absurd.
        if (isComplete(stepKey) || isComplete(orderedStepKeys[index - 1])) {
            unlocked.add(stepKey);
        }
    }

    return unlocked;
}

export function isStepUnlocked(stepKey, orderedStepKeys, isComplete) {
    return unlockedSteps(orderedStepKeys, isComplete).has(stepKey);
}

/** The first step the learner has not finished — where "Continue" should go. */
export function nextIncompleteStep(orderedStepKeys, isComplete) {
    return orderedStepKeys.find((stepKey) => !isComplete(stepKey)) ?? null;
}
