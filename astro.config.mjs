import { defineConfig } from 'astro/config';
import solidJs from '@astrojs/solid-js';
import tailwind from '@astrojs/tailwind';
import peggy from 'vite-plugin-peggy-loader';

// https://astro.build/config
export default defineConfig({
  integrations: [solidJs({
    devtools: true,
  }), tailwind()],
  vite: {
    plugins: [peggy()]
  }
});
