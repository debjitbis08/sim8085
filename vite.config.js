import { defineConfig } from 'vite';
import elmPlugin from 'vite-plugin-elm';
import peggyLoader from "vite-plugin-peggy-loader";

export default defineConfig({
  plugins: [
    peggyLoader(),
    elmPlugin()
  ]
});
