import { describe, it, expect, beforeEach, vi } from "vitest";
import * as THREE from "three";
import { ThreeJSRendererPlugin } from "../src/threejs-renderer-plugin.js";

// Minimal event bus mock
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
const createMockEngine = () => ({ eventBus: createEmitter() });

// Fake renderer for DI
function makeFakeRenderer() {
  const canvas = document.createElement("canvas");
  const render = vi.fn();
  return {
    domElement: canvas,
    setPixelRatio: vi.fn(),
    setClearColor: vi.fn(),
    setSize: vi.fn(),
    render,
    dispose: vi.fn(),
    _renderSpy: render,
  };
}

// Helper to emit a single ar:getMarker with configurable confidence
function emitGetMarker(engine, id, matrixArray, confidence = 1.0) {
  engine.eventBus.emit("ar:getMarker", {
    type: 0,
    matrix: matrixArray,
    marker: { markerId: id, confidence },
  });
}

describe("ThreeJSRendererPlugin (experimental path & flags)", () => {
  let engine;
  let container;

  beforeEach(() => {
    engine = createMockEngine();
    container = document.getElementById("viewport");
    container.innerHTML = "";
  });

  it("invertModelView:true (experimental path) flips sign of position.z", async () => {
    const fake = makeFakeRenderer();
    const plugin = new ThreeJSRendererPlugin({
      container,
      preferRAF: false,
      rendererFactory: () => fake,
      // Experimental path: legacy chain off
      useLegacyAxisChain: false,
      invertModelView: true, // <- ensure inversion
      applyAxisFix: false,
    });
    await plugin.init(engine);
    await plugin.enable();

    // ModelView = pure translation along +Z
    const modelView = new THREE.Matrix4().makeTranslation(0, 0, 1).toArray();
    emitGetMarker(engine, 101, modelView);

    const anchor = plugin.getAnchor("101");
    expect(anchor).toBeTruthy();

    // After inversion, position.z should be negative (≈ -1)
    expect(anchor.position.z).toBeLessThan(0);
  });

  it("applyAxisFix only modifies orientation (quaternion differs from identity)", async () => {
    // Case A: experimental path without axis fix -> identity orientation for identity matrix
    const fakeA = makeFakeRenderer();
    const noFix = new ThreeJSRendererPlugin({
      container,
      preferRAF: false,
      rendererFactory: () => fakeA,
      useLegacyAxisChain: false,
      invertModelView: false,
      applyAxisFix: false,
    });
    await noFix.init(engine);
    await noFix.enable();
    emitGetMarker(engine, 201, new THREE.Matrix4().identity().toArray());
    const anchorNoFix = noFix.getAnchor("201");
    expect(anchorNoFix).toBeTruthy();
    // Identity quaternion approximately (0,0,0,1)
    expect(anchorNoFix.quaternion.x).toBeCloseTo(0);
    expect(anchorNoFix.quaternion.y).toBeCloseTo(0);
    expect(anchorNoFix.quaternion.z).toBeCloseTo(0);
    expect(anchorNoFix.quaternion.w).toBeCloseTo(1);

    // Case B: same input but with axis fix -> quaternion should not be identity
    const fakeB = makeFakeRenderer();
    const withFix = new ThreeJSRendererPlugin({
      container,
      preferRAF: false,
      rendererFactory: () => fakeB,
      useLegacyAxisChain: false,
      invertModelView: false,
      applyAxisFix: true, // <- only this differs
    });
    await withFix.init(engine);
    await withFix.enable();
    emitGetMarker(engine, 202, new THREE.Matrix4().identity().toArray());
    const anchorWithFix = withFix.getAnchor("202");
    expect(anchorWithFix).toBeTruthy();

    // Quaternion should differ from identity
    const q = anchorWithFix.quaternion;
    const isIdentity =
      Math.abs(q.x) < 1e-6 &&
      Math.abs(q.y) < 1e-6 &&
      Math.abs(q.z) < 1e-6 &&
      Math.abs(q.w - 1) < 1e-6;
    expect(isIdentity).toBe(false);
  });

  it("anchor.matrixAutoUpdate remains false after creation", async () => {
    const fake = makeFakeRenderer();
    const plugin = new ThreeJSRendererPlugin({
      container,
      preferRAF: false,
      rendererFactory: () => fake,
      useLegacyAxisChain: true,
    });
    await plugin.init(engine);
    await plugin.enable();

    emitGetMarker(engine, 301, new THREE.Matrix4().toArray());
    const anchor = plugin.getAnchor("301");
    expect(anchor).toBeTruthy();
    expect(anchor.matrixAutoUpdate).toBe(false);
  });

  it("minConfidence: 0.95 rejects 0.5 and accepts 0.99", async () => {
    const fake = makeFakeRenderer();
    const plugin = new ThreeJSRendererPlugin({
      container,
      preferRAF: false,
      rendererFactory: () => fake,
      minConfidence: 0.95, // high threshold
      useLegacyAxisChain: true,
    });
    await plugin.init(engine);
    await plugin.enable();

    // Below threshold: should NOT create an anchor
    emitGetMarker(engine, 401, new THREE.Matrix4().toArray(), 0.5);
    expect(plugin.getAnchor("401")).toBeUndefined();

    // Above threshold: should create the anchor
    emitGetMarker(engine, 401, new THREE.Matrix4().toArray(), 0.99);
    expect(plugin.getAnchor("401")).toBeTruthy();
  });
});
