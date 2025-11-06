import * as n from "three";
class h {
  constructor(e = {}) {
    this.name = "threejs-renderer", this.engine = null, this.renderer = null, this.scene = null, this.camera = null, this.anchors = /* @__PURE__ */ new Map(), this.containerElement = null, this.options = {
      antialias: e.antialias !== void 0 ? e.antialias : !0,
      alpha: e.alpha !== void 0 ? e.alpha : !0,
      ...e
    };
  }
  /**
   * Initialize the plugin with AR.js engine
   */
  init(e) {
    this.engine = e, this.renderer = new n.WebGLRenderer({
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
    if (!this.engine)
      throw new Error("Plugin must be initialized before enabling");
    const e = this.options.container || document.body;
    this.containerElement = e, e.appendChild(this.renderer.domElement), this.handleResize(), this.engine.on("engine:update", this.handleUpdate.bind(this)), this.engine.on("ar:marker", this.handleMarker.bind(this)), this.engine.on("ar:camera", this.handleCamera.bind(this)), window.addEventListener("resize", this.handleResize.bind(this)), console.log("[ThreeJSRendererPlugin] Enabled");
  }
  /**
   * Disable the plugin (remove event listeners)
   */
  disable() {
    this.engine && (this.engine.off("engine:update", this.handleUpdate.bind(this)), this.engine.off("ar:marker", this.handleMarker.bind(this)), this.engine.off("ar:camera", this.handleCamera.bind(this)), window.removeEventListener("resize", this.handleResize.bind(this)), this.renderer && this.renderer.domElement && this.renderer.domElement.parentNode && this.renderer.domElement.parentNode.removeChild(this.renderer.domElement), console.log("[ThreeJSRendererPlugin] Disabled"));
  }
  /**
   * Dispose and cleanup all resources
   */
  dispose() {
    this.disable(), this.anchors.forEach((e) => {
      e.parent && e.parent.remove(e);
    }), this.anchors.clear(), this.renderer && (this.renderer.dispose(), this.renderer = null), this.scene && (this.scene = null), this.camera && (this.camera = null), this.engine = null, console.log("[ThreeJSRendererPlugin] Disposed");
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
    const { id: r, matrix: t, visible: a } = e;
    let i = this.anchors.get(r);
    i || (i = new n.Group(), i.name = `marker-${r}`, this.scene.add(i), this.anchors.set(r, i)), i.visible = a, t && Array.isArray(t) && (i.matrix.fromArray(t), i.matrix.decompose(i.position, i.quaternion, i.scale));
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
    const e = window.innerWidth, r = window.innerHeight;
    this.renderer.setSize(e, r), this.camera.aspect = e / r, this.camera.updateProjectionMatrix();
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
  h as ThreeJSRendererPlugin
};
//# sourceMappingURL=arjs-plugin-threejs.mjs.map
