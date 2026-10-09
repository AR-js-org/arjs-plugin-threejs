# Phase C: arjs-plugin-threejs 0.2.0 (and `ar:camera` in arjs-plugin-artoolkit) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make arjs-plugin-threejs render 3D content on the poses arjs-plugin-artoolkit 0.3.0+ emits (typed matrices, `type:markerId` identity, WebGL convention, AR projection), and make the artoolkit plugin publish that projection as `ar:camera`.

**Architecture:** Two repositories, two PRs that can proceed in parallel. Part 1 (arjs-plugin-artoolkit, milestone v0.4.0) adds a worker `camera` message carrying artoolkit5-ts's `getCameraProjectionMatrix`, re-emitted as `ar:camera`. Part 2 (arjs-plugin-threejs, milestone v0.2.0) normalises marker payloads into one internal shape keyed `type:markerId`, accepts typed arrays, replaces the axis-chain flags with `matrixConvention`, and drops the `ar:getMarker` bridge. Part 3, the npm-based example and its visual check, waits for artoolkit 0.4.0 and AR.js-next 0.2.1 on npm.

**Tech Stack:** ESM JavaScript with JSDoc, three.js, Vite library builds, Vitest (jsdom in threejs; mocked artoolkit5-ts in artoolkit), tsc for declarations.

**Spec:** `AR.js-next/docs/plans/2026-10-05-artoolkit-0.2.0-upgrade.md`, "Phase C", plus the `ar:camera` prerequisite agreed on 2026-10-09: artoolkit 0.3.0 exposes no projection matrix, so 3D cannot overlay the marker without it.

## Global Constraints

- Branches: artoolkit `feat/ar-camera-event` from `dev`; threejs `feat/threejs-0.2.0` from `dev` **after threejs PR #6 is merged**. PRs target `dev`. Never commit to `main`. Never pass `--author`.
- Conventional Commits; breaking threejs commits take `!` and a `BREAKING CHANGE:` footer.
- Every user-visible change adds a `[Unreleased]` entry to that repo's `CHANGELOG.md` (threejs creates the file: issue #7).
- Marker payload contract (AR.js-next `AGENTS.md`): found/updated `{ markerId, type, matrix: Float32Array(16), confidence, vertex, dir, timestamp }`; lost `{ markerId, type, timestamp }`. `type` is `'pattern' | 'barcode'`; identity is `` `${type}:${markerId}` ``.
- `matrix` is 4x4 column-major, right-handed, ready for `THREE.Matrix4.fromArray()` (artoolkit5-ts `matrixGL`). The matching projection is artoolkit5-ts `getCameraProjectionMatrix(state)`.
- threejs: `three` stays external to the bundle. No new runtime dependencies in either repo.
- No release is cut in either repo by this plan.

## Review Focus

1. **A window resize after `ar:camera`** must not replace the AR projection with a generic perspective one (today `_resizeToContainer` calls `camera.updateProjectionMatrix()`). Test in Task 4.
2. **A `Float32Array` matrix that is a reused view** (artoolkit5-ts reuses its buffers): the anchor must copy values, and `userData.vertex` must not alias the payload. Test in Task 5.
3. **`ar:markerLost` arriving for a marker never found**, or after `dispose()`: no throw, no anchor created. Test in Task 5.
4. **A legacy payload with no `type`** (`{ id, transformationMatrix }`): it lands on `pattern:<id>` and `getAnchor(id)` finds it. Test in Task 5.
5. **`ar:camera` emitted before the threejs plugin is enabled**: the app must still be able to apply it, so artoolkit exposes `getProjectionMatrix()` for late subscribers. Test in Task 1.

---

## Part 1: arjs-plugin-artoolkit (`D:/kalwalt-github/arjs-plugin-artoolkit`)

### Task 1: Publish the camera projection as `ar:camera`

**Files:**

- Modify: `src/detector/artoolkit-detector.js` (import `getCameraProjectionMatrix`; cache it when the state is created; add `getProjectionMatrix` to the returned object and the `Detector` typedef)
- Modify: `src/worker/worker.js` (send `camera` once per detector, after `ensureReady` succeeds in `processFrame`; reset on `init` and `dispose`)
- Modify: `src/plugin.js` (handle `camera`; store; emit `ar:camera`; public `getProjectionMatrix()`)
- Test: `tests/detector.spec.ts`, `tests/worker.spec.ts`, `tests/plugin.events.spec.ts`
- Docs: `AGENTS.md` (protocol table: worker → main `camera` `{ projectionMatrix, width, height }`; event table: `ar:camera` `{ projectionMatrix, width, height, timestamp }`), `README.md` event table, `CHANGELOG.md` `[Unreleased]` → Added

