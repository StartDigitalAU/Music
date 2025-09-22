import { defineConfig } from "vite";

export default defineConfig({
  base: "/Music/",

  build: {
    // Output directory (default is 'dist')
    outDir: "dist",

    // Generate source maps for production debugging (optional)
    sourcemap: false,

    // Minify the output
    minify: "esbuild",

    // Clean the output directory before building
    emptyOutDir: true,
  },

  // Configure the preview server (for local testing)
  preview: {
    port: 4173,
    host: true,
  },
});
