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

const pose = (x, y, z) =>
  Float32Array.from(new THREE.Matrix4().makeTranslation(x, y, z).elements);

describe("anchors keyed by type:markerId", () => {
  let engine;
  let container;
  let plugin;

  async function start(options = {}) {
    plugin = new ThreeJSRendererPlugin({
      container,
      preferRAF: false,
      rendererFactory: makeFakeRenderer,
      ...options,
    });
    await plugin.init(engine);
    await plugin.enable();
  }

  const found = (payload) => engine.eventBus.emit("ar:markerFound", payload);

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

  it("pattern 0 and barcode 0 get distinct anchors (#5)", async () => {
    await start();
    found({ markerId: 0, type: "pattern", matrix: pose(1, 0, 0) });
    found({ markerId: 0, type: "barcode", matrix: pose(2, 0, 0) });

    const pattern = plugin.getAnchor(0);
    const barcode = plugin.getAnchor(0, "barcode");
    expect(pattern).toBeTruthy();
    expect(barcode).toBeTruthy();
    expect(pattern).not.toBe(barcode);
    expect(pattern.position.x).toBe(1);
    expect(barcode.position.x).toBe(2);
  });

  it("a Float32Array pose positions the anchor", async () => {
    await start();
    found({ markerId: 1, type: "pattern", matrix: pose(0, 0, -3) });
    expect(plugin.getAnchor(1).position.z).toBe(-3);
  });

  it("the anchor copies a reused matrix buffer", async () => {
    await start();
    const buffer = pose(0, 0, -3);
    found({ markerId: 1, type: "pattern", matrix: buffer });
    buffer.fill(9);

    expect(plugin.getAnchor(1).matrix.elements[14]).toBe(-3);
  });

  it("userData carries confidence, vertex, dir and type, and vertex is a copy", async () => {
    await start();
    const vertex = [
      [1, 2],
      [3, 4],
      [5, 6],
      [7, 8],
    ];
    found({
      markerId: 2,
      type: "barcode",
      matrix: pose(0, 0, -1),
      confidence: 0.9,
      vertex,
      dir: 3,
    });

    const { userData } = plugin.getAnchor(2, "barcode");
    expect(userData).toMatchObject({
      markerId: "2",
      type: "barcode",
      confidence: 0.9,
      vertex,
      dir: 3,
    });
    vertex[0][0] = 99;
    expect(userData.vertex[0][0]).toBe(1);
  });

  it("markerLost with type hides only that family's anchor", async () => {
    await start();
    found({ markerId: 0, type: "pattern", matrix: pose(0, 0, -1) });
    found({ markerId: 0, type: "barcode", matrix: pose(0, 0, -1) });

    engine.eventBus.emit("ar:markerLost", { markerId: 0, type: "barcode" });

    expect(plugin.getAnchor(0, "barcode").visible).toBe(false);
    expect(plugin.getAnchor(0).visible).toBe(true);
  });

  it("markerLost for an unknown marker creates nothing and does not throw", async () => {
    await start();
    expect(() =>
      engine.eventBus.emit("ar:markerLost", { markerId: 42, type: "pattern" }),
    ).not.toThrow();
    expect(plugin.getAnchor(42)).toBeUndefined();
  });

  it("markerLost after dispose does not throw", async () => {
    await start();
    found({ markerId: 0, type: "pattern", matrix: pose(0, 0, -1) });
    plugin.dispose();
    expect(() =>
      plugin.handleUnifiedMarker({ id: "0", visible: false }),
    ).not.toThrow();
    plugin = null;
  });

  it("a legacy payload without type lands on pattern and getAnchor(id) finds it", async () => {
    await start();
    found({ id: 4, transformationMatrix: Array.from(pose(0, 0, -2)) });

    const anchor = plugin.getAnchor(4);
    expect(anchor).toBeTruthy();
    expect(anchor.userData.type).toBe("pattern");
    expect(anchor.position.z).toBe(-2);
  });

  it("minConfidence filters markerFound", async () => {
    await start({ minConfidence: 0.5 });
    found({
      markerId: 5,
      type: "pattern",
      matrix: pose(0, 0, -1),
      confidence: 0.4,
    });
    expect(plugin.getAnchor(5)).toBeUndefined();

    found({
      markerId: 5,
      type: "pattern",
      matrix: pose(0, 0, -1),
      confidence: 0.6,
    });
    expect(plugin.getAnchor(5)).toBeTruthy();
  });

  it("ar:getMarker is no longer handled", async () => {
    await start();
    engine.eventBus.emit("ar:getMarker", {
      matrix: Array.from(pose(0, 0, -1)),
      marker: { markerId: 3 },
    });
    expect(plugin.getAnchor(3)).toBeUndefined();
  });
});
