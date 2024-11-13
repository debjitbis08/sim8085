/** @type {import('tailwindcss').Config} */

const generateColorString = (variable) => {
  return `rgb(var(--${variable}) / 1)`;
}

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
      colors: {
        terminal: {
          50:  "var(--sm-primary-50)",
          100: "var(--sm-primary-100)",
          200: "var(--sm-primary-200)",
          300: "var(--sm-primary-300)",
          400: "var(--sm-primary-400)",
          500: "var(--sm-primary-500)",
          600: "var(--sm-primary-600)",
          700: "var(--sm-primary-700)",
          800: "var(--sm-primary-800)",
          900: "var(--sm-primary-900)",
          950: "var(--sm-primary-950)",
          DEFAULT: "var(--sm-primary)", // Alias for 500
        },
        gray: {
          50: "var(--sm-gray-50)",
          100: "var(--sm-gray-100)",
          200: "var(--sm-gray-200)",
          300: "var(--sm-gray-300)",
          400: "var(--sm-gray-400)",
          500: "var(--sm-gray-500)",
          600: "var(--sm-gray-600)",
          700: "var(--sm-gray-700)",
          800: "var(--sm-gray-800)",
          900: "var(--sm-gray-900)",
          950: "var(--sm-gray-950)",
        },
        page: {
          background: "var(--sm-page-background)",
        },
        main: {
          background: "var(--sm-main-background)",
          border: "var(--sm-main-border)",
        },
        primary: {
          foreground: "var(--sm-primary-foreground)",
          border: "var(--sm-primary-border)",
        },
        secondary: {
          foreground: "var(--sm-secondary-foreground)",
          background: "var(--sm-secondary-background)",
          border: "var(--sm-secondary-border)",
        },
        active: {
          foreground: "var(--sm-active-foreground)",
          background: "var(--sm-active-background)",
          border: "var(--sm-active-border)",
        },
        inactive: {
          foreground: "var(--sm-inactive-foreground)",
          border: "var(--sm-inactive-border)",
        },
        red: {
          foreground: "var(--sm-red-foreground)",
        },
        green: {
          foreground: "var(--sm-green-foreground)",
        },
        yellow: {
          foreground: "var(--sm-yellow-foreground)",
        },
      },
    },
  },
  safelist: [
    "text-primary-500"
    /*
    {
      pattern:  /(bg|text|border)-primary-(50|100|200|300|400|500|600|700|800|900)/,
    },
    {
      pattern:  /(bg|text|border)-primary/,
    }
    */
  ]
}
