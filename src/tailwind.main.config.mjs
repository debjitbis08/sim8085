/** @type {import('tailwindcss').Config} */
export default {
  content: {
    relative: true,
    files: [
      './pages/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
      './layouts/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
      '../public/tips/*.html',
      './components/**/*.{astro,html,js,jsx,md,mdx,css}',
    ]
  },
	darkMode: 'selector',
	theme: {
    extend: {
      screens: {
        'h-sm': { raw: '(max-height: 400px)' },
      },
    },
  },
}
