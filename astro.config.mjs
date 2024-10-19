import { defineConfig } from 'astro/config';
import solidJs from '@astrojs/solid-js';
import tailwind from '@astrojs/tailwind';
import peggy from 'vite-plugin-peggy-loader';
import AstroPWA from '@vite-pwa/astro';

import alpinejs from '@astrojs/alpinejs';

// https://astro.build/config
export default defineConfig({
  integrations: [
    solidJs({
      devtools: true,
    }),
    tailwind(),
    alpinejs(),
    AstroPWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Sim8085',
        short_name: 'Sim8085',
        theme_color: '#ffffff',
      },
      includeAssets: ['favicon.svg', 'favicon-dark.svg', 'favicon.ico'],
      pwaAssets: {
        config: true,
      },
    })
  ],
  output: 'static',
  vite: {
    plugins: [peggy()],
  }
});
