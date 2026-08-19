import { defineCollection, z } from "astro:content";
import { docsLoader } from "@astrojs/starlight/loaders";
import { docsSchema } from "@astrojs/starlight/schema";
import { glob } from "astro/loaders";
import { problemSchema, stepSchema } from "../lib/practice/schema.js";

export const collections = {
    docs: defineCollection({
        loader: docsLoader(),
        schema: docsSchema(),
    }),
    changes: defineCollection({
        loader: glob({ base: "./src/content/changelog", pattern: "**/*.{md,mdx}" }),
        versions: z.array(z.string()),
        date: z.string(),
    }),

    // Practice problems live at src/content/practice/<problem>/, with index.md
    // describing the problem and step-N.md holding each exercise. Sibling
    // .asm files (reference solutions, long starter code) are deliberately not
    // matched, so they never become collection entries.
    practiceProblems: defineCollection({
        loader: glob({
            base: "./src/content/practice",
            pattern: "*/index.md",
            // "add-two-8bit-numbers/index.md" -> "add-two-8bit-numbers"
            generateId: ({ entry }) => entry.split("/")[0],
        }),
        schema: problemSchema,
    }),
    practiceSteps: defineCollection({
        loader: glob({
            base: "./src/content/practice",
            pattern: "*/step-*.md",
            // "add-two-8bit-numbers/step-1.md" -> "add-two-8bit-numbers/step-1"
            generateId: ({ entry }) => entry.replace(/\.md$/, ""),
        }),
        schema: stepSchema,
    }),
};
