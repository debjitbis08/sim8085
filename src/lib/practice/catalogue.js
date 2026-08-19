/**
 * Shared queries over the practice collections.
 *
 * Kept out of the pages so the catalogue and the step route agree on what is
 * published and how steps are ordered.
 */

import { parseStepKey } from "./step-key.js";

const DIFFICULTY_ORDER = ["beginner", "intermediate", "advanced"];

/** Drafts are visible while developing and withheld from a production build. */
export function isPublished(problem) {
    if (import.meta.env.DEV) return true;
    return problem.data.status !== "draft";
}

/** A problem's steps, in the order the learner should meet them. */
export function stepsForProblem(allSteps, problemSlug) {
    return allSteps
        .filter((step) => parseStepKey(step.id).problem === problemSlug)
        .sort((a, b) => a.data.stepNumber - b.data.stepNumber);
}

/** Catalogue order: easiest first, then the author's `order` within a tier. */
export function sortProblems(problems) {
    return [...problems].sort((a, b) => {
        const byDifficulty =
            DIFFICULTY_ORDER.indexOf(a.data.difficulty) - DIFFICULTY_ORDER.indexOf(b.data.difficulty);
        return byDifficulty !== 0 ? byDifficulty : a.data.order - b.data.order;
    });
}

export function allTags(problems) {
    return [...new Set(problems.flatMap((p) => p.data.tags))].sort();
}

/**
 * A serializable catalogue for the left panel: every published problem with
 * its steps and hrefs, ready to hand to a client island.
 *
 * Built on the server because titles and difficulty live in markdown
 * frontmatter, which the browser never sees.
 */
export function buildCatalogue(problems, allSteps) {
    return sortProblems(problems.filter(isPublished)).map((problem) => ({
        slug: problem.id,
        title: problem.data.title,
        description: problem.data.description,
        difficulty: problem.data.difficulty,
        access: problem.data.access,
        tags: problem.data.tags,
        steps: stepsForProblem(allSteps, problem.id).map((step) => ({
            stepKey: step.id,
            title: step.data.title,
            stepNumber: step.data.stepNumber,
            href: `/practice/${problem.id}/${parseStepKey(step.id).step}/`,
        })),
    }));
}
