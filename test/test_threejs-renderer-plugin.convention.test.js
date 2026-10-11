import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as THREE from "three";
import { ThreeJSRendererPlugin } from "../src/threejs-renderer-plugin.js";

function createEmitter() {
  const listeners = new Map();
  return {
    on(name, fn) {
      if (!listeners.has(name)) listeners.set(name, []);
      listeners.get(name).push(fn);
    },
    off(name, fn) {
      const arr = listeners.get(name) || [];
      const i = arr.indexOf(fn);
      if (i >= 0) arr.splice(i, 1);
    },
    emit(name, payload) {
      (listeners.get(name) || []).forEach((fn) => fn(payload));
    },
  };
}

function makeFakeRenderer() {
  return {
    domElement: document.createElement("canvas"),
    setPixelRatio: vi.fn(),
    setClearColor: vi.fn(),
    setSize: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn(),
  };
}

const translation = () =>
  Float32Array.from(new THREE.Matrix4().makeTranslation(1, 2, -5).elements);

describe("matrixConvention and the AR projection", () => {
  let engine;
  let container;
  let plugin;
  let renderer;

  async function start(options = {}) {
    renderer = makeFakeRenderer();
    plugin = new ThreeJSRendererPlugin({
      container,
      preferRAF: false,
      rendererFactory: () => renderer,
      ...options,
    });
    await plugin.init(engine);
    await plugin.enable();
    return plugin;
  }

  beforeEach(() => {
    engine = { eventBus: createEmitter() };
    container = document.getElementById("viewport");
    container.innerHTML = "";
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    plugin?.dispose();
    vi.restoreAllMocks();
  });

  it("defaults to the webgl convention: anchor.matrix equals the incoming matrix", async () => {
    await start();
    engine.eventBus.emit("ar:markerFound", {
      markerId: 0,
      type: "pattern",
      matrix: translation(),
    });

    const { position } = plugin.getAnchor(0);
    expect([position.x, position.y, position.z]).toEqual([1, 2, -5]);
  });

  it("legacy convention applies the axis chain", async () => {
    await start({ matrixConvention: "legacy" });
    engine.eventBus.emit("ar:markerFound", {
      markerId: 0,
      type: "pattern",
      matrix: translation(),
    });

    // R_y(π) · R_z(π) · M · R_x(π/2), the classic AR.js chain.
    const expected = new THREE.Matrix4()
      .makeRotationY(Math.PI)
      .multiply(new THREE.Matrix4().makeRotationZ(Math.PI))
      .multiply(new THREE.Matrix4().fromArray(translation()))
      .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
    const want = new THREE.Vector3().setFromMatrixPosition(expected);

    const { position } = plugin.getAnchor(0);
    expect(position.x).toBeCloseTo(want.x);
    expect(position.y).toBeCloseTo(want.y);
    expect(position.z).toBeCloseTo(want.z);
    expect([position.x, position.y, position.z]).not.toEqual([0, 0, 0]);
  });

  it("useLegacyAxisChain: true maps to legacy and warns once", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await start({ useLegacyAxisChain: true });

    expect(plugin.options.matrixConvention).toBe("legacy");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain("matrixConvention");
  });

  it("matrixConvention: undefined keeps the webgl default", async () => {
    await start({ matrixConvention: undefined });
    expect(plugin.options.matrixConvention).toBe("webgl");
  });

  it("ar:camera accepts a Float32Array projection", async () => {
    await start();
    const projection = new Float32Array([
      2, 0, 0, 0, 0, 3, 0, 0, 0, 0, -1, -1, 0, 0, -0.2, 0,
    ]);
    engine.eventBus.emit("ar:camera", { projectionMatrix: projection });

    const { elements } = plugin.getCamera().projectionMatrix;
    expect(elements[0]).toBe(2);
    expect(elements[10]).toBe(-1);
  });

  it("a resize after ar:camera keeps the AR projection", async () => {
    await start();
    const projection = new Float32Array([
      2, 0, 0, 0, 0, 3, 0, 0, 0, 0, -1, -1, 0, 0, -0.2, 0,
    ]);
    engine.eventBus.emit("ar:camera", { projectionMatrix: projection });
    renderer.setSize.mockClear();

    window.dispatchEvent(new Event("resize"));

    expect(Array.from(plugin.getCamera().projectionMatrix.elements)).toEqual(
      Array.from(projection),
    );
    expect(renderer.setSize).toHaveBeenCalled();
  });

  it("a resize before any ar:camera still updates the perspective camera aspect", async () => {
    await start();
    const camera = plugin.getCamera();
    camera.aspect = 0.5;

    window.dispatchEvent(new Event("resize"));

    expect(camera.aspect).not.toBe(0.5);
  });

  it("dispose then init forgets the AR projection: the new camera tracks resizes", async () => {
    await start();
    engine.eventBus.emit("ar:camera", {
      projectionMatrix: new Float32Array([
        2, 0, 0, 0, 0, 3, 0, 0, 0, 0, -1, -1, 0, 0, -0.2, 0,
      ]),
    });
    plugin.dispose();

    await plugin.init(engine);
    await plugin.enable();
    const camera = plugin.getCamera();
    camera.aspect = 0.5;

    window.dispatchEvent(new Event("resize"));

    expect(camera.aspect).not.toBe(0.5);
  });
});
