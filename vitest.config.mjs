import { defineConfig } from 'vitest/config'
import peggy from 'vite-plugin-peggy-loader';

export default defineConfig({
  plugins: [peggy()],
  resolve: {
    alias: {
      // Astro-only virtual module; see the stub for why it resolves to empty
      // values here.
      "astro:env/client": new URL("./src/tests/stubs/astro-env-client.js", import.meta.url).pathname,
    },
  },
  test: {},
})
