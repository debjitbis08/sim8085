import { defineCollection, z } from 'astro:content';
import { docsSchema } from '@astrojs/starlight/schema';

export const collections = {
	docs: defineCollection({ schema: docsSchema() }),
	changes: defineCollection({
	  versions: z.array(z.string()),
		date: z.string()
	})
};
