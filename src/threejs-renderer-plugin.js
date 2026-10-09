import * as THREE from "three";
import { markerKey, normalizeMarker, toMatrix16 } from "./marker.js";

// Version injected at build time by Vite define.
// If the define is missing (e.g. in a non-Vite test harness), fallback to 'unknown'.
const THREEJS_RENDERER_PLUGIN_VERSION =
  typeof __THREEJS_RENDERER_PLUGIN_VERSION__ !== "undefined"
    ? __THREEJS_RENDERER_PLUGIN_VERSION__
    : "unknown";

export { THREEJS_RENDERER_PLUGIN_VERSION };
/**
 * Plugin to render THREE.js scenes driven by AR markers.
 * Provides management of renderer, scene, camera and marker anchors.
 * Supported options: antialias, alpha, preferRAF, container, invertModelView, applyAxisFix
 */

export class ThreeJSRendererPlugin {
  constructor(options = {}) {
    this.name = "threejs-renderer";
    this.version = THREEJS_RENDERER_PLUGIN_VERSION;

    this.engine = null;
    this.emitter = null; // engine.eventBus preferred
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.anchors = new Map();

    // An option passed as undefined keeps its default rather than erasing it.
    const given = Object.fromEntries(
      Object.entries(options).filter(([, value]) => value !== undefined),
    );

    // useLegacyAxisChain (0.1.x) is replaced by matrixConvention.
    if (given.useLegacyAxisChain !== undefined) {
      console.warn(
        "[ThreeJSRendererPlugin] useLegacyAxisChain is replaced by matrixConvention ('webgl' | 'legacy').",
      );
      given.matrixConvention ??= given.useLegacyAxisChain ? "legacy" : "webgl";
      delete given.useLegacyAxisChain;
    }

    this.options = {
      antialias: true,
      alpha: true,
      preferRAF: true, // render even if engine:update absent
      container: null, // DOM node to mount canvas
      minConfidence: 0, // markers below this confidence are ignored

      // 'webgl': the matrix is used as is, the convention arjs-plugin-artoolkit
      // >= 0.2.0 emits. 'legacy': the classic AR.js axis chain, for
      // artoolkit5-js poses.
      matrixConvention: "webgl",
      changeMatrixMode: "modelViewMatrix", // 'legacy' only

      // 'webgl' only
      invertModelView: false,
      applyAxisFix: false,

      // Debug helpers (default off)
      debugSceneAxes: false,
      sceneAxesSize: 2,
      debugAnchorAxes: false,
      anchorAxesSize: 0.5,
      // Dependency injection for tests
      rendererFactory: null,
      ...given,
    };

    // Set once an AR projection arrives on ar:camera; a resize then leaves it.
    this._hasArProjection = false;

    this._rafId = 0;

    // For experimental path only
    this._axisFix = new THREE.Matrix4()
      .makeRotationY(Math.PI)
      .multiply(new THREE.Matrix4().makeRotationZ(Math.PI));

    console.log(`[ThreeJSRendererPlugin] v${this.version} constructed`, {
      matrixConvention: this.options.matrixConvention,
      changeMatrixMode: this.options.changeMatrixMode,
      preferRAF: this.options.preferRAF,
      debugSceneAxes: this.options.debugSceneAxes,
      debugAnchorAxes: this.options.debugAnchorAxes,
    });
  }

  init(engine) {
    this.engine = engine;
    this.emitter = engine?.eventBus || engine;

    // Allow injection of a factory for tests
    if (typeof this.options.rendererFactory === "function") {
      this.renderer = this.options.rendererFactory({
        antialias: this.options.antialias,
        alpha: this.options.alpha,
      });
    } else {
      this.renderer = new THREE.WebGLRenderer({
        antialias: this.options.antialias,
        alpha: this.options.alpha,
        preserveDrawingBuffer: false,
      });
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.renderer.setClearColor(0x000000, 0);
    }

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.01, 2000);

    // Lighting
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(1, 1, 1);
    this.scene.add(dir);

