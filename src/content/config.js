import { defineCollection, reference, z } from "astro:content";
import { glob } from 'astro/loaders';
import { docsSchema } from "@astrojs/starlight/schema";

const tutorialsCollection = defineCollection({
    loader: glob({
        pattern: ['**/metadata.json'],
        base: 'src/content/tutorials',
    }),
    schema: z.object({
        title: z.string().min(1, "Title is required"),
        description: z.string().min(1, "Description is required"),
        slug: z.string().min(1, "Slug is required").optional(),
        category: z.enum(["Basics", "Intermediate", "Advanced"]),
        difficulty: z.enum(["Easy", "Medium", "Hard"]),
        publishedDate: z.coerce.date(),
        tags: z.array(z.string()).optional(),
        isDraft: z.boolean().optional().default(false),
        steps: z.array(reference("steps"))
    }),
});

const registerType = z.object({ high: z.number().optional(), low: z.number().optional() }).optional();

const machineStateForTest = z
    .object({
        accumulator: z.number().optional(),
        registers: z
            .object({
                bc: registerType,
                de: registerType,
                hl: registerType,
            })
            .optional(),
        flags: {
            z: z.boolean().optional(),
            s: z.boolean().optional(),
            p: z.boolean().optional(),
            c: z.boolean().optional(),
            ac: z.boolean().optional(),
        },
        programCounter: z.number().optional(),
        memory: z.record(z.string(), z.string()),
    })
    .optional();

const stepsCollection = defineCollection({
    loader: glob({
        pattern: ['*/step*.md'],
        base: 'src/content/tutorials',
    }),
    schema: z.object({
        title: z.string(),
        tutorial: reference("tutorials"),
        videoUrl: z.string().url().optional(),
        startingCode: z.string().optional(),
        testCases: z
            .array(
                z.object({
                    input: machineStateForTest,
                    output: machineStateForTest,
                }),
            )
            .optional(),
        hints: z.array(z.string()).optional(),
        stepNumber: z.number(),
    }),
});

export const collections = {
    docs: defineCollection({ schema: docsSchema() }),
    changelog: defineCollection({
        loader: glob({
            pattern: ['*.md'],
            base: 'src/content/changelog',
        }),
        versions: z.array(z.string()),
        date: z.string(),
    }),
    tutorials: tutorialsCollection,
    steps: stepsCollection,
};
