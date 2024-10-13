import { defineConfig } from 'astro/config';
import solidJs from '@astrojs/solid-js';
import tailwind from '@astrojs/tailwind';
import peggy from 'vite-plugin-peggy-loader';

import alpinejs from '@astrojs/alpinejs';

// https://astro.build/config
export default defineConfig({
  integrations: [solidJs({
    devtools: true,
  }), tailwind(), alpinejs()],
  vite: {
    plugins: [peggy()],
  }
});
