// Example: AR.js-next ECS + ArtoolkitPlugin + ThreeJSRendererPlugin.
// A cube sits on the Hiro pattern and a sphere on the 3x3 barcode 0.
// The renderer is linked from this repository (file:../..); the core and the
// tracker come from npm.

import * as THREE from "three";
import {
  Engine,
  CaptureSystem,
  FramePumpSystem,
  SOURCE_TYPES,
  EVENTS,
  webcamPlugin,
  defaultProfilePlugin,
} from "@ar-js-org/ar.js-next";
import { ArtoolkitPlugin } from "@ar-js-org/arjs-plugin-artoolkit";
import { ThreeJSRendererPlugin } from "@ar-js-org/arjs-plugin-threejs";
import wasmUrl from "@ar-js-org/artoolkit5-wasm/dist/artoolkit5.wasm?url";

const statusEl = document.getElementById("status");
const logEl = document.getElementById("log");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const loadBtn = document.getElementById("loadBtn");
const viewport = document.getElementById("viewport");

function log(message) {
  const el = document.createElement("div");
  el.textContent = `[${new Date().toISOString()}] ${message}`;
  logEl.appendChild(el);
  logEl.scrollTop = logEl.scrollHeight;
  console.log(message);
}

function setStatus(msg, type = "normal") {
  statusEl.textContent = msg;
  statusEl.className = "status";
  if (type === "success") statusEl.classList.add("success");
  if (type === "error") statusEl.classList.add("error");
}

let engine;
let ctx;
let artoolkit;
let threePlugin;
let cameraStarted = false;
let workerReady = false;
let framesFlowing = false;
let markersLoaded = false;

// "Load markers" needs the worker and at least one frame: the tracker creates
// its detector from the first frame's dimensions.
function updateLoadButton() {
  loadBtn.disabled = !(workerReady && framesFlowing) || markersLoaded;
}

function videoElement() {
  return CaptureSystem.getFrameSource(ctx)?.element;
}

// The video goes under the renderer's canvas, which the plugin mounted first.
function attachVideoToViewport() {
  const videoEl = videoElement();
  if (!videoEl) return;
  videoEl.remove();
  videoEl.setAttribute("playsinline", "");
  videoEl.setAttribute("autoplay", "");
  videoEl.muted = true;
  videoEl.controls = false;
  viewport.prepend(videoEl);
}

/** What to put on each marker, by family. Units are marker widths. */
function contentFor(type) {
  if (type === "barcode") {
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 32, 16),
      new THREE.MeshNormalMaterial(),
    );
    sphere.position.z = 0.3;
    return sphere;
  }
  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 0.5),
    new THREE.MeshNormalMaterial(),
  );
  // The marker lies in the anchor's XY plane; +Z points out of it.
  cube.position.z = 0.25;
  return cube;
}

// Anchors are created on a marker's first ar:markerFound; content is added
// once per anchor and stays, shown and hidden with it.
function addContent({ markerId, type }) {
  const anchor = threePlugin.getAnchor(markerId, type);
  if (!anchor || anchor.userData.hasContent) return;
  anchor.add(contentFor(type));
  anchor.userData.hasContent = true;
}

