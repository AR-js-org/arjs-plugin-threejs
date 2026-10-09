# examples/minimal

A standalone Vite project (own `package.json`, dev server on :3000) wiring
AR.js-next, arjs-plugin-artoolkit and this renderer: a cube on the Hiro
pattern, a sphere on the 3x3 barcode 0.

## Layout

- Packages come from npm: `@ar-js-org/ar.js-next`,
  `@ar-js-org/arjs-plugin-artoolkit` (≥ 0.4.0, the first to emit
  `ar:camera`), `@ar-js-org/artoolkit5-wasm` and `three`. This plugin is
  linked with `"@ar-js-org/arjs-plugin-threejs": "file:../.."`, so it loads
  the root's `dist/`: run `npm run build` at the root first, and again after
  changing `src/`. Do not bring back `vendor/` copies: they drift from the
  published API.
- WASM: `import wasmUrl from '@ar-js-org/artoolkit5-wasm/dist/artoolkit5.wasm?url'`,
  passed to `ArtoolkitPlugin`.
- `vite.config.mjs`: `optimizeDeps.exclude` keeps artoolkit out of
  pre-bundling (its worker URL is relative to its module), and
  `resolve.dedupe: ['three']` keeps one Three.js, since the linked root has its
  own copy.
- `public/data/` holds `camera_para.dat` and `patt.hiro`, served at `/data/`;
  do not reformat them.

## Wiring rules

- No event bridge: the renderer subscribes to `ar:markerFound/Updated/Lost`
  and `ar:camera` itself. Enable it before the tracker so the first
  `ar:camera` is not missed.
- Call `loadMarker`/`trackBarcode` after frames are flowing: the tracker
  builds its detector from the first frame.
- Get anchors with the marker's `type` as well as its id:
  `getAnchor(0)` is the Hiro pattern, `getAnchor(0, 'barcode')` barcode 0.
- The default `matrixConvention` (`'webgl'`) matches artoolkit ≥ 0.2.0. If
  the content looks mirrored or flipped, report it rather than patching the
  example.
