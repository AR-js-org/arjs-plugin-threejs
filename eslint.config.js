import js from "@eslint/js";
import globals from "globals";
import prettier from "eslint-config-prettier";

export default [
  {
    ignores: [
      "dist/",
      "types/",
      "coverage/",
      "node_modules/",
      "examples/**/vendor/**",
      "examples/**/node_modules/**",
      "examples/**/dist/**",
    ],
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        // Injected by vite.config.mjs / vitest.config.mjs `define`.
        __THREEJS_RENDERER_PLUGIN_VERSION__: "readonly",
      },
    },
    rules: {
      // try { ... } catch {} is used for best-effort emitter calls.
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
  prettier,
];
