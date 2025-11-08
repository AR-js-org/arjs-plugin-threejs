# arjs-plugin-threejs ✨🧩

<p align="center">
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
  <a href="https://img.shields.io/badge/three.js-0.161.0-000000?style=flat-square">
    <img src="https://img.shields.io/badge/three.js-0.161.0-000000?style=flat-square" alt="Three.js Version">
  </a>
</p>

> 🧪 A Three.js renderer plugin for **AR.js-core**: mounts a WebGL canvas, consumes AR marker + camera events, and exposes per‑marker Three.js `Group` anchors for you to attach content.  
> 🔧 Defaults replicate classic AR.js axis handling.  
> 🚀 Designed for extensibility, testability (renderer injection), and modern ESM builds.

---

## Table of Contents 📚
- [Features](#features-)
- [Install / Build](#install--build-)
- [Quick Start](#quick-start-engine--artoolkit--threejs-plugin-)
- [Events](#events-handled-)
- [Options](#options-)
- [Camera Projection](#camera-projection-)
- [Anchors & Adding Content](#anchors-and-how-to-add-content-)
- [Testing](#testing-)
- [CI](#ci-)
- [Compatibility](#compatibility-)
- [Roadmap Ideas](#roadmap-ideas-)
- [License](#license-)

## Features 🌟
- ✅ Unified handling for `ar:marker`, raw `ar:getMarker`, legacy `ar:markerFound / Updated / Lost`
- 🔄 Automatic AR.js classic axis transform chain (`R_y(π) * R_z(π) * modelViewMatrix * R_x(π/2)`)
- 🧬 Optional experimental path (`invertModelView`, `applyAxisFix`)
- 🪝 Lazy anchor creation (create Three.js `Group` only when a marker first appears)
- 🎛 Debug helpers: scene & per‑anchor `AxesHelper`
- 🧪 Test-friendly: inject your own renderer via `rendererFactory`
- 🏃 Dual render triggers: `engine:update` or `requestAnimationFrame` fallback
- 🛡 Confidence filtering on marker events
- 🧹 Clean disable/dispose lifecycle

## Install / Build 🛠
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
import { Engine, webcamPlugin, defaultProfilePlugin } from 'ar.js-core';
import { ThreeJSRendererPlugin } from '@AR-js-org/arjs-plugin-threejs';

// 1) Engine & core plugins
const engine = new Engine();
engine.pluginManager.register(defaultProfilePlugin.id, defaultProfilePlugin);
engine.pluginManager.register(webcamPlugin.id, webcamPlugin);
const ctx = engine.getContext();
await engine.pluginManager.enable(defaultProfilePlugin.id, ctx);
await engine.pluginManager.enable(webcamPlugin.id, ctx);

// 2) Artoolkit plugin
const { ArtoolkitPlugin } = await import('./vendor/arjs-plugin-artoolkit/arjs-plugin-artoolkit.esm.js');
const artoolkit = new ArtoolkitPlugin({
  cameraParametersUrl: '/path/to/camera_para.dat',
  minConfidence: 0.6,
});
await artoolkit.init(ctx);
await artoolkit.enable();

// 3) Projection
const proj = artoolkit.getProjectionMatrix?.();
const arr = proj?.toArray ? proj.toArray() : proj;
if (Array.isArray(arr) && arr.length === 16) {
  engine.eventBus.emit('ar:camera', { projectionMatrix: arr });
}

// 4) Three.js plugin
const threePlugin = new ThreeJSRendererPlugin({
  container: document.getElementById('viewport'),
  useLegacyAxisChain: true,
  changeMatrixMode: 'modelViewMatrix',
  preferRAF: true,
  // debugSceneAxes: true,
  // debugAnchorAxes: true,
});
await threePlugin.init(engine);
await threePlugin.enable();

// 5) Start engine loop
engine.start();
```

## Events handled 🔔
| Event | Payload | Purpose |
|-------|---------|---------|
| `ar:marker` | `{ id, matrix?, visible? }` | Unified high-level marker pose/visibility |
| `ar:getMarker` | `{ matrix, marker: {...} }` | Raw worker-level pose (plugin extracts ID/confidence) |
| `ar:markerFound / Updated / Lost` | legacy shapes | Adapted internally to `ar:marker` |
| `ar:camera` | `{ projectionMatrix }` | Sets camera projection |
| `engine:update` | any | Optional frame trigger (in addition to RAF) |

## Options ⚙️
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `container` | HTMLElement | `document.body` | Mount target for canvas |
| `preferRAF` | boolean | `true` | Render each RAF even w/o `engine:update` |
| `minConfidence` | number | `0` | Ignore `ar:getMarker` below confidence |
| `useLegacyAxisChain` | boolean | `true` | Use classic AR.js transform chain |
| `changeMatrixMode` | string | `modelViewMatrix` | Or `cameraTransformMatrix` (inverts) |
| `invertModelView` | boolean | `false` | Experimental (disabled if legacy chain on) |
| `applyAxisFix` | boolean | `false` | Experimental axis correction (Y/Z π) |
| `debugSceneAxes` | boolean | `false` | Show `AxesHelper` at scene origin |
| `sceneAxesSize` | number | `2` | Size for scene axes helper |
| `debugAnchorAxes` | boolean | `false` | Add `AxesHelper` per anchor |
| `anchorAxesSize` | number | `0.5` | Size for anchor axes helper |
| `rendererFactory` | function | `null` | Inject custom renderer (testing) |

Classic AR.js chain:
```
finalMatrix = R_y(π) * R_z(π) * modelViewMatrix * R_x(π/2)
```
If `changeMatrixMode === 'cameraTransformMatrix'`, invert at end.

## Camera Projection 🎯
```js
const proj = artoolkit.getProjectionMatrix();
const arr = proj?.toArray ? proj.toArray() : proj;
if (Array.isArray(arr) && arr.length === 16) {
  engine.eventBus.emit('ar:camera', { projectionMatrix: arr });
}
```
Look for log: `Projection applied`.

## Anchors and how to add content 🧱
Anchors are created lazily from the first pose event.

```js
engine.eventBus.on('ar:getMarker', (d) => {
  const id = String(
    d?.marker?.markerId ??
    d?.marker?.id ??
    d?.marker?.pattHandle ??
    d?.marker?.uid ??
    d?.marker?.index ??
    '0'
  );

  // Add content once anchor exists
  setTimeout(() => {
    const anchor = threePlugin.getAnchor(id);
    if (anchor && !anchor.userData._content) {
      anchor.userData._content = true;
      const cube = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.5, 0.5),
        new THREE.MeshBasicMaterial({ color: 0xff00ff })
      );
      cube.position.y = 0.25;
      anchor.add(cube);
    }
  }, 0);

  // Bridge raw to unified
  if (Array.isArray(d?.matrix) && d.matrix.length === 16) {
    engine.eventBus.emit('ar:marker', { id, matrix: d.matrix, visible: true });
  }
});
```

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
- Axis chain vs experimental path
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
  domElement: document.createElement('canvas'),
  setPixelRatio() {},
  setClearColor() {},
  setSize() {},
  render() {},
  dispose() {}
};
const plugin = new ThreeJSRendererPlugin({ rendererFactory: () => fakeRenderer });
```

## CI 🤖
GitHub Actions workflow (`.github/workflows/ci.yml`) runs:
- Install
- Build
- Tests (Node version defined in `.nvmrc` file)
  Badge above shows current status.

## Compatibility 🔄
- Built & tested with Three.js 0.161.x
- Requires AR.js-core engine abstraction with an event bus (`on/off/emit`)
- Should work with any tracking plugin that can emit marker IDs + 4x4 pose matrices

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