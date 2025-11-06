// Import Three.js via ESM CDN (or your bundler)
import * as THREE from 'https://unpkg.com/three@0.161.0/build/three.module.js';

import {
    Engine,
    CaptureSystem,
    FramePumpSystem,
    SOURCE_TYPES,
    webcamPlugin,
    defaultProfilePlugin
} from './vendor/ar-js-core/arjs-core.mjs';

// Example: AR.js Core ECS + ArtoolkitPlugin + ThreeJSRendererPlugin

// UI
const statusEl = document.getElementById('status');
const logEl = document.getElementById('log');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const loadBtn = document.getElementById('loadBtn');
const viewport = document.getElementById('viewport');

function log(message) {
    const ts = new Date().toISOString();
    const el = document.createElement('div');
    el.textContent = `[${ts}] ${message}`;
    logEl.appendChild(el);
    logEl.scrollTop = logEl.scrollHeight;
    console.log(message);
}

function setStatus(msg, type = 'normal') {
    statusEl.textContent = msg;
    statusEl.className = 'status';
    if (type === 'success') statusEl.classList.add('success');
    if (type === 'error') statusEl.classList.add('error');
}

// Attach webcam <video> into viewport without removing other children (like the Three.js canvas)
function attachVideoToViewport(ctx) {
    const frameSource = CaptureSystem.getFrameSource(ctx);
    const videoEl = frameSource?.element;
    if (!videoEl || !viewport) return;

    try {
        if (videoEl.parentNode && videoEl.parentNode !== viewport) {
            videoEl.parentNode.removeChild(videoEl);
        }
    } catch {}

    try {
        videoEl.setAttribute('playsinline', '');
        videoEl.setAttribute('autoplay', '');
        videoEl.muted = true;
        videoEl.controls = false;
    } catch {}

    Object.assign(videoEl.style, {
        position: 'relative',
        top: '0px',
        left: '0px',
        zIndex: '1',   // video under the ThreeJS renderer
        width: '100%',
        height: 'auto',
        display: 'block',
    });

    // Do NOT clear viewport; preserve plugin canvas
    if (!viewport.contains(videoEl)) {
        viewport.appendChild(videoEl);
    }
}

// Engine/plugin state
let engine;
let ctx;
let artoolkit;
let threePlugin;
let pumping = false;
let cameraStarted = false;

async function bootstrap() {
    engine = new Engine();

    // Register core/source plugins
    engine.pluginManager.register(defaultProfilePlugin.id, defaultProfilePlugin);
    engine.pluginManager.register(webcamPlugin.id, webcamPlugin);

    // Import plugins
    const artoolkitMod = await import ('./vendor/arjs-plugin-artoolkit/arjs-plugin-artoolkit.esm.js');
    const ArtoolkitPlugin = artoolkitMod.ArtoolkitPlugin || artoolkitMod.default;

    // Import the ThreeJS renderer plugin from the external repo build
    // Make sure the ESM file from PR #2 is available at this path, or adjust accordingly.
    const threeMod = await import('../../dist/arjs-plugin-threejs.mjs');
    const ThreeJSRendererPlugin = threeMod.ThreeJSRendererPlugin || threeMod.default;

    const enableLoadBtn = () => {
        loadBtn.disabled = false;
        setStatus('Worker ready. You can start the webcam and load the marker.', 'success');
    };

    // Event listeners before enabling
    engine.eventBus.on('ar:workerReady', () => {
        log('Worker ready');
        setStatus('Worker ready. You can start the webcam and load the marker.', 'success');
        //loadBtn.disabled = false;
        enableLoadBtn()
        try {
            const proj = artoolkit?.getProjectionMatrix?.();
            const arr = proj?.toArray ? proj.toArray() : proj;
            if (Array.isArray(arr) && arr.length === 16) {
                engine.eventBus.emit('ar:camera', { projectionMatrix: arr });
            }
        } catch {}
    });
    //engine.eventBus.on('ar:ready', enableLoadBtn);
    //engine.eventBus.on('ar:initialized', enableLoadBtn);
    engine.eventBus.on('ar:workerError', (e) => {
        log(`workerError: ${JSON.stringify(e)}`);
        setStatus('Worker error (see console)', 'error');
    });

    engine.eventBus.on('ar:getMarker', (e) => console.log('[example] ar:getMarker', e));
    // Marker events for logging only (the Three plugin manages anchors and visibility)
    engine.eventBus.on('ar:markerFound', (d) => log(`markerFound: ${JSON.stringify(d)}`));
    engine.eventBus.on('ar:markerUpdated', (d) => {/* too chatty for logs; uncomment if needed */});
    engine.eventBus.on('ar:markerLost',   (d) => log(`markerLost: ${JSON.stringify(d)}`));

    // Enable core plugins
    ctx = engine.getContext();
    await engine.pluginManager.enable(defaultProfilePlugin.id, ctx);
    await engine.pluginManager.enable(webcamPlugin.id, ctx);

    // Tracking plugin
    artoolkit = new ArtoolkitPlugin({
        cameraParametersUrl: '/examples/minimal/data/camera_para.dat',
        minConfidence: 0.6,
    });
    await artoolkit.init(ctx);
    await artoolkit.enable();

    // Three.js renderer plugin
    threePlugin = new ThreeJSRendererPlugin({
        container: viewport,       // mount renderer here
        alpha: true,               // transparent canvas over video
        antialias: true,
        preserveDrawingBuffer: false,
    });
    await threePlugin.init(ctx);
    await threePlugin.enable();

    // Start ECS loop (systems/plugins tick)
    engine.start();

    // Fallback: if worker was already ready
    if (artoolkit.workerReady) {
        log('Worker was already ready (post-enable).');
        setStatus('Worker ready. You can start the webcam and load the marker.', 'success');
        loadBtn.disabled = false;
    } else {
        setStatus('Plugin initialized. Waiting for worker…', 'normal');
    }

    // UI initial state
    startBtn.disabled = false;
    stopBtn.disabled = true;
}