    console.log("[ThreeJSRendererPlugin] Initialized", {
      hasEventBus: !!engine?.eventBus,
      version: this.version,
    });
  }

  enable() {
    const container = this.options.container || document.body;
    container.appendChild(this.renderer.domElement);
    this._resizeToContainer(container);

    Object.assign(this.renderer.domElement.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      zIndex: "2",
      display: "block",
      pointerEvents: "none",
    });

    this._onUpdate = () => this.handleUpdate();
    this._onMarker = (e) => this.handleUnifiedMarker(e);
    this._onCamera = (e) => this.handleCamera(e);
    this._onLegacyFound = (d) => this._applyMarker(normalizeMarker(d, true));
    this._onLegacyUpdated = (d) => this._applyMarker(normalizeMarker(d, true));
    this._onLegacyLost = (d) => this._applyMarker(normalizeMarker(d, false));
    this._onResize = () => this.handleResize();

    this._sub("engine:update", this._onUpdate);
    this._sub("ar:marker", this._onMarker);
    this._sub("ar:camera", this._onCamera);
    this._sub("ar:markerFound", this._onLegacyFound);
    this._sub("ar:markerUpdated", this._onLegacyUpdated);
    this._sub("ar:markerLost", this._onLegacyLost);

    window.addEventListener("resize", this._onResize);

    if (this.options.preferRAF) {
      const loop = () => {
        this._rafId = requestAnimationFrame(loop);
        this.handleUpdate();
      };
      this._rafId = requestAnimationFrame(loop);
    }

    // Debug: scene axes (optional)
    if (this.options.debugSceneAxes) {
      this.scene.add(new THREE.AxesHelper(this.options.sceneAxesSize));
    }

    console.log("[ThreeJSRendererPlugin] Enabled v" + this.version);
  }

  disable() {
    if (this.emitter?.off) {
      this._off("engine:update", this._onUpdate);
      this._off("ar:marker", this._onMarker);
      this._off("ar:camera", this._onCamera);
      this._off("ar:markerFound", this._onLegacyFound);
      this._off("ar:markerUpdated", this._onLegacyUpdated);
      this._off("ar:markerLost", this._onLegacyLost);
    }
    window.removeEventListener("resize", this._onResize);
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._rafId = 0;
    if (this.renderer?.domElement?.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
    console.log("[ThreeJSRendererPlugin] Disabled v" + this.version);
  }

  dispose() {
    this.disable();
    this.anchors.forEach((a) => a.parent?.remove(a));
    this.anchors.clear();
    this.renderer?.dispose?.();
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.engine = null;
    this.emitter = null;
    console.log("[ThreeJSRendererPlugin] Disposed v" + this.version);
  }

  _sub(ev, fn) {
    try {
      this.emitter?.on?.(ev, fn);
    } catch {}
  }
  _off(ev, fn) {
    try {
      this.emitter?.off?.(ev, fn);
    } catch {}
  }

  /**
   * Handles `ar:marker`, the renderer's own unified event
   * `{ id | markerId, type?, matrix?, visible? }`. Marker events from
   * arjs-plugin-artoolkit arrive through the same path.
   *
   * @param {Object} evt - The event payload
   * @returns {void}
   */
  handleUnifiedMarker(evt) {
    this._applyMarker(normalizeMarker(evt, evt?.visible));
  }

  /**
   * Creates or updates the anchor for a normalised marker.
   *
   * @param {import("./marker.js").NormalizedMarker|null} marker
   * @returns {void}
   * @private
   */
  _applyMarker(marker) {
    if (!marker || !this.scene) return;
    const { key, matrix, visible, confidence } = marker;

    // Found/updated below minConfidence is ignored; a loss always applies.
    if (
      visible !== false &&
      confidence !== undefined &&
      confidence < this.options.minConfidence
    ) {
      return;
    }

    let anchor = this.anchors.get(key);
    if (!anchor) {
      // A loss for a marker never seen has nothing to hide.
      if (visible === false) return;
      anchor = new THREE.Group();
      anchor.name = `marker-${key}`;
      anchor.matrixAutoUpdate = false;
      // Debug: anchor axes (optional)
      if (this.options.debugAnchorAxes) {
        anchor.add(new THREE.AxesHelper(this.options.anchorAxesSize));
      }
      this.scene.add(anchor);
      this.anchors.set(key, anchor);
      console.log("[ThreeJSRendererPlugin] anchor created", key);
    }

    if (typeof visible === "boolean") anchor.visible = visible;

    if (visible !== false) {
      // Copied: the detector reuses its buffers between frames.
      anchor.userData = {
        ...anchor.userData,
        markerId: marker.markerId,
        type: marker.type,
        confidence,
        vertex: marker.vertex?.map((corner) => [corner[0], corner[1]]),
        dir: marker.dir,
      };
    }

    const pose = toMatrix16(matrix);
    if (pose && visible !== false) {
      const modelView = new THREE.Matrix4().fromArray(pose);

      let final;
      if (this.options.matrixConvention === "legacy") {
        // Legacy chain: R_y(π) * R_z(π) * modelView * R_x(π/2)
        const projectionAxis = new THREE.Matrix4()
          .makeRotationY(Math.PI)
          .multiply(new THREE.Matrix4().makeRotationZ(Math.PI));
        const markerAxis = new THREE.Matrix4().makeRotationX(Math.PI / 2);
        final = new THREE.Matrix4()
          .copy(projectionAxis)
          .multiply(modelView)
          .multiply(markerAxis);

        if (this.options.changeMatrixMode === "cameraTransformMatrix") {
          final.invert();
        }
      } else {
        // 'webgl': already in the Three.js convention
        final = modelView.clone();
        if (this.options.invertModelView) final.invert();
        if (this.options.applyAxisFix) final.multiply(this._axisFix);
      }

      anchor.matrix.copy(final);
      anchor.matrix.decompose(anchor.position, anchor.quaternion, anchor.scale);
    }
  }

  handleCamera(e) {
    const arr = toMatrix16(e?.projectionMatrix) ?? toMatrix16(e?.matrix);
    if (arr) {
      this._hasArProjection = true;
      this.camera.projectionMatrix.fromArray(arr);
      this.camera.projectionMatrixInverse
        .copy(this.camera.projectionMatrix)
        .invert();
      console.log(
        "[ThreeJSRendererPlugin] Projection applied v" + this.version,
      );
    }
  }

  handleUpdate() {
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  handleResize() {
    const container = this.options.container || document.body;
    this._resizeToContainer(container);
  }

  _resizeToContainer(container) {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || Math.round((w * 3) / 4);
    this.renderer.setSize?.(w, h);
    // updateProjectionMatrix() rebuilds a generic perspective projection,
    // which would replace the AR one from ar:camera.
    if (!this._hasArProjection) {
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
  }

  /**
   * The anchor of a marker, keyed by family: pattern and barcode IDs both
   * start at 0.
   *
   * @param {number|string} markerId - The marker's ID within its family
   * @param {import("./marker.js").MarkerType} [type='pattern'] - The marker family
   * @returns {THREE.Group|undefined} The anchor, once the marker has been seen
   */
  getAnchor(markerId, type = "pattern") {
    return this.anchors.get(markerKey(markerId, type));
  }
  getScene() {
    return this.scene;
  }
  getCamera() {
    return this.camera;
  }
  getRenderer() {
    return this.renderer;
  }
}
