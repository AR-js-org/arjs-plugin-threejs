# @AR-js-org/arjs-plugin-threejs

Three.js renderer plugin for AR.js-core.

## Events handled

- Unified: `ar:marker` with `{ id, matrix, visible }`
- Worker-level: `ar:getMarker` with `{ matrix, marker: { markerId|id|pattHandle|uid|index, confidence? } }`
- Legacy: `ar:markerFound`, `ar:markerUpdated`, `ar:markerLost` (adapted internally)
- Camera: `ar:camera` with `{ projectionMatrix }`

## Options

- `container`: DOM element for the renderer canvas (default: `document.body`)
- `preferRAF`: Render with `requestAnimationFrame` even if `engine:update` isn’t emitted (default: `true`)
- `invertModelView`: Invert ARToolKit modelView matrices (default: `true`)
- `applyAxisFix`: Apply Y/Z axis flips (rotate Y then Z by PI) to match WebGL coords (default: `true`)
- `minConfidence`: Ignore `ar:getMarker` events below this confidence (if provided by worker) (default: `0`)

## Usage

```js
import { Engine } from 'ar.js-core';
import { ThreeJSRendererPlugin } from '@AR-js-org/arjs-plugin-threejs';

const engine = new Engine();
const threePlugin = new ThreeJSRendererPlugin({
  container: document.getElementById('viewport'),
  invertModelView: true,
  applyAxisFix: true,
  preferRAF: true
});

await threePlugin.init(engine);
await threePlugin.enable();
engine.start();

// Add content when marker anchor appears
engine.eventBus.on('ar:getMarker', (e) => {
  const id = String(e?.marker?.markerId ?? e?.marker?.id ?? '0');
  const anchor = threePlugin.getAnchor(id);
  if (anchor && !anchor.userData.content) {
    anchor.userData.content = true;
    // add your Three.js objects to the anchor here
  }
});
```