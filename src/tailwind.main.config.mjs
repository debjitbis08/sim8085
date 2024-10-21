/** @type {import('tailwindcss').Config} */
export default {
	content: [
	  './src/components/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
	  './src/pages/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
	  './src/layouts/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
		'./public/tips/*.html'
	],
	darkMode: 'selector',
	theme: {
		extend: {},
	},
	plugins: [],
}
