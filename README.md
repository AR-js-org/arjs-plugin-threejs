# @ar-js-org/arjs-plugin-threejs

A Three.js renderer plugin for [AR.js-core](https://github.com/AR-js-org/ar.js-core). This plugin provides a Three.js-based renderer that integrates with AR.js-core's plugin lifecycle and event system to render augmented reality scenes.

## Features

- 🎨 **Three.js Integration** - Full Three.js WebGL rendering support
- 🔌 **Plugin Lifecycle** - Implements AR.js-core plugin interface (init/enable/disable/dispose)
- 📡 **Event-Driven** - Subscribes to AR.js-core engine and marker events
- 🎯 **Anchor Management** - Automatic Object3D anchor creation and tracking for markers
- 📐 **Camera Projection** - Support for custom projection matrices from detection plugins
- 📱 **Auto-Resize** - Automatic canvas and camera aspect ratio handling
- 📦 **Tree-Shakeable** - ESM and CJS outputs with proper side-effects configuration

## Installation

```bash
npm install @ar-js-org/arjs-plugin-threejs three ar.js-core
```

### Peer Dependencies

This plugin requires the following peer dependencies:

- `three` (>=0.150.0) - Three.js library
- `ar.js-core` (^0.2.0) - AR.js core ECS framework

## Usage

### Basic Setup

```javascript
import { ThreeJSRendererPlugin } from '@ar-js-org/arjs-plugin-threejs';
import * as THREE from 'three';

// Create the plugin instance
const rendererPlugin = new ThreeJSRendererPlugin({
  container: '#ar-container', // or HTMLElement
  autoResize: true,
  rendererOptions: {
    alpha: true,
    antialias: true
  }
});

// Initialize with AR.js-core context
await rendererPlugin.init(arjsContext);

// Enable the plugin
await rendererPlugin.enable();

// Access Three.js objects to add content
const scene = rendererPlugin.getScene();
const camera = rendererPlugin.getCamera();

// Add a cube to a marker anchor
const markerId = 0;
const anchor = rendererPlugin.getAnchor(markerId);

const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshNormalMaterial();
const cube = new THREE.Mesh(geometry, material);
anchor.add(cube);
```

### Complete Example with AR.js-core

```javascript
import { ARjsContext } from 'ar.js-core';
import { WebcamPlugin } from '@ar-js-org/arjs-plugin-webcam';
import { MarkerDetectionPlugin } from '@ar-js-org/arjs-plugin-marker-detection';
import { ThreeJSRendererPlugin } from '@ar-js-org/arjs-plugin-threejs';
import * as THREE from 'three';

// Initialize AR.js-core context
const arjsContext = new ARjsContext();

// Create and register plugins
const webcamPlugin = new WebcamPlugin();
const detectionPlugin = new MarkerDetectionPlugin();
const rendererPlugin = new ThreeJSRendererPlugin({
  container: document.getElementById('ar-container')
});

// Initialize plugins
await webcamPlugin.init(arjsContext);
await detectionPlugin.init(arjsContext);
await rendererPlugin.init(arjsContext);

// Enable plugins
await webcamPlugin.enable();
await detectionPlugin.enable();
await rendererPlugin.enable();

// Add 3D content to markers
const scene = rendererPlugin.getScene();

// Add ambient light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// Add directional light
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(0, 1, 1);
scene.add(directionalLight);

// Add a rotating cube to marker 0
const anchor = rendererPlugin.getAnchor(0);
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
anchor.add(cube);

// Animate the cube
arjsContext.eventBus.on('engine:update', () => {
  if (anchor.visible) {
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
  }
});

// Cleanup on page unload
window.addEventListener('beforeunload', async () => {
  await rendererPlugin.dispose();
  await detectionPlugin.dispose();
  await webcamPlugin.dispose();
});
```

## API Reference

### Constructor Options

```javascript
new ThreeJSRendererPlugin(options)
```

**Options:**

- `container` (HTMLElement | string) - Container element or CSS selector (default: `document.body`)
- `autoResize` (boolean) - Enable automatic window resize handling (default: `true`)
- `rendererOptions` (Object) - Options passed to `THREE.WebGLRenderer` (default: `{ alpha: true, antialias: true }`)
- `cameraOptions` (Object) - Camera configuration
  - `fov` (number) - Field of view in degrees (default: `60`)
  - `near` (number) - Near clipping plane (default: `0.1`)
  - `far` (number) - Far clipping plane (default: `1000`)

### Lifecycle Methods

#### `async init(ctx)`

Initialize the plugin with AR.js-core context. Creates the renderer, scene, camera, and subscribes to events.

**Parameters:**
- `ctx` (Object) - AR.js-core context with event bus

#### `async enable()`

Enable the plugin. Attaches the canvas to the container and starts rendering.

#### `async disable()`

Disable the plugin. Detaches the canvas and pauses rendering.

#### `async dispose()`

Cleanup and dispose of all resources. Removes event listeners, disposes Three.js objects, and cleans up anchors.

### Public Methods

#### `render()`

Manually render the scene. Called automatically on `engine:update` events.

#### `getScene()`

Returns the Three.js scene.

**Returns:** `THREE.Scene`

#### `getCamera()`

Returns the Three.js camera.

**Returns:** `THREE.PerspectiveCamera`

#### `getRenderer()`

Returns the Three.js renderer.

**Returns:** `THREE.WebGLRenderer`

#### `getAnchor(markerId)`

Get or create an anchor Object3D for a marker. Anchors are automatically positioned and oriented based on marker tracking.

**Parameters:**
- `markerId` (string | number) - Marker identifier

**Returns:** `THREE.Object3D` - Anchor group for the marker

#### `removeAnchor(markerId)`

Remove and dispose of a marker anchor.

**Parameters:**
- `markerId` (string | number) - Marker identifier

#### `setProjectionFromMatrix(mat4Array)`

Set the camera projection matrix from a 4x4 matrix array (column-major order).

**Parameters:**
- `mat4Array` (Float32Array | Array) - 4x4 projection matrix

## Events

The plugin subscribes to the following AR.js-core events:

- `engine:update` - Triggers rendering on each frame
- `ar:markerFound` - Creates/shows anchor when marker is detected
  - Event data: `{ markerId, matrix }`
- `ar:markerUpdated` - Updates anchor transform when marker moves
  - Event data: `{ markerId, matrix }`
- `ar:markerLost` - Hides anchor when marker is lost
  - Event data: `{ markerId }`
- `ar:cameraProjection` - Updates camera projection matrix
  - Event data: `{ matrix }`

## Build Outputs

The package provides two build formats:

- **ESM** (`dist/arjs-plugin-threejs.mjs`) - ES Module format
- **CJS** (`dist/arjs-plugin-threejs.js`) - CommonJS format

Both formats externalize `three` and `ar.js-core` as peer dependencies.

### Importing

```javascript
// ESM (recommended)
import { ThreeJSRendererPlugin } from '@ar-js-org/arjs-plugin-threejs';

// CJS
const { ThreeJSRendererPlugin } = require('@ar-js-org/arjs-plugin-threejs');
```

## Development

```bash
# Install dependencies
npm install

# Build the library
npm run build

# Build and watch for changes
npm run dev
```

## License

MIT © AR.js Community

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Links

- [AR.js-core](https://github.com/AR-js-org/ar.js-core)
- [Three.js](https://threejs.org/)
- [GitHub Repository](https://github.com/AR-js-org/arjs-plugin-threejs)