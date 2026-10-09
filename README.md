# arjs-plugin-threejs ✨🧩

<p style="text-align: center;">
  <a href="https://github.com/AR-js-org/arjs-plugin-threejs/stargazers">
    <img src="https://img.shields.io/github/stars/AR-js-org/arjs-plugin-threejs?style=flat-square" alt="GitHub Stars">
  </a>
  <a href="https://github.com/AR-js-org/arjs-plugin-threejs/network/members">
    <img src="https://img.shields.io/github/forks/AR-js-org/arjs-plugin-threejs?style=flat-square" alt="GitHub Forks">
  </a>
  <a href="https://github.com/AR-js-org/arjs-plugin-threejs/actions/workflows/CI.yml">
    <img src="https://github.com/AR-js-org/arjs-plugin-threejs/actions/workflows/CI.yml/badge.svg" alt="CI Status">
  </a>
  <a href="https://github.com/AR-js-org/arjs-plugin-threejs/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/AR-js-org/arjs-plugin-threejs?style=flat-square" alt="License">
  </a>
  <a href="https://github.com/AR-js-org/arjs-plugin-threejs/issues">
    <img src="https://img.shields.io/github/issues/AR-js-org/arjs-plugin-threejs?style=flat-square" alt="Open Issues">
  </a>
  <a href="https://threejs.org/">
    <img src="https://img.shields.io/badge/three.js-0.186-000000?style=flat-square" alt="Three.js Version">
  </a>
</p>

> 🧪 A Three.js renderer plugin for **AR.js-next**: mounts a WebGL canvas, consumes AR marker + camera events, and exposes per‑marker Three.js `Group` anchors for you to attach content.  
> 🔧 Defaults match the poses arjs-plugin-artoolkit emits; the classic AR.js axis chain is one option away.  
> 🚀 Designed for extensibility, testability (renderer injection), and modern ESM builds.

