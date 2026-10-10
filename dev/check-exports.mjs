/**
 * Loads the built package by its own name, the way consumers do, through each
 * entry point `package.json` declares: `require()` and `import()`.
 *
 * A self-reference resolves through `exports`, and each target is loaded under
 * the package's `"type"`, so this sees what a CommonJS or ESM consumer sees. A
 * CommonJS build named `.js` under `"type": "module"` is loaded as ESM, and
 * `require()` then returns an empty object without throwing (#19).
 *
 * Run via `npm run test:exports`, after `npm run build:vite`.
 */

import { createRequire } from "node:module";

const NAME = "@ar-js-org/arjs-plugin-threejs";
const EXPECTED = ["THREEJS_RENDERER_PLUGIN_VERSION", "ThreeJSRendererPlugin"];

const require = createRequire(import.meta.url);

const entryPoints = {
  "require()": () => require(NAME),
  "import()": () => import(NAME),
};

let failed = false;
for (const [how, load] of Object.entries(entryPoints)) {
  const mod = await load();
  const missing = EXPECTED.filter((name) => mod[name] === undefined);
  if (missing.length) {
    failed = true;
    console.error(`${how}: missing ${missing.join(", ")}`);
  } else {
    console.log(`${how}: ${EXPECTED.join(", ")}`);
  }
}

if (failed) process.exit(1);
