import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as THREE from 'three';
import { ThreeJSRendererPlugin } from '../src/threejs-renderer-plugin.js';

// Event bus mock
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
            (listeners.get(name) || []).forEach(fn => fn(payload));
        }
    };
}
const createMockEngine = () => ({ eventBus: createEmitter() });

// Fake renderer
function makeFakeRenderer() {
    const canvas = document.createElement('canvas');
    const render = vi.fn();
    return {
        domElement: canvas,
        setPixelRatio: vi.fn(),
        setClearColor: vi.fn(),
        setSize: vi.fn(),
        render,
        dispose: vi.fn(),
        _renderSpy: render
    };
}

describe('ThreeJSRendererPlugin (extended)', () => {
    let engine;
    let container;

    beforeEach(() => {
        engine = createMockEngine();
        container = document.getElementById('viewport');
        container.innerHTML = '';
        vi.useFakeTimers(); // for RAF tests
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    function emitGetMarker(id, matrixArray, confidence = 0.9) {
        engine.eventBus.emit('ar:getMarker', {
            matrix: matrixArray,
            marker: { markerId: id, confidence }
        });
    }

    it('applies legacy axis chain producing different transform than experimental path', async () => {
        const m = new THREE.Matrix4().makeTranslation(0, 0, 1).toArray();

        // Legacy chain
        const fakeA = makeFakeRenderer();
        const legacy = new ThreeJSRendererPlugin({
            container,
            preferRAF: false,
            rendererFactory: () => fakeA,
            useLegacyAxisChain: true
        });
        await legacy.init(engine);
        await legacy.enable();
        emitGetMarker(10, m);
        const anchorLegacy = legacy.getAnchor('10');
        expect(anchorLegacy).toBeTruthy();

        // Experimental path (no axis chain, invert off)
        const fakeB = makeFakeRenderer();
        const experimental = new ThreeJSRendererPlugin({
            container,
            preferRAF: false,
            rendererFactory: () => fakeB,
            useLegacyAxisChain: false,
            invertModelView: false,
            applyAxisFix: false
        });
        await experimental.init(engine);
        await experimental.enable();
        emitGetMarker(20, m);
        const anchorExperimental = experimental.getAnchor('20');
        expect(anchorExperimental).toBeTruthy();

        expect(anchorLegacy.position.equals(anchorExperimental.position)).toBeFalsy();
    });

    it('changeMatrixMode=cameraTransformMatrix inverts final matrix (anchor position differs)', async () => {
        const matrix = new THREE.Matrix4().makeTranslation(0, 0, 1).toArray();

        const fakeM = makeFakeRenderer();
        const mvPlugin = new ThreeJSRendererPlugin({
            container,
            preferRAF: false,
            rendererFactory: () => fakeM,
            useLegacyAxisChain: true,
            changeMatrixMode: 'modelViewMatrix'
        });
        await mvPlugin.init(engine);
        await mvPlugin.enable();
        emitGetMarker(1, matrix);
        const anchorMV = mvPlugin.getAnchor('1');

        const fakeC = makeFakeRenderer();
        const ctPlugin = new ThreeJSRendererPlugin({
            container,
            preferRAF: false,
            rendererFactory: () => fakeC,
            useLegacyAxisChain: true,
            changeMatrixMode: 'cameraTransformMatrix'
        });
        await ctPlugin.init(engine);
        await ctPlugin.enable();
        emitGetMarker(2, matrix);
        const anchorCT = ctPlugin.getAnchor('2');

        expect(anchorMV.position.equals(anchorCT.position)).toBeFalsy();
    });

    it('ignores ar:getMarker events below minConfidence', async () => {
        const fake = makeFakeRenderer();
        const plugin = new ThreeJSRendererPlugin({
            container,
            preferRAF: false,
            rendererFactory: () => fake,
            minConfidence: 0.8
        });
        await plugin.init(engine);
        await plugin.enable();

        emitGetMarker(99, new THREE.Matrix4().toArray(), 0.5);
        expect(plugin.getAnchor('99')).toBeUndefined();

        emitGetMarker(100, new THREE.Matrix4().toArray(), 0.9);
        expect(plugin.getAnchor('100')).toBeTruthy();
    });

    it('creates distinct anchors for different marker IDs', async () => {
        const fake = makeFakeRenderer();
        const plugin = new ThreeJSRendererPlugin({
            container,
            preferRAF: false,
            rendererFactory: () => fake
        });
        await plugin.init(engine);
        await plugin.enable();

        emitGetMarker(3, new THREE.Matrix4().toArray());
        emitGetMarker(4, new THREE.Matrix4().makeTranslation(1, 0, 0).toArray());

        const a3 = plugin.getAnchor('3');
        const a4 = plugin.getAnchor('4');
        expect(a3).toBeTruthy();
        expect(a4).toBeTruthy();
        expect(a3).not.toBe(a4);
    });

    it('reuses the same anchor on repeated marker events', async () => {
        const fake = makeFakeRenderer();
        const plugin = new ThreeJSRendererPlugin({
            container,
            preferRAF: false,
            rendererFactory: () => fake
        });
        await plugin.init(engine);
        await plugin.enable();

        emitGetMarker(5, new THREE.Matrix4().toArray());
        const first = plugin.getAnchor('5');
        emitGetMarker(5, new THREE.Matrix4().makeTranslation(0, 1, 0).toArray());
        const second = plugin.getAnchor('5');
        expect(first).toBe(second);
    });

    it('debugSceneAxes and debugAnchorAxes add helpers', async () => {
        const fake = makeFakeRenderer();
        const plugin = new ThreeJSRendererPlugin({
            container,
            preferRAF: false,
            rendererFactory: () => fake,
            debugSceneAxes: true,
            sceneAxesSize: 3,
            debugAnchorAxes: true,
            anchorAxesSize: 1
        });
        await plugin.init(engine);
        await plugin.enable();

        // Note: AxesHelper does not expose a public `size` property; only assert presence
        const hasSceneAxes = plugin.getScene().children.some(
            c => c instanceof THREE.AxesHelper
        );
        expect(hasSceneAxes).toBe(true);

        emitGetMarker(11, new THREE.Matrix4().toArray());
        const anchor = plugin.getAnchor('11');
        const hasAnchorAxes = anchor.children.some(c => c instanceof THREE.AxesHelper);
        expect(hasAnchorAxes).toBe(true);
    });

    it('preferRAF renders frames without engine:update events', async () => {
        const fake = makeFakeRenderer();
        const plugin = new ThreeJSRendererPlugin({
            container,
            preferRAF: true,
            rendererFactory: () => fake
        });
        await plugin.init(engine);
        await plugin.enable();

        vi.advanceTimersByTime(50);
        expect(fake._renderSpy.mock.calls.length).toBeGreaterThan(1);
    });

    it('disable() removes canvas and stops RAF loop', async () => {
        const fake = makeFakeRenderer();
        const plugin = new ThreeJSRendererPlugin({
            container,
            preferRAF: true,
            rendererFactory: () => fake
        });
        await plugin.init(engine);
        await plugin.enable();

        vi.advanceTimersByTime(16);
        const initialCalls = fake._renderSpy.mock.calls.length;
        plugin.disable();
        vi.advanceTimersByTime(100);
        const afterCalls = fake._renderSpy.mock.calls.length;
        expect(afterCalls).toBe(initialCalls);
        expect(container.querySelector('canvas')).toBeFalsy();
    });

    it('dispose() clears anchors and renderer reference', async () => {
        const fake = makeFakeRenderer();
        const plugin = new ThreeJSRendererPlugin({
            container,
            preferRAF: false,
            rendererFactory: () => fake
        });
        await plugin.init(engine);
        await plugin.enable();

        emitGetMarker(50, new THREE.Matrix4().toArray());
        expect(plugin.getAnchor('50')).toBeTruthy();

        plugin.dispose();
        expect(plugin.getAnchor('50')).toBeUndefined();
        expect(plugin.getRenderer()).toBeNull();
        expect(plugin.getScene()).toBeNull();
    });

    it('camera projection inverse updates when projection applied', async () => {
        const fake = makeFakeRenderer();
        const plugin = new ThreeJSRendererPlugin({
            container,
            preferRAF: false,
            rendererFactory: () => fake
        });
        await plugin.init(engine);
        await plugin.enable();

        // Simple projection array; ensure 16-length values
        const proj = [
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, -1, -1,
            0, 0, -0.2, 0
        ];
        engine.eventBus.emit('ar:camera', { projectionMatrix: proj });

        const cam = plugin.getCamera();
        const composed = cam.projectionMatrix.clone().multiply(cam.projectionMatrixInverse);
        const e = composed.elements;
        expect(Math.abs(e[0] - 1)).toBeLessThan(1e-3);
        expect(Math.abs(e[5] - 1)).toBeLessThan(1e-3);
    });

    it('legacy markerFound / markerLost toggles visibility', async () => {
        const fake = makeFakeRenderer();
        const plugin = new ThreeJSRendererPlugin({
            container,
            preferRAF: false,
            rendererFactory: () => fake
        });
        await plugin.init(engine);
        await plugin.enable();

        engine.eventBus.emit('ar:markerFound', {
            markerId: 77,
            matrix: new THREE.Matrix4().toArray()
        });
        const anchor = plugin.getAnchor('77');
        expect(anchor).toBeTruthy();
        expect(anchor.visible).toBe(true);

        engine.eventBus.emit('ar:markerLost', { markerId: 77 });
        expect(anchor.visible).toBe(false);
    });
});