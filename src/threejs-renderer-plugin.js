import * as THREE from "three";

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

    this.options = {
      antialias: options.antialias ?? true,
      alpha: options.alpha ?? true,
      preferRAF: options.preferRAF ?? true, // render even if engine:update absent
      container: options.container || null, // DOM node to mount canvas
      minConfidence: options.minConfidence ?? 0, // optional filter for e.marker.confidence

      // Legacy AR.js transform chain (defaults match classic AR.js)
      useLegacyAxisChain: options.useLegacyAxisChain ?? true,
      changeMatrixMode: options.changeMatrixMode || "modelViewMatrix",

      // Experimental (ignored if useLegacyAxisChain = true)
      invertModelView: options.invertModelView ?? false,
      applyAxisFix: options.applyAxisFix ?? false,

      // NEW: Debug helpers (default off)
      debugSceneAxes: options.debugSceneAxes ?? false,
      sceneAxesSize: options.sceneAxesSize ?? 2,
      debugAnchorAxes: options.debugAnchorAxes ?? false,
      anchorAxesSize: options.anchorAxesSize ?? 0.5,
      // NEW: dependency injection for tests
      rendererFactory: options.rendererFactory || null,
      ...options,
    };

    this._rafId = 0;

    // For experimental path only
    this._axisFix = new THREE.Matrix4()
      .makeRotationY(Math.PI)
      .multiply(new THREE.Matrix4().makeRotationZ(Math.PI));

    console.log(`[ThreeJSRendererPlugin] v${this.version} constructed`, {
      legacyAxisChain: this.options.useLegacyAxisChain,
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
    this._onGetMarker = (e) => this.handleRawGetMarker(e);
    this._onCamera = (e) => this.handleCamera(e);
    this._onLegacyFound = (d) =>
      this.handleUnifiedMarker(this._adaptLegacy(d, true));
    this._onLegacyUpdated = (d) =>
      this.handleUnifiedMarker(this._adaptLegacy(d, true));
    this._onLegacyLost = (d) =>
      this.handleUnifiedMarker(this._adaptLegacy(d, false));
    this._onResize = () => this.handleResize();

    this._sub("engine:update", this._onUpdate);
    this._sub("ar:marker", this._onMarker);
    this._sub("ar:getMarker", this._onGetMarker);
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
      this._off("ar:getMarker", this._onGetMarker);
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

  _adaptLegacy(d, visible) {
    return {
      id: String(d?.markerId ?? d?.id ?? "0"),
      matrix:
        d?.matrix ||
        d?.transformationMatrix ||
        d?.modelViewMatrix ||
        d?.poseMatrix ||
        null,
      visible,
      _legacy: true,
    };
  }

  handleRawGetMarker(e) {
    if (!e) return;
    const confidence = e?.marker?.confidence;
    if (confidence !== undefined && confidence < this.options.minConfidence)
      return;
    const id = String(
      e?.marker?.markerId ??
        e?.marker?.id ??
        e?.marker?.pattHandle ??
        e?.marker?.uid ??
        e?.marker?.index ??
        "0",
    );
    const matrix = e?.matrix;
    this.handleUnifiedMarker({
      id,
      matrix,
      visible: true,
      _source: "ar:getMarker",
    });
  }

  handleUnifiedMarker(evt) {
    const { id, matrix, visible } = evt || {};
    if (id == null) return;

    let anchor = this.anchors.get(id);
    if (!anchor) {
      anchor = new THREE.Group();
      anchor.name = `marker-${id}`;
      anchor.matrixAutoUpdate = false;
      // Debug: anchor axes (optional)
      if (this.options.debugAnchorAxes) {
        anchor.add(new THREE.AxesHelper(this.options.anchorAxesSize));
      }
      this.scene.add(anchor);
      this.anchors.set(id, anchor);
      console.log("[ThreeJSRendererPlugin] anchor created", id);
    }

    if (typeof visible === "boolean") anchor.visible = visible;

    if (Array.isArray(matrix) && matrix.length === 16) {
      const modelView = new THREE.Matrix4().fromArray(matrix);

      let final;
      if (this.options.useLegacyAxisChain) {
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
        // Experimental path
        final = modelView.clone();
        if (this.options.invertModelView) final.invert();
        if (this.options.applyAxisFix) final.multiply(this._axisFix);
      }

      anchor.matrix.copy(final);
      anchor.matrix.decompose(anchor.position, anchor.quaternion, anchor.scale);
    }
  }

  handleCamera(e) {
    const arr = e?.projectionMatrix || e?.matrix;
    if (Array.isArray(arr) && arr.length === 16) {
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
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  getAnchor(id) {
    return this.anchors.get(String(id));
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
