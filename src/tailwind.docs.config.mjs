/** @type {import('tailwindcss').Config} */

import starlightPlugin from '@astrojs/starlight-tailwind';

export default {
  content: {
    relative: true,
    files: [
      './content/docs/**/*.{md,mdx}',
    ]
  },
	darkMode: 'selector',
	theme: {
		extend: {},
	},
	plugins: [starlightPlugin()],
}