What changed in each release, including every breaking change, is in [CHANGELOG.md](https://github.com/AR-js-org/arjs-plugin-threejs/blob/main/CHANGELOG.md).

---

## Table of Contents 📚

- [Features](#features-)
- [Install / Build](#install--build-)
- [Quick Start](#quick-start-engine--artoolkit--threejs-plugin-)
- [Events](#events-handled-)
- [Options](#options-)
- [Camera Projection](#camera-projection-)
- [Anchors & Adding Content](#anchors-and-how-to-add-content-)
- [Upgrading to 0.2.0](#upgrading-to-020-%EF%B8%8F)
- [Testing](#testing-)
- [CI](#ci-)
- [Compatibility](#compatibility-)
- [Roadmap Ideas](#roadmap-ideas-)
- [License](#license-)

## Features 🌟

- ✅ Handles `ar:markerFound / Updated / Lost` from arjs-plugin-artoolkit, and the unified `ar:marker`
- 🏷 Anchors keyed `type:markerId`, so pattern and barcode markers with the same ID stay apart
- 🎯 Applies the AR camera projection from `ar:camera`, and keeps it across resizes
- 🔄 `matrixConvention`: WebGL poses as is, or the classic AR.js axis chain (`'legacy'`)
- 🧮 Plain or typed-array matrices (`Float32Array`)
- 🪝 Lazy anchor creation (create Three.js `Group` only when a marker first appears)
- 🎛 Debug helpers: scene & per‑anchor `AxesHelper`
- 🧪 Test-friendly: inject your own renderer via `rendererFactory`
- 🏃 Dual render triggers: `engine:update` or `requestAnimationFrame` fallback
- 🛡 Confidence filtering on marker events
- 🧹 Clean disable/dispose lifecycle

## Install / Build 🛠

> Note: the `dist` and `types` folders are not committed. If you modify the source, run `npm install`, then rebuild with `npm run build:vite` and `npm run build:types` before using the package or publishing.

```bash
npm run build:vite
```

Outputs:

- ESM: `dist/arjs-plugin-threejs.mjs`
- CJS: `dist/arjs-plugin-threejs.js`
- Source maps included

Serve the example (choose one):

```bash
# If example has its own dev scripts
cd examples/minimal
npm i
npm run dev

# OR from repo root (so relative dist path works)
npx http-server .
# Open: http://localhost:8080/examples/minimal/
```

## Quick start (Engine + Artoolkit + Three.js plugin) 🚀

```js
import * as THREE from "three";
import {
  Engine,
  EVENTS,
  webcamPlugin,
  defaultProfilePlugin,
} from "@ar-js-org/ar.js-next";
import { ArtoolkitPlugin } from "@ar-js-org/arjs-plugin-artoolkit";
import { ThreeJSRendererPlugin } from "@ar-js-org/arjs-plugin-threejs";
import wasmUrl from "@ar-js-org/artoolkit5-wasm/dist/artoolkit5.wasm?url";

// 1) Engine and core plugins
const engine = new Engine();
const ctx = engine.getContext();
engine.pluginManager.register(defaultProfilePlugin.id, defaultProfilePlugin);
engine.pluginManager.register(webcamPlugin.id, webcamPlugin);
await engine.pluginManager.enable(defaultProfilePlugin.id, ctx);
await engine.pluginManager.enable(webcamPlugin.id, ctx);

// 2) Three.js plugin, enabled before detection so it hears ar:camera
const threePlugin = new ThreeJSRendererPlugin({
  container: document.getElementById("viewport"),
});
await threePlugin.init(engine);
await threePlugin.enable();

// 3) Detection
const artoolkit = new ArtoolkitPlugin({
  wasmUrl,
  cameraParametersUrl: "/data/camera_para.dat",
});
engine.pluginManager.register("artoolkit", artoolkit);
await engine.pluginManager.enable("artoolkit", ctx);
await artoolkit.enable();

// 4) Content: a cube on each marker, added on its first sighting
engine.eventBus.on(EVENTS.MARKER_FOUND, ({ markerId, type }) => {
  const anchor = threePlugin.getAnchor(markerId, type);
  if (anchor && !anchor.userData.content) {
    anchor.userData.content = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshNormalMaterial(),
    );
    anchor.add(anchor.userData.content);
  }
});

engine.start();
// Start the webcam, then: await artoolkit.loadMarker("/data/patt.hiro", 1);
```

The renderer creates anchors from `ar:markerFound`, and it subscribes before
your listener, so the anchor exists when your handler runs. With Vite, exclude
the artoolkit plugin from dependency pre-bundling (`optimizeDeps.exclude`), or
its worker URL breaks.

## Events handled 🔔

| Event                                | Payload                                                          | Purpose                                                  |
| ------------------------------------ | ---------------------------------------------------------------- | -------------------------------------------------------- |
| `ar:markerFound`, `ar:markerUpdated` | `{ markerId, type, matrix, confidence, vertex, dir, timestamp }` | Creates or moves the anchor `type:markerId`, shows it    |
| `ar:markerLost`                      | `{ markerId, type, timestamp }`                                  | Hides that anchor                                        |
| `ar:camera`                          | `{ projectionMatrix, width?, height?, timestamp? }`              | Sets the camera projection                               |
| `ar:marker`                          | `{ id or markerId, type?, matrix?, visible? }`                   | The renderer's own unified event, same handling          |
| `engine:update`                      | any                                                              | Optional render trigger, besides `requestAnimationFrame` |

Matrices may be plain arrays or typed arrays of sixteen numbers;
arjs-plugin-artoolkit sends `Float32Array`. The 0.1.x field names (`id`,
`transformationMatrix`, `modelViewMatrix`, `poseMatrix`) are still read when
the new ones are absent, and a payload without `type` counts as `pattern`.

## Options ⚙️

| Option             | Type                                             | Default           | Description                                                  |
| ------------------ | ------------------------------------------------ | ----------------- | ------------------------------------------------------------ |
| `container`        | `HTMLElement`                                    | `document.body`   | Mount target for the canvas                                  |
| `preferRAF`        | `boolean`                                        | `true`            | Render on each animation frame, even without `engine:update` |
| `minConfidence`    | `number`                                         | `0`               | Ignore found/updated events below this confidence            |
| `matrixConvention` | `'webgl'` or `'legacy'`                          | `'webgl'`         | How a pose maps onto an anchor (below)                       |
| `changeMatrixMode` | `'modelViewMatrix'` or `'cameraTransformMatrix'` | `modelViewMatrix` | `'legacy'` only: invert the final matrix                     |
| `invertModelView`  | `boolean`                                        | `false`           | `'webgl'` only: invert the pose                              |
| `applyAxisFix`     | `boolean`                                        | `false`           | `'webgl'` only: rotate by Y and Z π                          |
| `debugSceneAxes`   | `boolean`                                        | `false`           | Show an `AxesHelper` at the scene origin                     |
| `sceneAxesSize`    | `number`                                         | `2`               | Size of the scene axes helper                                |
| `debugAnchorAxes`  | `boolean`                                        | `false`           | Add an `AxesHelper` to each anchor                           |
| `anchorAxesSize`   | `number`                                         | `0.5`             | Size of the anchor axes helper                               |
| `rendererFactory`  | `Function` or `null`                             | `null`            | Inject a custom renderer (testing)                           |

`matrixConvention: 'webgl'` uses the pose as is: arjs-plugin-artoolkit 0.2.0
and later emit it in the WebGL/Three.js convention. `'legacy'` applies the
classic AR.js chain, for artoolkit5-js poses:

```
finalMatrix = R_y(π) * R_z(π) * modelViewMatrix * R_x(π/2)
```

With `changeMatrixMode: 'cameraTransformMatrix'` the result is inverted.
`useLegacyAxisChain` (0.1.x) is still accepted with a warning: `true` means
`'legacy'`, `false` means `'webgl'`.

## Camera Projection 🎯

arjs-plugin-artoolkit 0.4.0 and later emit `ar:camera` with the projection
ARToolKit computes from `camera_para.dat`, once the first frame reaches the
detector. This plugin applies it on its own. If you enable the renderer after
that, apply it yourself:

```js
const projectionMatrix = artoolkit.getProjectionMatrix();
if (projectionMatrix) {
  engine.eventBus.emit("ar:camera", { projectionMatrix });
}
```

Once an AR projection is set, a window resize only resizes the canvas: the
projection stays.

## Anchors and how to add content 🧱

Anchors are `THREE.Group`s created on a marker's first `ar:markerFound`, keyed
`type:markerId`. Pattern and barcode IDs both start at 0, so pass the type for
barcodes:

```js
const hiro = threePlugin.getAnchor(0); // pattern 0
const barcode = threePlugin.getAnchor(0, "barcode"); // barcode 0
```

`anchor.userData` holds the last detection, `{ markerId, type, confidence,
vertex, dir }`, and keeps any keys you add. The anchor is hidden on
`ar:markerLost` and shown again on the next sighting.

## Upgrading to 0.2.0 ⬆️

Two breaking changes, both to match arjs-plugin-artoolkit 0.2.0 and later.

**1. `matrixConvention` replaces `useLegacyAxisChain`, and defaults to `'webgl'`.**
The old default applied the classic AR.js chain, which is wrong for the poses
artoolkit now emits.

```js
// 0.1.x
new ThreeJSRendererPlugin({ useLegacyAxisChain: true });
// 0.2.0, with artoolkit5-js poses
new ThreeJSRendererPlugin({ matrixConvention: "legacy" });
// 0.2.0, with arjs-plugin-artoolkit >= 0.2.0: the default
new ThreeJSRendererPlugin({});
```

**2. Anchors are keyed by family; `getAnchor(id)` means the pattern marker.**
`ar:getMarker` is no longer handled. Anchor names follow the key, from
`marker-<id>` to `marker-<type>:<id>`, and so do the keys of `plugin.anchors`:
look anchors up with `getAnchor` rather than by name.

```js
// 0.1.x: bridge ar:getMarker, look the anchor up by id alone
threePlugin.getAnchor("0");
// 0.2.0: listen to the marker events, pass the type for barcodes
engine.eventBus.on("ar:markerFound", ({ markerId, type }) => {
  const anchor = threePlugin.getAnchor(markerId, type);
});
```

Also new: typed-array matrices, `ar:camera` from arjs-plugin-artoolkit 0.4.0,
`anchor.userData` with the detection's `confidence`, `vertex`, `dir` and `type`,
`minConfidence` applying to `ar:markerFound` and `ar:markerUpdated`, and
exported types (`MarkerEventPayload`, `MatrixConvention`, …).

## Testing 🧪

Run tests:

```bash
npm test
```

Watch:

```bash
npm run test:watch
```

Coverage includes:

- Axis chain vs. experimental path
- Inversion & axis fix effects
- Confidence filtering
- Anchor lifecycle (create, reuse, visibility)
- RAF fallback vs engine:update
- Projection & inverse
- Disable/Dispose cleanup
- Debug helpers presence
- Matrix invariants (`matrixAutoUpdate=false`)

Test renderer injection example:

```js
const fakeRenderer = {
  domElement: document.createElement("canvas"),
  setPixelRatio() {},
  setClearColor() {},
  setSize() {},
  render() {},
  dispose() {},
};
const plugin = new ThreeJSRendererPlugin({
  rendererFactory: () => fakeRenderer,
});
```

## CI 🤖

GitHub Actions workflow (`.github/workflows/CI.yml`) runs:

- Install
- Build
- Type declarations (`build:types`, `test:types`)
- Formatting check
- Tests (Node version defined in `.nvmrc` file)
  Badge above shows current status.

## Type Definitions 🔤🧾

TypeScript declarations are generated from the JSDoc into `types/` and
resolved through `package.json` `exports`. The package exports the payload and
option types:

```ts
import type {
  MarkerType,
  MarkerEventPayload,
  MarkerLostPayload,
  CameraEventPayload,
  MatrixConvention,
  ThreeJSRendererPluginOptions,
  AnchorUserData,
} from "@ar-js-org/arjs-plugin-threejs";
```

`getAnchor` returns a `THREE.Group`, typed through `@types/three`. `three`
ships no declarations, so TypeScript consumers install `@types/three` too
(an optional peer dependency); without it `getAnchor` resolves to `any`.
`npm run test:types` compiles a consumer-style file against the built
declarations, and CI runs it.

## Compatibility 🔄

- Peer dependencies: `three` 0.182 or later (tested with 0.186), and
  `@ar-js-org/ar.js-next` ^0.2.0 as an optional peer: its engine provides the
  event bus (`on/off/emit`), but any bus with that interface works
- Marker events from `@ar-js-org/arjs-plugin-artoolkit` 0.2.0 or later;
  `ar:camera` needs 0.4.0
- Should work with any tracking plugin that emits the same marker payloads

## Roadmap Ideas 🧭

- 🔌 Additional renderer plugins (Babylon / PlayCanvas)
- 🧷 Multi-marker composition helpers
- 🌀 Pose smoothing module (optional add-on)
- 💡 Example gallery with animated models & GLTF loader integration
- 🧪 Visual regression tests (screenshot-based) in CI

## License 📄

MIT © AR.js Org

---

Made with ❤️ for Web AR. Contributions welcome! Open an issue / PR 🛠
