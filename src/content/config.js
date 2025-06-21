import { defineCollection, z } from "astro:content";
import { docsLoader } from "@astrojs/starlight/loaders";
import { docsSchema } from "@astrojs/starlight/schema";
import { glob } from "astro/loaders";

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
};
