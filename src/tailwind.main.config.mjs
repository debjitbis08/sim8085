/** @type {import('tailwindcss').Config} */
import colors from "tailwindcss/colors.js";

function formatCSSVarToRGB(varName) {
    if (!varName.startsWith("--")) {
        throw new Error('Invalid variable name. CSS variables should start with "--".');
    }
    return `rgb(var(${varName}) / <alpha-value>)`;
}

const grayLevels = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"];

const grayColors = Object.fromEntries(grayLevels.map((shade) => [`${shade}`, formatCSSVarToRGB(`--sm-gray-${shade}`)]));

const primaryShades = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950", "DEFAULT"];
const primaryColors = Object.fromEntries(
    primaryShades.map((shade) => [
        `${shade}`,
        formatCSSVarToRGB(shade === "DEFAULT" ? "--sm-primary" : `--sm-primary-${shade}`),
    ]),
);

export default {
    content: {
        relative: true,
        files: [
            "./pages/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}",
            "./layouts/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}",
            "../public/tips/*.html",
            "./components/styles.css",
            "./components/**/*.{astro,html,js,jsx,md,mdx,css}",
        ],
    },
    future: {
        hoverOnlyWhenSupported: true,
    },
    darkMode: ["class", '[data-theme="dark"]'],
    theme: {
        extend: {
            screens: {
                "h-sm": { raw: "(max-height: 400px)" },
            },
            colors: {
                terminal: primaryColors,
                gray: grayColors,
                page: {
                    background: formatCSSVarToRGB("--sm-page-background"),
                },
                main: {
                    background: formatCSSVarToRGB("--sm-main-background"),
                    border: formatCSSVarToRGB("--sm-main-border"),
                },
                primary: {
                    foreground: formatCSSVarToRGB("--sm-primary-foreground"),
                    border: formatCSSVarToRGB("--sm-primary-border"),
                },
                secondary: {
                    foreground: formatCSSVarToRGB("--sm-secondary-foreground"),
                    background: formatCSSVarToRGB("--sm-secondary-background"),
                    border: formatCSSVarToRGB("--sm-secondary-border"),
                },
                active: {
                    foreground: formatCSSVarToRGB("--sm-active-foreground"),
                    background: formatCSSVarToRGB("--sm-active-background"),
                    border: formatCSSVarToRGB("--sm-active-border"),
                },
                inactive: {
                    foreground: formatCSSVarToRGB("--sm-inactive-foreground"),
                    border: formatCSSVarToRGB("--sm-inactive-border"),
                },
                red: {
                    ...colors.red,
                    foreground: formatCSSVarToRGB("--sm-red-foreground"),
                },
                green: {
                    foreground: formatCSSVarToRGB("--sm-green-foreground"),
                },
                yellow: {
                    ...colors.yellow,
                    foreground: formatCSSVarToRGB("--sm-yellow-foreground"),
                },
                blue: {
                    ...colors.blue,
                    foreground: formatCSSVarToRGB("--sm-blue-foreground"),
                },
                orange: {
                    ...colors.orange,
                    foreground: formatCSSVarToRGB("--sm-orange-foreground"),
                },
                editor: {
                    activeLine: formatCSSVarToRGB("--sm-editor-active-line"),
                    debugLine: formatCSSVarToRGB("--sm-editor-debug-line"),
                    cursor: formatCSSVarToRGB("--sm-editor-cursor"),
                    selectionBackground: formatCSSVarToRGB("--sm-editor-selection-background"),
                    opcode: formatCSSVarToRGB("--sm-editor-opcode"),
                    directive: formatCSSVarToRGB("--sm-editor-directive"),
                    label: formatCSSVarToRGB("--sm-editor-label"),
                    comment: formatCSSVarToRGB("--sm-editor-comment"),
                    register: formatCSSVarToRGB("--sm-editor-register"),
                    number: formatCSSVarToRGB("--sm-editor-number"),
                    string: formatCSSVarToRGB("--sm-editor-string"),
                    operator: formatCSSVarToRGB("--sm-editor-operator"),
                    punctuation: formatCSSVarToRGB("--sm-editor-punctuation"),
                },
            },
        },
    },
    safelist: [
        {
            pattern: /(bg|text|border)-primary/,
        },
        {
            pattern: /(bg|text|border)-secondary-.+/,
        },
        {
            pattern: /(bg|text|border)-editor-.+/,
        },
    ],
    plugins: [require("@tailwindcss/typography")],
};