**Interfaces:**

- Produces: `detector.getProjectionMatrix(): Float64Array | null` (null before the state exists).
- Produces: worker message `{ type: "camera", payload: { projectionMatrix: number[16], width, height } }`, sent once per detector instance.
- Produces: event `ar:camera` `{ projectionMatrix: Float32Array(16), width: number, height: number, timestamp: number }`; `plugin.getProjectionMatrix(): Float32Array | null` returns a fresh copy.

- [ ] **Step 1: Write the failing tests**
  - detector: `getProjectionMatrix returns null before ensureReady and the artoolkit5-ts matrix after` — mock `getCameraProjectionMatrix` (add it to `mocks`) returning `Float64Array.from({length:16},(_, i) => i)`; assert `null`, then after `await d.ensureReady(640, 480)` the same values, and `getCameraProjectionMatrix` called once with the created state.
  - worker: `sends camera once, after the first frame readies the detector` — two `processFrame` messages; assert exactly one posted `{ type: "camera" }` whose payload has `projectionMatrix` of length 16, `width: 640`, `height: 480`, and that it precedes the first `detectionResult`. Extend the fake `detector` with `getProjectionMatrix`.
  - worker: `a skipped frame sends no camera` — `processFrame` without `imageBitmap`; no `camera` posted.
  - plugin: `emits ar:camera with a Float32Array and remembers it` — `plugin._onWorkerMessage({ data: { type: "camera", payload: { projectionMatrix: [...16], width: 640, height: 480 } } })`; assert the event payload's `projectionMatrix` is a `Float32Array` of 16 with the values, `width`/`height`, a numeric `timestamp`; `getProjectionMatrix()` equals it and is not the same object as the emitted one.
  - plugin: `getProjectionMatrix is null before any camera message`.
- [ ] **Step 2: Run** `npx vitest run tests/detector.spec.ts tests/worker.spec.ts tests/plugin.events.spec.ts` — Expected: the new tests FAIL (`getProjectionMatrix is not a function`, no `camera` message, no event).
- [ ] **Step 3: Implement** as in Interfaces. The detector computes the projection right after `state = created`, before readiness is published. The worker keeps a `cameraSent` flag, set when posted and cleared when `init` builds a new detector or on `dispose`.
- [ ] **Step 4: Run** `npm test`, `npm run lint`, `npm run format:check`, `npm run build && npm run build:types` — Expected: all green.
- [ ] **Step 5: Commit** `feat: publish the camera projection as ar:camera`, then open the issue (milestone v0.4.0) and the PR to `dev` with `Closes #<issue>`.

---

## Part 2: arjs-plugin-threejs (`D:/kalwalt-github/arjs-plugin-threejs`)

### Task 2: In-range dependency updates

**Files:** `package.json`, `package-lock.json`

