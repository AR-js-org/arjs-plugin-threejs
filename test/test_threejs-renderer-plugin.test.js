import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { ThreeJSRendererPlugin } from '../src/threejs-renderer-plugin.js';

// Simple event bus mock
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

function createMockEngine() {
    return { eventBus: createEmitter() };
}

// Fake renderer factory for injection
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
        _renderSpy: render,
    };
}

describe('ThreeJSRendererPlugin', () => {
    let engine;
    let container;

    beforeEach(() => {
        engine = createMockEngine();
        container = document.getElementById('viewport');
        // Ensure clean container
        container.innerHTML = '';
    });

    it('initializes and enables (canvas attached)', async () => {
        const fake = makeFakeRenderer();
        const plugin = new ThreeJSRendererPlugin({
            container,
            preferRAF: false,
            rendererFactory: () => fake,
            useLegacyAxisChain: true,
            changeMatrixMode: 'modelViewMatrix',
        });
        await plugin.init(engine);
        await plugin.enable();

        expect(container.querySelector('canvas')).toBeTruthy();
    });

    it('applies camera projection on ar:camera', async () => {
        const fake = makeFakeRenderer();
        const plugin = new ThreeJSRendererPlugin({
            container,
            preferRAF: false,
            rendererFactory: () => fake,
        });
        await plugin.init(engine);
        await plugin.enable();

        const proj = [
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, -1, -1,
            0, 0, -0.2, 0
        ];
        engine.eventBus.emit('ar:camera', { projectionMatrix: proj });
        expect(plugin.getCamera().projectionMatrix.elements[0]).toBe(1);
        expect(plugin.getCamera().projectionMatrix.elements[10]).toBe(-1);
    });

    it('creates anchor on ar:getMarker and marks visible', async () => {
        const fake = makeFakeRenderer();
        const plugin = new ThreeJSRendererPlugin({
            container,
            preferRAF: false,
            rendererFactory: () => fake,
            debugAnchorAxes: true
        });
        await plugin.init(engine);
        await plugin.enable();

        engine.eventBus.emit('ar:getMarker', {
            matrix: new THREE.Matrix4().toArray(),
            marker: { markerId: 3, confidence: 0.9 }
        });
        const anchor = plugin.getAnchor('3');
        expect(anchor).toBeTruthy();
        expect(anchor.visible).toBe(true);
        expect(anchor.children.length).toBeGreaterThan(0); // axes helper
    });

    it('renders on engine:update', async () => {
        const fake = makeFakeRenderer();
        const plugin = new ThreeJSRendererPlugin({
            container,
            preferRAF: false,
            rendererFactory: () => fake
        });
        await plugin.init(engine);
        await plugin.enable();

        engine.eventBus.emit('engine:update', {});
        expect(fake._renderSpy).toHaveBeenCalledTimes(1);
    });

    it('hides anchor on legacy markerLost', async () => {
        const fake = makeFakeRenderer();
        const plugin = new ThreeJSRendererPlugin({
            container,
            preferRAF: false,
            rendererFactory: () => fake
        });
        await plugin.init(engine);
        await plugin.enable();

        engine.eventBus.emit('ar:getMarker', {
            matrix: new THREE.Matrix4().toArray(),
            marker: { markerId: 7 }
        });
        let anchor = plugin.getAnchor('7');
        expect(anchor.visible).toBe(true);

        engine.eventBus.emit('ar:markerLost', { markerId: 7 });
        anchor = plugin.getAnchor('7');
        expect(anchor.visible).toBe(false);
    });
});