async function startWebcam() {
    if (cameraStarted) return;
    try {
        startBtn.disabled = true;
        stopBtn.disabled = true;
        setStatus('Starting webcam…', 'normal');
        log('Initializing webcam capture');

        await CaptureSystem.initialize(
            {
                sourceType: SOURCE_TYPES.WEBCAM,
                sourceWidth: 640,
                sourceHeight: 480,
            },
            ctx,
        );

        attachVideoToViewport(ctx);

        if (!pumping) {
            FramePumpSystem.start(ctx);
            pumping = true;
        }

        cameraStarted = true;
        setStatus('Webcam started. You can now show the marker.', 'success');
        log('Webcam started.');
        stopBtn.disabled = false;
    } catch (err) {
        log('Camera error: ' + (err?.message || err));
        setStatus('Camera error (see console)', 'error');
        startBtn.disabled = false;
        stopBtn.disabled = true;
    }
}

async function stopWebcam() {
    if (!cameraStarted) return;
    try {
        setStatus('Stopping webcam…', 'normal');
        log('Stopping frame pump and capture');

        if (pumping) {
            FramePumpSystem.stop(ctx);
            pumping = false;
        }
        await CaptureSystem.dispose(ctx);

        // Remove only videos; keep ThreeJS canvas from the plugin
        if (viewport) {
            [...viewport.querySelectorAll('video')].forEach((v) => v.remove());
        }

        cameraStarted = false;
        setStatus('Webcam stopped.', 'success');
        log('Webcam stopped.');
        startBtn.disabled = false;
        stopBtn.disabled = true;
    } catch (err) {
        log('Stop error: ' + (err?.message || err));
        setStatus('Stop error (see console)', 'error');
    }
}

async function loadMarker() {
    if (!artoolkit) return;
    try {
        loadBtn.disabled = true;
        setStatus('Loading marker…', 'normal');

        const patternUrl = '/examples/minimal/data/patt.hiro';
        const res = await artoolkit.loadMarker(patternUrl, 1);
        const markerId = res.markerId;
        log(`loadMarker result: ${JSON.stringify(res)}`);
        setStatus(`Marker loaded (id=${markerId}). Show the marker to the camera.`, 'success');

        // Demo content: add a cube to the plugin's anchor for this marker
        if (threePlugin && typeof threePlugin.getAnchor === 'function') {
            const anchorGroup = threePlugin.getAnchor(markerId);
            if (anchorGroup && anchorGroup.children.length === 0) {
                const cube = new THREE.Mesh(
                    new THREE.BoxGeometry(1, 1, 1),
                    new THREE.MeshStandardMaterial({ color: 0x2d6cdf, metalness: 0.1, roughness: 0.8 })
                );
                cube.position.y = 0.5;

                const hemi = new THREE.HemisphereLight(0xffffff, 0x222233, 1.0);
                const plane = new THREE.Mesh(
                    new THREE.PlaneGeometry(4, 4),
                    new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0, roughness: 1 })
                );
                plane.rotation.x = -Math.PI / 2;

                // Add lights to scene-level if plugin exposes scene; otherwise anchor is fine for quick demo
                anchorGroup.add(hemi);
                anchorGroup.add(plane);
                anchorGroup.add(cube);
                log(`Added demo content to anchor for marker ${markerId}`);
            }
        }
    } catch (err) {
        log('loadMarker failed: ' + (err?.message || err));
        setStatus('Failed to load marker', 'error');
    } finally {
        loadBtn.disabled = false;
    }
}

// Wire up UI events
startBtn.addEventListener('click', () => startWebcam());
stopBtn.addEventListener('click', () => stopWebcam());
loadBtn.addEventListener('click', () => loadMarker());

// Bootstrap on load
bootstrap().catch((e) => {
    console.error('[artoolkit+three] bootstrap error:', e);
    setStatus('Initialization error', 'error');
});