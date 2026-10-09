# examples/minimal

A standalone Vite project (own `package.json`, dev server on :3000) wiring
AR.js-next, arjs-plugin-artoolkit and this renderer.

## Target layout (milestone v0.2.0)

- Packages come from npm, not from `vendor/`: `@ar-js-org/ar.js-next` and
  `@ar-js-org/arjs-plugin-artoolkit` from the registry, this plugin via
  `"@ar-js-org/arjs-plugin-threejs": "file:../.."`. `vendor/` copies drift
  from the published API and must not come back.
- WASM: `import wasmUrl from '@ar-js-org/artoolkit5-wasm/dist/artoolkit5.wasm?url'`
  and pass it to `ArtoolkitPlugin`.
- No event bridge: the renderer subscribes to `ar:markerFound/Updated/Lost`
  itself. The current `ar:getMarker` → `ar:marker` bridge in `main.js`
  processes every pose twice and relies on an event artoolkit 0.2.0 removed.
- Call `loadMarker`/`trackBarcode` after frames are flowing, and get anchors
  with the marker's `type` as well as its id.

`data/` holds `camera_para.dat` and `patt.hiro`; do not reformat it.
