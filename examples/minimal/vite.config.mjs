import { defineConfig } from "vite";

export default defineConfig({
  // The artoolkit plugin starts its worker from `new URL('assets/worker-<hash>.js',
  // import.meta.url)`. Vite's dev pre-bundling moves the plugin's module into
  // node_modules/.vite/deps, where that relative URL no longer resolves, so
  // the plugin is served as published instead.
  optimizeDeps: {
    exclude: ["@ar-js-org/arjs-plugin-artoolkit"],
  },
  resolve: {
    // The renderer is linked from the repository root (file:../..), whose
    // node_modules has its own copy of three. One copy, or the example's
    // meshes and the renderer's scene come from two different Three.js.
    dedupe: ["three"],
  },
  server: {
    port: 3000,
    open: true,
  },
});
