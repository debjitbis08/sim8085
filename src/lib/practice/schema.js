/**
 * Astro content schemas for practice problems and steps.
 *
 * Frontmatter carries only what is prose-adjacent. Everything executable —
 * starter code, the reference solution, the check spec — lives in sibling
 * files found by naming convention (see content.js), so authors never write a
 * path that can go stale, and the reference solution is never part of a
 * collection entry and so can never be shipped to the browser.
 */

import { z } from "astro:content";
import { DEFAULT_BUDGET_TSTATES } from "./run-case.js";

export const problemSchema = z.object({
    title: z.string(),
    description: z.string(),
    difficulty: z.enum(["beginner", "intermediate", "advanced"]),
    tags: z.array(z.string()).default([]),
    /** Ordering within a difficulty on the catalogue page. */
    order: z.number().int(),
    /** `plus` problems are withheld from users below the PLUS tier. */
    access: z.enum(["free", "plus"]).default("free"),
    /** `draft` problems are visible in dev only. */
    status: z.enum(["active", "draft"]).default("active"),
});

export const stepSchema = z.object({
    title: z.string(),
    stepNumber: z.number().int().positive(),
    hints: z.array(z.string()).default([]),
    budgetTstates: z.number().int().positive().default(DEFAULT_BUDGET_TSTATES),
});
