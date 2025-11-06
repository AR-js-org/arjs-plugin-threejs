import * as n from "three";
class d {
  constructor(e = {}) {
    this.name = "threejs-renderer", this.engine = null, this.renderer = null, this.scene = null, this.camera = null, this.anchors = /* @__PURE__ */ new Map(), this.containerElement = null, this.boundHandleUpdate = null, this.boundHandleMarker = null, this.boundHandleCamera = null, this.boundHandleResize = null, this.options = {
      antialias: e.antialias !== void 0 ? e.antialias : !0,
      alpha: e.alpha !== void 0 ? e.alpha : !0,
      ...e
    };
  }
  /**
   * Initialize the plugin with AR.js engine
   */
  init(e) {
    this.core = e, this.renderer = new n.WebGLRenderer({
      antialias: this.options.antialias,
      alpha: this.options.alpha
    }), this.renderer.setPixelRatio(window.devicePixelRatio), this.renderer.setClearColor(0, 0), this.scene = new n.Scene(), this.camera = new n.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1e3
    ), this.camera.position.set(0, 0, 0), console.log("[ThreeJSRendererPlugin] Initialized");
  }
  /**
   * Enable the plugin (attach to DOM and subscribe to events)
   */
  enable() {
    if (!this.core)
      throw new Error("Plugin must be initialized before enabling");
    const e = this.options.container || document.body;
    this.containerElement = e, e.appendChild(this.renderer.domElement), this.handleResize(), this.boundHandleUpdate = this.handleUpdate.bind(this), this.boundHandleMarker = this.handleMarker.bind(this), this.boundHandleCamera = this.handleCamera.bind(this), this.boundHandleResize = this.handleResize.bind(this), this.core.eventBus.on("engine:update", this.boundHandleUpdate), this.core.eventBus.on("ar:marker", this.boundHandleMarker), this.core.eventBus.on("ar:camera", this.boundHandleCamera), window.addEventListener("resize", this.boundHandleResize), console.log("[ThreeJSRendererPlugin] Enabled");
  }
  /**
   * Disable the plugin (remove event listeners)
   */
  disable() {
    this.core && (this.boundHandleUpdate && this.core.off("engine:update", this.boundHandleUpdate), this.boundHandleMarker && this.core.off("ar:marker", this.boundHandleMarker), this.boundHandleCamera && this.core.off("ar:camera", this.boundHandleCamera), this.boundHandleResize && window.removeEventListener("resize", this.boundHandleResize), this.boundHandleUpdate = null, this.boundHandleMarker = null, this.boundHandleCamera = null, this.boundHandleResize = null, this.renderer && this.renderer.domElement && this.renderer.domElement.parentNode && this.renderer.domElement.parentNode.removeChild(this.renderer.domElement), console.log("[ThreeJSRendererPlugin] Disabled"));
  }
  /**
   * Dispose and cleanup all resources
   */
  dispose() {
    this.disable(), this.anchors.forEach((e) => {
      e.parent && e.parent.remove(e);
    }), this.anchors.clear(), this.renderer && (this.renderer.dispose(), this.renderer = null), this.scene && (this.scene = null), this.camera && (this.camera = null), this.core = null, console.log("[ThreeJSRendererPlugin] Disposed");
  }
  /**
   * Handle engine update event - render the scene
   */
  handleUpdate() {
    this.renderer && this.scene && this.camera && this.renderer.render(this.scene, this.camera);
  }
  /**
   * Handle marker event - create/update marker anchors
   */
  handleMarker(e) {
    const { id: i, matrix: t, visible: a } = e;
    let r = this.anchors.get(i);
    r || (r = new n.Group(), r.name = `marker-${i}`, this.scene.add(r), this.anchors.set(i, r)), r.visible = a, t && Array.isArray(t) && (r.matrix.fromArray(t), r.matrix.decompose(r.position, r.quaternion, r.scale));
  }
  /**
   * Handle camera event - update camera projection
   */
  handleCamera(e) {
    e.projectionMatrix && Array.isArray(e.projectionMatrix) && this.setProjectionFromArray(e.projectionMatrix);
  }
  /**
   * Handle window resize
   */
  handleResize() {
    if (!this.renderer || !this.camera) return;
    const e = window.innerWidth, i = window.innerHeight;
    this.renderer.setSize(e, i), this.camera.aspect = e / i, this.camera.updateProjectionMatrix();
  }
  /**
   * Set camera projection matrix from array (column-major 4x4)
   */
  setProjectionFromArray(e) {
    if (!this.camera || !Array.isArray(e) || e.length !== 16) {
      console.warn("[ThreeJSRendererPlugin] Invalid projection matrix");
      return;
    }
    this.camera.projectionMatrix.fromArray(e), this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
  }
  /**
   * Get Three.js scene for adding custom objects
   */
  getScene() {
    return this.scene;
  }
  /**
   * Get Three.js camera
   */
  getCamera() {
    return this.camera;
  }
  /**
   * Get Three.js renderer
   */
  getRenderer() {
    return this.renderer;
  }
  /**
   * Get anchor by marker ID
   */
  getAnchor(e) {
    return this.anchors.get(e);
  }
}
export {
  d as ThreeJSRendererPlugin
};
//# sourceMappingURL=arjs-plugin-threejs.mjs.map