- [ ] **Step 1:** Bump within majors: vitest and @vitest/coverage-v8 → ^4.1.11, vite → ^7.3.7, prettier → ^3.9.9, jsdom → ^27.4.0, eslint → ^9.39.5, three → ^0.186.0. Install with npm 11 (`npx -y npm@11 install` if Node 22's npm 10.9 crashes in arborist).
- [ ] **Step 2: Run** `npm test`, `npm run build`, `npm audit` — Expected: green, 0 vulnerabilities. If three 0.186 breaks a test, record what and stay on the last passing 0.18x.
- [ ] **Step 3: Commit** `chore(deps): update dev dependencies within their majors`.

### Task 3: One normalised marker shape, keyed `type:markerId`

**Files:**

- Create: `src/marker.js`
- Test: `test/marker.test.js`

**Interfaces:**

- Produces: `toMatrix16(value: unknown): ArrayLike<number> | null` — returns `value` when `(Array.isArray(value) || ArrayBuffer.isView(value)) && value.length === 16`, else `null`.
- Produces: `markerKey(markerId: number | string, type?: 'pattern' | 'barcode'): string` — `` `${type ?? 'pattern'}:${markerId}` ``.
- Produces: `normalizeMarker(payload: object, visible: boolean): { key, markerId, type, matrix, visible, confidence, vertex, dir } | null` — new field names first (`markerId`, `type`, `matrix`), then legacy (`id`, `transformationMatrix`, `modelViewMatrix`, `poseMatrix`); `markerId` is a string; `type` defaults to `'pattern'`; `matrix` goes through `toMatrix16`; returns `null` when no id is present.

- [ ] **Step 1: Write the failing tests** in `test/marker.test.js`:
  - `toMatrix16 accepts Array, Float32Array and Float64Array of 16 and rejects other lengths and non-arrays`.
  - `markerKey keeps pattern 0 and barcode 0 apart` — `markerKey(0,'pattern') !== markerKey(0,'barcode')`; `markerKey(3) === 'pattern:3'`.
  - `normalizeMarker reads the 0.3.0 payload` — `{ markerId: 0, type: 'barcode', matrix: new Float32Array(16), confidence: 0.8, vertex: [[0,0],[1,0],[1,1],[0,1]], dir: 2 }` → `key: 'barcode:0'`, `markerId: '0'`, the same values.
  - `normalizeMarker falls back to legacy names` — `{ id: 5, transformationMatrix: [..16] }` → `key: 'pattern:5'`, `matrix` length 16.
  - `normalizeMarker returns null without an id`.
- [ ] **Step 2: Run** `npx vitest run test/marker.test.js` — Expected: FAIL (module not found).
- [ ] **Step 3: Implement** `src/marker.js` with the three exports and JSDoc.
- [ ] **Step 4: Run** the same command — Expected: PASS.
- [ ] **Step 5: Commit** `feat: normalise marker payloads into one shape keyed type:markerId`.

### Task 4: `matrixConvention`, typed projections, and a resize that keeps the AR projection

**Files:**

- Modify: `src/threejs-renderer-plugin.js` (constructor options, `handleUnifiedMarker` transform branch, `handleCamera`, `_resizeToContainer`)
- Test: `test/test_threejs-renderer-plugin.convention.test.js` (new); update `test/test_threejs-renderer-plugin.extra.test.js` and `.experimental.test.js` to the new option

**Interfaces:**

- Consumes: `toMatrix16` (Task 3).
- Produces: option `matrixConvention: 'webgl' | 'legacy'`, default `'webgl'`. `'webgl'` uses the matrix as is (still honouring `invertModelView`/`applyAxisFix`, today's "experimental" path); `'legacy'` applies `R_y(π)·R_z(π)·M·R_x(π/2)` and `changeMatrixMode`. `useLegacyAxisChain` is removed. If passed, it maps `true` → `'legacy'` and `false` → `'webgl'` with one `console.warn` naming `matrixConvention`.
- Produces: options built so that an explicitly `undefined` value does not override a default (fixes the "`...options` after defaults" known issue).

- [ ] **Step 1: Write the failing tests** (`convention.test.js`):
  - `defaults to the webgl convention: anchor.matrix equals the incoming matrix` — a translation `makeTranslation(1,2,-5)` as `Float32Array`; anchor `position` is `(1,2,-5)`.
  - `legacy convention applies the axis chain` — same input with `matrixConvention: 'legacy'`; position differs from `(1,2,-5)`.
  - `useLegacyAxisChain: true maps to legacy and warns once`.
  - `matrixConvention: undefined keeps the webgl default`.
  - `ar:camera accepts a Float32Array projection` — `elements[0]` and `[10]` set.
  - `a resize after ar:camera keeps the AR projection` — emit `ar:camera`, then `window.dispatchEvent(new Event('resize'))`; `projectionMatrix.elements` unchanged; the renderer's `setSize` was called.
  - `a resize before any ar:camera still updates the perspective camera aspect`.
- [ ] **Step 2: Run** `npx vitest run test/test_threejs-renderer-plugin.convention.test.js` — Expected: FAIL.
- [ ] **Step 3: Implement.** `handleCamera` uses `toMatrix16` and sets `this._hasArProjection = true`; `_resizeToContainer` always calls `setSize`, and changes `aspect` and calls `updateProjectionMatrix()` only while `!this._hasArProjection`.
- [ ] **Step 4: Run** `npm test` — Expected: all PASS, with the old tests migrated off `useLegacyAxisChain`.
- [ ] **Step 5: Commit** `feat!: matrixConvention defaults to webgl; accept typed projections` with `BREAKING CHANGE: useLegacyAxisChain is replaced by matrixConvention ('webgl' | 'legacy'), and the default is now 'webgl' to match arjs-plugin-artoolkit >= 0.2.0. Pass matrixConvention: 'legacy' for artoolkit5-js poses.`

### Task 5: Anchors keyed by family, metadata on `userData`, no `ar:getMarker`

**Files:**

- Modify: `src/threejs-renderer-plugin.js` (`enable`/`disable` subscriptions, `_adaptLegacy` → `normalizeMarker`, `handleUnifiedMarker`, `getAnchor`; delete `handleRawGetMarker` and the `ar:getMarker` subscription)
- Test: `test/test_threejs-renderer-plugin.anchors.test.js` (new); migrate the `ar:getMarker` tests in the three existing files to `ar:markerFound`

**Interfaces:**

- Consumes: `normalizeMarker`, `markerKey`, `toMatrix16` (Task 3).
- Produces: `getAnchor(markerId: number | string, type: 'pattern' | 'barcode' = 'pattern'): THREE.Group | undefined`. Anchors are stored under `markerKey`, and anchor names are `marker-<type>:<id>`.
- Produces: `anchor.userData` `{ markerId: string, type, confidence, vertex, dir }`, updated on every found/updated event. `vertex` is a copy.
- Produces: `minConfidence` applies to `ar:markerFound`/`ar:markerUpdated`: below it, the event is ignored and no anchor is created.
- `ar:marker` (unified) is kept and goes through `normalizeMarker` too.

- [ ] **Step 1: Write the failing tests** (`anchors.test.js`):
  - `pattern 0 and barcode 0 get distinct anchors` (#5) — found `{markerId:0,type:'pattern'}` and `{markerId:0,type:'barcode'}`; `getAnchor(0)` and `getAnchor(0,'barcode')` are different groups.
  - `a Float32Array pose positions the anchor` — `makeTranslation(0,0,-3)` as `Float32Array`; `position.z === -3`.
  - `the anchor copies a reused matrix buffer` — mutate the `Float32Array` after the event; `anchor.matrix.elements` keep the old values.
  - `userData carries confidence, vertex, dir and type, and vertex is a copy`.
  - `markerLost with type hides only that family's anchor`.
  - `markerLost for an unknown marker creates nothing and does not throw`; same after `dispose()`.
  - `a legacy payload without type lands on pattern and getAnchor(id) finds it` — `{ id: 4, transformationMatrix: [...16] }`.
  - `minConfidence filters markerFound`.
  - `ar:getMarker is no longer handled` — emitting it creates no anchor.
- [ ] **Step 2: Run** `npx vitest run test/test_threejs-renderer-plugin.anchors.test.js` — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test` — Expected: all PASS.
- [ ] **Step 5: Commit** `feat!: key anchors by type:markerId and drop the ar:getMarker bridge` with `BREAKING CHANGE: getAnchor(id) now means the pattern marker id; pass getAnchor(id, 'barcode') for barcodes. ar:getMarker is no longer handled; listen to ar:markerFound/Updated/Lost.` and `Closes #5`.

### Task 6: Types, exports and peer dependencies

**Files:**

- Modify: `src/threejs-renderer-plugin.js` and `src/marker.js` (JSDoc typedefs `MarkerType`, `MarkerEventPayload`, `MarkerLostPayload`, `CameraEventPayload`, `MatrixConvention`, `AnchorUserData`), `src/index.js` (re-export the typedefs as `@typedef {import(...)}` and export `THREEJS_RENDERER_PLUGIN_VERSION`)
- Modify: `package.json`: `exports["."]` gains a first `"types": "./types/index.d.ts"` condition; `peerDependencies` `{ "three": ">=0.182.0", "@ar-js-org/ar.js-next": "^0.2.0" }`; new script `"test:types": "tsc -p test/typecheck"`
- Create: `test/typecheck/tsconfig.json` (`noEmit`, `strict`, `module: esnext`, `moduleResolution: bundler`, `lib: [es2022, dom]`, `types: []`), `test/typecheck/public-types.ts`
- Modify: `.github/workflows/CI.yml`: a "Type declarations" step running `npm run build:types && npm run test:types`

- [ ] **Step 1: Write** `public-types.ts`. It imports `ThreeJSRendererPlugin` and `type { MarkerEventPayload, MarkerType, MatrixConvention }` from `@ar-js-org/arjs-plugin-threejs`. It constructs the plugin with `matrixConvention: 'webgl'`, and has a `// @ts-expect-error` on `matrixConvention: 'left'` and on `const t: MarkerType = 'qr'`. It also calls `plugin.getAnchor(0, 'barcode')`.
- [ ] **Step 2: Run** `npm run build:types && npm run test:types` — Expected: FAIL (types not resolved through `exports`, or names missing).
- [ ] **Step 3: Implement** the typedefs, re-exports and `package.json` changes.
- [ ] **Step 4: Run** the same — Expected: PASS. Also `npm test`.
- [ ] **Step 5: Commit** `feat: export the marker and camera types and declare peer dependencies`.

### Task 7: Docs and CHANGELOG

**Files:** `README.md` (event table without `ar:getMarker`; options table with `matrixConvention`; new section "Upgrading to 0.2.0" listing the two breaking changes with before/after code; Camera Projection section pointing to artoolkit's `ar:camera` and `getProjectionMatrix()`), `AGENTS.md` (events table, invariants marked done, fixed known issues removed), `CHANGELOG.md` (new; Keep a Changelog; `[Unreleased]` planned as 0.2.0 with Added, Changed and **Breaking** entries, plus a `[0.1.1]` stub), and `MAINTAINERS.md` if PR #6 added it (changelog steps as in artoolkit #47).

- [ ] **Step 1:** Write the docs. `npm run format:check` — Expected: clean.
- [ ] **Step 2: Commit** `docs: changelog, upgrade guide and agent instructions for 0.2.0` with `Closes #7`. Open the PR to `dev`, milestone v0.2.0, saying which parts wait for Part 3.

---

## Part 3: Example and visual verification (after artoolkit 0.4.0 and AR.js-next 0.2.1 are on npm)

### Task 8: npm-based `examples/minimal` with a barcode object

**Files:** `examples/minimal/` — delete `vendor/`; `package.json` deps `"@ar-js-org/arjs-plugin-threejs": "file:../.."`, `"@ar-js-org/ar.js-next": "^0.2.1"`, `"@ar-js-org/arjs-plugin-artoolkit": "^0.4.0"`, `"@ar-js-org/artoolkit5-wasm": "^0.4.1"`, `"three": "^0.186.0"`, dev `"vite": "^8.3.4"`; `vite.config.mjs` with `optimizeDeps.exclude: ['@ar-js-org/arjs-plugin-artoolkit']`; `public/data/{camera_para.dat,patt.hiro}`; `main.js` rewritten like AR.js-next `examples/vite-artoolkit/src/main.js` (EVENTS constants, `pluginManager.register/enable`, `loadMarker` + `trackBarcode` once frames flow), plus a cube on `getAnchor(0)` (Hiro) and a sphere on `getAnchor(0, 'barcode')`. `ar:camera` comes straight from the artoolkit plugin, with a fallback to `artoolkit.getProjectionMatrix()` if threejs enabled late. `examples/minimal/AGENTS.md` and README updated.

- [ ] **Step 1:** `npm --prefix examples/minimal ci && npm --prefix examples/minimal run build` — Expected: builds, with an `artoolkit5-*.wasm` asset emitted.
- [ ] **Step 2:** A CI step "Build minimal example" after the library build.
- [ ] **Step 3: Manual check (the user, with the webcam):** the cube sits on Hiro and the sphere on barcode 0 at the same time, both follow rotation and tilt, and each hides on `ar:markerLost`. Resizing the window keeps them aligned. If the pose is mirrored or flipped, the matrix convention is wrong: report it, do not patch the example.
- [ ] **Step 4: Commit** `feat(examples): npm-based minimal example with Hiro and barcode objects`.
- [ ] **Step 5:** Apply the same update to `AR.js-next-examples/vite-example`, on a branch with a PR to its `main`, since that repo has no `dev`.
