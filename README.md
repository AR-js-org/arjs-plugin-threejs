# @AR-js-org/arjs-plugin-threejs

Three.js renderer plugin for AR.js-core.

This plugin mounts a Three.js renderer into your app, listens to AR marker/camera events from AR.js-core (e.g., Artoolkit), maintains one Three.js Group “anchor” per marker ID, and renders a scene on each engine tick (or via requestAnimationFrame fallback).

- Renderer-agnostic AR.js-core integration
- Works with unified `ar:marker`, raw worker-level `ar:getMarker`, and legacy `ar:markerFound`/`ar:markerUpdated`/`ar:markerLost` events
- Applies the classic AR.js axis transform chain by default so Three.js content lands on the marker correctly

See the minimal example in this repo:
- `examples/minimal/main.js`

## Install / Build

Build the library:
```bash
npm run build:vite
```

Outputs:
- ESM: `dist/arjs-plugin-threejs.mjs`
- CJS: `dist/arjs-plugin-threejs.js`
- Source maps included

Run the example:
```bash
cd examples/minimal
npm i
npm run dev
```

In the example, the plugin is imported from `../../dist/arjs-plugin-threejs.mjs`.

## Quick start (Engine + Artoolkit + Three.js plugin)

Minimal wiring based on `examples/minimal/main.js` (paths simplified; adjust imports to your setup):

```js
import { Engine, webcamPlugin, defaultProfilePlugin } from 'ar.js-core';
// or your local build, e.g. './vendor/ar-js-core/arjs-core.mjs'
import { ThreeJSRendererPlugin } from '@AR-js-org/arjs-plugin-threejs';

// 1) Create engine and enable core plugins
const engine = new Engine();
engine.pluginManager.register(defaultProfilePlugin.id, defaultProfilePlugin);
engine.pluginManager.register(webcamPlugin.id, webcamPlugin);
const ctx = engine.getContext();
await engine.pluginManager.enable(defaultProfilePlugin.id, ctx);
await engine.pluginManager.enable(webcamPlugin.id, ctx);

// 2) Initialize the Artoolkit tracking plugin (import path per your project)
const { ArtoolkitPlugin } = await import('./vendor/arjs-plugin-artoolkit/arjs-plugin-artoolkit.esm.js');
const artoolkit = new ArtoolkitPlugin({
    cameraParametersUrl: '/path/to/camera_para.dat',
    minConfidence: 0.6,
});
await artoolkit.init(ctx);
await artoolkit.enable();

// 3) Emit camera projection once ready (simplified)
const proj = artoolkit.getProjectionMatrix?.();
const arr = proj?.toArray ? proj.toArray() : proj;
if (Array.isArray(arr) && arr.length === 16) {
    engine.eventBus.emit('ar:camera', { projectionMatrix: arr });
}

// 4) Mount Three.js renderer plugin
const threePlugin = new ThreeJSRendererPlugin({
    container: document.getElementById('viewport'),
    useLegacyAxisChain: true,
    changeMatrixMode: 'modelViewMatrix',
    preferRAF: true,
    // Debug (optional; defaults off):
    // debugSceneAxes: true,
    // sceneAxesSize: 2,
    // debugAnchorAxes: true,
    // anchorAxesSize: 0.5,
});
await threePlugin.init(engine);
await threePlugin.enable();

// 5) Start the engine loop
engine.start();
```

Notes:
- Start the webcam and attach the `<video>` element into your viewport with z-index below the Three.js canvas.
- Anchors (marker Groups) are created lazily when the first pose event arrives; add content when you receive a marker event (see below).

## Events handled

The plugin subscribes to `engine.eventBus` if available, else the engine (must provide `on/off/emit`).

- Unified marker events
    - `ar:marker` → `{ id, matrix?: number[16], visible?: boolean }`
- Raw worker-level events
    - `ar:getMarker` → `{ matrix: number[16], marker: { markerId|id|pattHandle|uid|index, confidence? } }`
- Legacy marker events
    - `ar:markerFound`, `ar:markerUpdated`, `ar:markerLost` (adapted internally to `ar:marker`)
- Camera projection
    - `ar:camera` → `{ projectionMatrix: number[16] }`
- Render tick (optional)
    - `engine:update` (plugin also supports RAF via `preferRAF`)

## Options

Constructor options (selected):

- `container` (HTMLElement): DOM node where the Three.js canvas mounts. Default: `document.body`.
- `preferRAF` (boolean): Render via RAF even if the engine doesn’t emit `engine:update`. Default: `true`.
- `minConfidence` (number): If `ar:getMarker` contains `marker.confidence`, ignore events below this threshold. Default: `0`.
- `useLegacyAxisChain` (boolean): Apply a classic AR.js transform chain. Default: `true`.
- `changeMatrixMode` ('modelViewMatrix' | 'cameraTransformMatrix'): Matches classic AR.js behavior. Default: `'modelViewMatrix'`.
- Debug helpers (all default to `false` unless sizes; helpful while integrating):
    - `debugSceneAxes` (boolean): Show a `THREE.AxesHelper` at scene origin.
    - `sceneAxesSize` (number): Size of scene axes helper (default `2`).
    - `debugAnchorAxes` (boolean): Show a `THREE.AxesHelper` on each created anchor.
    - `anchorAxesSize` (number): Size of anchor axes helper (default `0.5`).

Classic AR.js transform chain (default):
```
finalMatrix = R_y(π) * R_z(π) * modelViewMatrix * R_x(π/2)
```
If `changeMatrixMode === 'cameraTransformMatrix'`, `finalMatrix` is inverted before applying to the anchor.

## Camera projection

For correct perspective, emit a camera projection matrix at least once:

```js
const proj = artoolkit.getProjectionMatrix();         // from your Artoolkit plugin
const arr = proj?.toArray ? proj.toArray() : proj;    // ensure 16 numbers
if (Array.isArray(arr) && arr.length === 16) {
  engine.eventBus.emit('ar:camera', { projectionMatrix: arr });
}
```

The plugin will log “Projection applied” when it sets the camera.

## Anchors and how to add content

Anchors (Three.js Groups) are created on-demand when the first pose for a marker ID arrives. Add content in response to marker events:

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

  // After the first pose, the plugin will have created an anchor
  setTimeout(() => {
    const anchor = threePlugin.getAnchor(id);
    if (anchor && !anchor.userData._content) {
      anchor.userData._content = true;
      const cube = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.5, 0.5),
        new THREE.MeshBasicMaterial({ color: 0xff00ff }) // Basic avoids lighting pitfalls
      );
      cube.position.y = 0.25;
      anchor.add(cube);
    }
  }, 0);

  // Forward pose to unified event if your tracker doesn't emit ar:marker:
  const matrix = d?.matrix;
  if (Array.isArray(matrix) && matrix.length === 16) {
    engine.eventBus.emit('ar:marker', { id, matrix, visible: true });
  }
});
```

Tips:
- Use `debugSceneAxes` and/or `debugAnchorAxes` during integration.
- Keep your viewport container with `position: relative` and a fixed aspect ratio.
- Style `<video>` at `z-index: 1` and the Three.js `<canvas>` at `z-index: 2`.

## License

MIT © AR.js Org