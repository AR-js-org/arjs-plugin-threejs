# Changelog

All notable changes to `@ar-js-org/arjs-plugin-threejs` are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project follows [Semantic Versioning](https://semver.org/). Before 1.0,
a minor version may break the API; every breaking change is marked
**Breaking** and says what consumers must change. The README's "Upgrading to
…" section covers each breaking release in more detail.

## [Unreleased]

Planned as 0.2.0, to match arjs-plugin-artoolkit 0.2.0 and later.

### Changed

- **Breaking:** `matrixConvention: 'webgl' | 'legacy'` replaces
  `useLegacyAxisChain`, and the default is `'webgl'`: the pose is used as is,
  the convention arjs-plugin-artoolkit 0.2.0+ emits. The old default applied
  the classic AR.js axis chain to every pose. Pass
  `matrixConvention: 'legacy'` for artoolkit5-js poses.
  `useLegacyAxisChain` still works for now, with a warning, but it is mapped
  onto `matrixConvention`: `plugin.options.useLegacyAxisChain` no longer
  exists.
- **Breaking:** anchors are keyed by `type:markerId`, and
  `getAnchor(markerId, type = 'pattern')` takes the family: pass
  `getAnchor(id, 'barcode')` for barcodes. Pattern 0 and barcode 0 no longer
  share one anchor (#5). The anchor's `name` changes with it, from
  `marker-<id>` to `marker-<type>:<id>` (`scene.getObjectByName("marker-0")`
  becomes `"marker-pattern:0"`), and so do the keys of `plugin.anchors`.
- **Breaking:** `ar:getMarker` is no longer handled. Listen to
  `ar:markerFound`, `ar:markerUpdated` and `ar:markerLost`.
- `minConfidence` applies to `ar:markerFound` and `ar:markerUpdated`. It used
  to filter only `ar:getMarker`.
- Peer dependencies: `three` 0.182 or later, and `@ar-js-org/ar.js-next`
  ^0.2.0 as an optional peer: the plugin only needs an event bus with
  `on`/`off`/`emit`, so npm does not install AR.js-next for you.
  `@types/three` is an optional peer too: the declarations reference
  `three` types, and `three` ships none.

### Added

- Matrices and `ar:camera` projections may be any typed array of sixteen
  numbers. Before, `Array.isArray` silently dropped every `Float32Array` pose,
  which is what arjs-plugin-artoolkit sends.
- `anchor.userData` carries the last detection's `markerId`, `type`,
  `confidence`, `vertex` (a copy) and `dir`.
- Exported types: `MarkerType`, `MarkerEventPayload`, `MarkerLostPayload`,
  `CameraEventPayload`, `MatrixConvention`, `ThreeJSRendererPluginOptions`
  and `AnchorUserData`, resolved through a `types` condition in `exports`.
  `THREEJS_RENDERER_PLUGIN_VERSION` is exported from the package entry.
- `examples/minimal` is a Vite project on the npm packages (AR.js-next,
  arjs-plugin-artoolkit 0.4.0, Three.js), with a cube on the Hiro pattern and
  a sphere on the 3x3 barcode 0. It replaces the `vendor/` copies and the
  `ar:getMarker` bridge, and CI builds it.

### Fixed

- A window resize replaced the AR projection set by `ar:camera` with a
  generic perspective one. It now resizes the canvas only.
- An option passed as `undefined` erased its default.
- TypeScript found no declarations under `moduleResolution` `"bundler"` or
  `"node16"`, because `exports` had no `types` condition.
- A loss event for a marker never seen created an empty anchor.

## [0.1.1] - 2025-12-23

First release as `@ar-js-org/arjs-plugin-threejs`: a WebGL canvas over the
camera view, one `THREE.Group` anchor per marker driven by AR.js marker
events, the camera projection from `ar:camera`, and debug axes helpers.

[Unreleased]: https://github.com/AR-js-org/arjs-plugin-threejs/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/AR-js-org/arjs-plugin-threejs/releases/tag/v0.1.1