async function bootstrap() {
  engine = new Engine();
  ctx = engine.getContext();

  engine.pluginManager.register(defaultProfilePlugin.id, defaultProfilePlugin);
  engine.pluginManager.register(webcamPlugin.id, webcamPlugin);

  // Listeners first, so an early ready is not missed.
  engine.eventBus.on(EVENTS.WORKER_READY, () => {
    workerReady = true;
    log("Worker ready");
    setStatus(
      "Worker ready. Start the webcam, then load the markers.",
      "success",
    );
    updateLoadButton();
  });
  engine.eventBus.on(EVENTS.WORKER_ERROR, (e) => {
    log(`workerError: ${e?.message}`);
    setStatus("Worker error (see the log)", "error");
  });
  engine.eventBus.on(EVENTS.ENGINE_UPDATE, (frame) => {
    // A frame produced while the webcam was stopping must not mark frames as
    // flowing again: "Load markers" would enable with no camera.
    if (!cameraStarted || !frame?.imageBitmap) return;
    if (!framesFlowing) {
      framesFlowing = true;
      updateLoadButton();
    }
  });

  await engine.pluginManager.enable(defaultProfilePlugin.id, ctx);
  await engine.pluginManager.enable(webcamPlugin.id, ctx);

  // The renderer is enabled before the tracker, so it is already listening
  // when the first frame makes the tracker emit ar:camera with the projection.
  threePlugin = new ThreeJSRendererPlugin({
    container: viewport,
    alpha: true,
    antialias: true,
    preferRAF: true,
  });
  await threePlugin.init(engine);
  await threePlugin.enable();

  // After the renderer subscribed, so the anchor exists when this runs.
  engine.eventBus.on(EVENTS.MARKER_FOUND, (e) => {
    log(`found ${e.type}:${e.markerId} confidence ${e.confidence.toFixed(2)}`);
    addContent(e);
  });
  engine.eventBus.on(EVENTS.MARKER_LOST, (e) => {
    log(`lost ${e.type}:${e.markerId}`);
  });

  artoolkit = new ArtoolkitPlugin({
    wasmUrl,
    cameraParametersUrl: "/data/camera_para.dat",
    // Patterns and barcodes in the same frame.
    detectionMode: "color_and_matrix",
    matrixCodeType: "3x3",
  });
  // register/enable return booleans and never throw.
  if (!engine.pluginManager.register("artoolkit", artoolkit)) {
    throw new Error("Could not register the ARToolKit plugin");
  }
  if (!(await engine.pluginManager.enable("artoolkit", ctx))) {
    throw new Error("Could not initialise the ARToolKit plugin");
  }
  // The plugin's own enable() starts its worker; the manager does not call it.
  await artoolkit.enable();

  engine.start();
  if (!workerReady) setStatus("Plugins initialised. Waiting for the worker…");
  startBtn.disabled = false;
}

async function startWebcam() {
  if (cameraStarted) return;
  startBtn.disabled = true;
  setStatus("Starting the webcam…");
  try {
    await CaptureSystem.initialize(
      { sourceType: SOURCE_TYPES.WEBCAM, sourceWidth: 640, sourceHeight: 480 },
      ctx,
    );
    attachVideoToViewport();
    FramePumpSystem.start(ctx);
    cameraStarted = true;
    stopBtn.disabled = false;
    setStatus(
      "Webcam started. Load the markers, then show them to the camera.",
      "success",
    );
    log("Webcam started");
  } catch (err) {
    log(`Camera error: ${err?.message || err}`);
    setStatus("Camera error (see the log)", "error");
    startBtn.disabled = false;
  }
}

async function stopWebcam() {
  if (!cameraStarted) return;
  // Stopped first, so a frame still in flight is ignored by the listener.
  cameraStarted = false;
  framesFlowing = false;
  // Taken before dispose, which removes the frame-source resource the
  // element is looked up from.
  const videoEl = videoElement();
  FramePumpSystem.stop(ctx);
  await CaptureSystem.dispose(ctx);
  videoEl?.remove();
  stopBtn.disabled = true;
  startBtn.disabled = false;
  updateLoadButton();
  setStatus("Webcam stopped.", "success");
  log("Webcam stopped");
}

async function loadMarkers() {
  loadBtn.disabled = true;
  setStatus("Loading markers…");
  try {
    const hiro = await artoolkit.loadMarker("/data/patt.hiro", 1);
    log(`loadMarker hiro: ${JSON.stringify(hiro)}`);
    const barcode = await artoolkit.trackBarcode(0, 1);
    log(`trackBarcode 0: ${JSON.stringify(barcode)}`);
    markersLoaded = true;
    setStatus(
      "Markers loaded: show the Hiro pattern or barcode 0 to the camera.",
      "success",
    );
  } catch (err) {
    log(`Loading markers failed: ${err?.message || err}`);
    setStatus("Loading markers failed (see the log)", "error");
  } finally {
    updateLoadButton();
  }
}

startBtn.addEventListener("click", () => startWebcam());
stopBtn.addEventListener("click", () => stopWebcam());
loadBtn.addEventListener("click", () => loadMarkers());

bootstrap().catch((e) => {
  console.error("[threejs-example] bootstrap error:", e);
  log(`Initialisation error: ${e?.message || e}`);
  setStatus(`Initialisation error: ${e?.message || e}`, "error");
});
