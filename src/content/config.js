import { defineCollection, z } from 'astro:content';
import { docsSchema } from '@astrojs/starlight/schema';

export const collections = {
	docs: defineCollection({ schema: docsSchema() }),
	changes: defineCollection({
	  version: z.string(),
		date: z.string()
	})
};
