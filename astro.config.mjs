// @ts-check
import { defineConfig, envField } from "astro/config";
import solidJs from "@astrojs/solid-js";
import peggy from "vite-plugin-peggy-loader";
import AstroPWA from "@vite-pwa/astro";
import starlight from "@astrojs/starlight";
import alpinejs from "@astrojs/alpinejs";
import netlify from "@astrojs/netlify";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
    trailingSlash: "always",
    integrations: [
        starlight({
            title: "Sim8085 Documentation",
            defaultLocale: "en",
            locales: {
                en: {
                    label: "English",
                },
            },
            customCss: ["./src/tailwind.docs.css"],
            components: {
                Head: "./src/components/DocumentationHead.astro",
                // Footer: './src/components/DocumentationFooter.astro'
            },
            social: [
                {
                    icon: "github",
                    label: "GitHub",
                    href: "https://github.com/debjitbis08/sim8085",
                },
            ],
            disable404Route: true,
            // favicon: "/favicon.svg",
            head: [
                {
                    tag: "script",
                    content: `window.addEventListener('load', () => { document.querySelector('.site-title').href = '/docs/en'; Array.from(document.querySelectorAll('#starlight__sidebar a')).forEach((el) => el.href = el.href.replace("/en", "/docs/en")); });`,
                },
                {
                    tag: "link",
                    attrs: {
                        rel: "icon",
                        href: "/favicon.svg",
                        type: "image/svg+xml",
                    },
                },
                {
                    tag: "link",
                    attrs: {
                        rel: "icon",
                        href: "/favicon-dark.svg",
                        media: "(prefers-color-scheme: dark)",
                        type: "image/svg+xml",
                    },
                },
            ],
            sidebar: [
                { label: "What is Sim8085?", link: "/" },
                { label: "Assembly Language", link: "/assembly" },
                { label: "Unsupported Features", link: "/unsupported" },
                { label: "Interrupts in Sim8085", link: "/interrupts" },
                { label: "Reasons for Infinite Loops", link: "/infinite-loop-reasons" },
                { label: "Installing Sim8085", link: "/app-install" },
                {
                    label: "Programs",
                    items: [
                        {
                            label: "Find the Largest Number in an Array",
                            link: "/programs/largest-number-in-array",
                        },
                        {
                            label: "Reverse a Block in Memory",
                            link: "/programs/reversing-an-array",
                        },
                        {
                            label: "Find the Sum of Array Elements",
                            link: "/programs/sum-array-elements",
                        },
                        {
                            label: "Delay Loop and Output to Port",
                            link: "/programs/delay-and-output",
                        },
                        {
                            label: "Count Number of 1’s in an 8-bit Number",
                            link: "/programs/count-ones-in-byte",
                        },
                        {
                            label: "Add Two 8-bit Numbers",
                            link: "/programs/add-8bit-numbers",
                        },
                        {
                            label: "Swap Two 8-bit numbers",
                            link: "/programs/swap-8bit-numbers",
                        },
                        {
                            label: "Find Largest and Smallest in an Array",
                            link: "/programs/largest-smallest-in-array",
                        },
                        {
                            label: "Convert a Two‑Digit BCD to Binary",
                            link: "/programs/convert-bcd-to-binary",
                        },
                        {
                            label: "Multiply Two 8‑bit Numbers",
                            link: "/programs/multiply-8bit-numbers",
                        },
                        {
                            label: "Automatic Lawn Irrigation System",
                            link: "/programs/automatic-lawn-irrigation",
                        },
                    ],
                },
                {
                    label: "References",
                    items: [
                        {
                            label: "ASCII Table",
                            link: "/reference/ascii",
                        },
                        {
                            label: "Instruction Summary",
                            link: "/reference/instruction-summary",
                        },
                    ],
                },
            ],
        }),
        solidJs({
            devtools: true,
        }),
        alpinejs(),
        AstroPWA({
            registerType: "autoUpdate",
            manifest: {
                name: "Sim8085",
                short_name: "Sim8085",
                theme_color: "#ffffff",
            },
            includeAssets: ["favicon.svg", "favicon-dark.svg", "favicon.ico", "favicon-with-background.svg"],
            pwaAssets: {
                config: true,
            },
            workbox: {
                globIgnores: [
                    "tips/**", // Exclude all files in the `tips` folder
                ],
            },
        }),
    ],
    output: "static",
    adapter: netlify({
        edgeMiddleware: false,
        imageCDN: false,
    }),
    vite: {
        plugins: [peggy(), tailwindcss()],
        ssr: {
            noExternal: ["nanoid", "@astrojs/starlight-tailwind"],
        },
    },
    env: {
        schema: {
            USE_TRACKING: envField.boolean({ context: "client", access: "public", optional: true, default: false }),
            POSTHOG_API_KEY: envField.string({ context: "client", access: "public", optional: true }),
            OPENAI_ENABLED: envField.boolean({ context: "client", access: "public", optional: true, default: false }),
            SUPABASE_URL: envField.string({ context: "client", access: "public", optional: true }),
            SUPABASE_ANON_KEY: envField.string({
                context: "client",
                access: "public",
                optional: true,
            }),
            SUPABASE_SERVICE_ROLE_KEY: envField.string({
                context: "server",
                access: "secret",
                optional: true,
            }),
            SUPABASE_JWT_SECRET: envField.string({
                context: "server",
                access: "secret",
                optional: true,
            }),
            OPENAI_API_KEY: envField.string({
                context: "server",
                access: "secret",
                optional: true,
            }),
            OPENAI_TUTOR_ASSISTANT_ID: envField.string({
                context: "server",
                access: "secret",
                optional: true,
            }),
            RAZORPAY_WEBHOOK_SECRET: envField.string({
                context: "server",
                access: "secret",
                optional: true,
            }),
            DODO_WEBHOOK_SECRET: envField.string({
                context: "server",
                access: "secret",
                optional: true,
            }),
            DODO_PLUS_PRODUCT_ID: envField.string({
                context: "server",
                access: "secret",
                optional: true,
            }),
        },
    },
});
