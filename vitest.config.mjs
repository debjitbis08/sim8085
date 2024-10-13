import { defineConfig } from 'vitest/config'
import peggy from 'vite-plugin-peggy-loader';

export default defineConfig({
  plugins: [peggy()],
  test: {},
})
