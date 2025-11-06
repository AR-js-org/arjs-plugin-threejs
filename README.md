# @AR-js-org/arjs-plugin-threejs

Three.js renderer plugin for [AR.js-core](https://github.com/AR-js-org/ar.js-core).

## Installation

```bash
npm install @AR-js-org/arjs-plugin-threejs three ar.js-core
```

## Usage

```javascript
import { AREngine } from 'ar.js-core';
import { ThreeJSRendererPlugin } from '@AR-js-org/arjs-plugin-threejs';
import * as THREE from 'three';

// Create AR engine
const engine = new AREngine();

// Create and register the Three.js renderer plugin
const threePlugin = new ThreeJSRendererPlugin({
  container: document.getElementById('viewport'),
  antialias: true,
  alpha: true
});

engine.registerPlugin(threePlugin);
await engine.init();
threePlugin.enable();

// Add objects to the scene
const scene = threePlugin.getScene();
const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshBasicMaterial({ color: 0x00ff00 })
);
scene.add(cube);

// Start the engine
engine.start();
```

## Features

- Minimal Three.js renderer plugin for AR.js-core
- Lifecycle hooks: `init`, `enable`, `disable`, `dispose`
- Automatic marker anchor management via `ar:marker` events
- Rendering tied to `engine:update` events
- Camera projection matrix support via `ar:camera` events
- Window resize handling

## Exports

The plugin provides both ESM (`.mjs`) and CommonJS (`.js`) builds:

- **ESM**: `dist/arjs-plugin-threejs.mjs` (default for `import`)
- **CommonJS**: `dist/arjs-plugin-threejs.js` (for `require()`)

## API

### `ThreeJSRendererPlugin`

#### Constructor Options

```javascript
new ThreeJSRendererPlugin({
  container: HTMLElement,  // Container for renderer (default: document.body)
  antialias: boolean,      // Enable antialiasing (default: true)
  alpha: boolean           // Enable alpha channel (default: true)
})
```

#### Methods

- `init(engine)` - Initialize plugin with AR.js engine
- `enable()` - Enable plugin and attach renderer to DOM
- `disable()` - Disable plugin and remove event listeners
- `dispose()` - Cleanup all resources
- `getScene()` - Get Three.js scene
- `getCamera()` - Get Three.js camera
- `getRenderer()` - Get Three.js renderer
- `getAnchor(markerId)` - Get Three.js Group for a marker
- `setProjectionFromArray(array)` - Set camera projection from 4x4 matrix array

## Building

```bash
npm run build:vite
```

This produces:
- `dist/arjs-plugin-threejs.mjs` (ESM)
- `dist/arjs-plugin-threejs.js` (CommonJS)
- Source maps for both

## Example

See `examples/minimal` for a complete working example.

```bash
cd examples/minimal
npm install
npm run dev
```

**Note:** The example currently uses a mock AR.js-core engine since `ar.js-core` is not yet published to npm. When `ar.js-core` becomes available, the example will be updated to use the real engine. The mock demonstrates the plugin's lifecycle hooks, marker anchors, and rendering integration.

## License

MIT