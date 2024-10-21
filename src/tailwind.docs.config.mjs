/** @type {import('tailwindcss').Config} */

import starlightPlugin from '@astrojs/starlight-tailwind';

export default {
	content: [
	  './src/content/docs/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
		'./src/components/**/*.astro'
	],
	theme: {
		extend: {},
	},
	plugins: [starlightPlugin()],
}
