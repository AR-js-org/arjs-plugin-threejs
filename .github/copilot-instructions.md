# GitHub Copilot instructions

The canonical instructions for this repository are in [AGENTS.md](../AGENTS.md)
(plus `test/AGENTS.md` and `examples/minimal/AGENTS.md`). The essentials are
repeated here because Copilot does not follow includes.

- `@ar-js-org/arjs-plugin-threejs` renders AR.js-next scenes with Three.js and
  keeps one `THREE.Group` anchor per marker. All code is in
  `src/threejs-renderer-plugin.js`.
- It consumes `ar:markerFound`/`ar:markerUpdated`
  `{ markerId, type, matrix: Float32Array(16), confidence, vertex, dir, timestamp }`
  and `ar:markerLost` `{ markerId, type, timestamp }` from
  arjs-plugin-artoolkit.
- Key anchors by `type:markerId`; accept typed-array matrices
  (`ArrayBuffer.isView`).
- Tests inject a fake renderer through `rendererFactory`; THREE is real.
- Conventional Commits; feature branch → `dev` → `main`; never commit to
  `main`.
