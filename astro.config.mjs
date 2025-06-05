import { defineConfig } from "astro/config";
import solidJs from "@astrojs/solid-js";
import tailwind from "@astrojs/tailwind";
import peggy from "vite-plugin-peggy-loader";
import AstroPWA from "@vite-pwa/astro";
import starlight from "@astrojs/starlight";
import alpinejs from "@astrojs/alpinejs";

// https://astro.build/config
export default defineConfig({
    trailingSlash: "always",
    integrations: [
        starlight({
            title: "Sim8085 Docs",
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
            social: {
                github: "https://github.com/debjitbis08/sim8085",
            },
            disable404Route: true,
            sidebar: [
                { slug: "docs/en" },
                { slug: "docs/en/assembly" },
                { slug: "docs/en/unsupported" },
                { slug: "docs/en/interrupts" },
                { slug: "docs/en/infinite-loop-reasons" },
                { slug: "docs/en/app-install" },
                /*
        {
          label: 'Instructions',
         	items: [
   					'docs/en/instructions/aci',
   					'docs/en/instructions/adc',
         	]
        },
        */
                {
                    label: "References",
                    items: ["docs/en/reference/ascii", "docs/en/reference/instruction-summary"],
                },
            ],
        }),
        solidJs({
            devtools: true,
        }),
        tailwind({
            applyBaseStyles: false,
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
    vite: {
        plugins: [peggy()],
        ssr: {
            noExternal: ["nanoid"],
        },
    },
});
