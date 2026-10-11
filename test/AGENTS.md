# test

Vitest with jsdom (`vitest.config.mjs`); `test/setup.js` adds a 640×480
`#viewport` element. `npm test` always collects coverage.

## Harness

Each spec builds the same three pieces; copy them rather than inventing new
ones:

- `createEmitter()`: a Map-backed `{ on, off, emit }`.
- `createMockEngine()`: `{ eventBus: createEmitter() }`.
- `makeFakeRenderer()`: a `<canvas>` as `domElement` plus `setPixelRatio`,
  `setClearColor`, `setSize`, `render` and `dispose` as `vi.fn`s, injected
  with `rendererFactory: () => fake`. WebGL is never created.

Construct with `container: document.getElementById("viewport")` and
`preferRAF: false` unless the test is about the loop.

THREE itself is **real**: assert on `anchor.position`, `anchor.quaternion`,
`anchor.visible` rather than on mocks.

## Rules

- Name files `test_*.test.js` and import from
  `../src/threejs-renderer-plugin.js`.
- Payloads must match what arjs-plugin-artoolkit really emits (see the root
  `AGENTS.md`): `matrix` as a `Float32Array(16)`, `markerId` plus `type`.
  Plain-array payloads alone cannot catch typed-array bugs.
- Cover pattern and barcode markers with the same `markerId` whenever anchor
  keying is involved.
