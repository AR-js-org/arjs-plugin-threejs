import * as t from "three";
class c {
  constructor(e = {}) {
    this.name = "threejs-renderer", this.engine = null, this.emitter = null, this.renderer = null, this.scene = null, this.camera = null, this.anchors = /* @__PURE__ */ new Map(), this.options = {
      antialias: e.antialias ?? !0,
      alpha: e.alpha ?? !0,
      preferRAF: e.preferRAF ?? !0,
      container: e.container || null,
      minConfidence: e.minConfidence ?? 0,
      // Legacy AR.js transform chain
      useLegacyAxisChain: e.useLegacyAxisChain ?? !0,
      changeMatrixMode: e.changeMatrixMode || "modelViewMatrix",
      // Experimental (ignored if useLegacyAxisChain = true)
      invertModelView: e.invertModelView ?? !1,
      applyAxisFix: e.applyAxisFix ?? !1,
      ...e
    }, this._rafId = 0, this._axisFix = new t.Matrix4().makeRotationY(Math.PI).multiply(new t.Matrix4().makeRotationZ(Math.PI));
  }
  init(e) {
    this.engine = e, this.emitter = e?.eventBus || e, this.renderer = new t.WebGLRenderer({
      antialias: this.options.antialias,
      alpha: this.options.alpha,
      preserveDrawingBuffer: !1
    }), this.renderer.setPixelRatio(window.devicePixelRatio), this.renderer.setClearColor(0, 0), this.scene = new t.Scene(), this.camera = new t.PerspectiveCamera(60, 1, 0.01, 2e3), this.scene.add(new t.AmbientLight(16777215, 0.6));
    const i = new t.DirectionalLight(16777215, 0.6);
    i.position.set(1, 1, 1), this.scene.add(i), console.log("[ThreeJSRendererPlugin] Initialized", { hasEventBus: !!e?.eventBus });
  }
  enable() {
    const e = this.options.container || document.body;
    if (e.appendChild(this.renderer.domElement), this._resizeToContainer(e), Object.assign(this.renderer.domElement.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      zIndex: "2",
      display: "block",
      pointerEvents: "none"
    }), this._onUpdate = () => this.handleUpdate(), this._onMarker = (i) => this.handleUnifiedMarker(i), this._onGetMarker = (i) => this.handleRawGetMarker(i), this._onCamera = (i) => this.handleCamera(i), this._onLegacyFound = (i) => this.handleUnifiedMarker(this._adaptLegacy(i, !0)), this._onLegacyUpdated = (i) => this.handleUnifiedMarker(this._adaptLegacy(i, !0)), this._onLegacyLost = (i) => this.handleUnifiedMarker(this._adaptLegacy(i, !1)), this._onResize = () => this.handleResize(), this._sub("engine:update", this._onUpdate), this._sub("ar:marker", this._onMarker), this._sub("ar:getMarker", this._onGetMarker), this._sub("ar:camera", this._onCamera), this._sub("ar:markerFound", this._onLegacyFound), this._sub("ar:markerUpdated", this._onLegacyUpdated), this._sub("ar:markerLost", this._onLegacyLost), window.addEventListener("resize", this._onResize), this.options.preferRAF) {
      const i = () => {
        this._rafId = requestAnimationFrame(i), this.handleUpdate();
      };
      this._rafId = requestAnimationFrame(i);
    }
    this.scene.add(new t.AxesHelper(2)), console.log("[ThreeJSRendererPlugin] Enabled");
  }
  disable() {
    this.emitter?.off && (this._off("engine:update", this._onUpdate), this._off("ar:marker", this._onMarker), this._off("ar:getMarker", this._onGetMarker), this._off("ar:camera", this._onCamera), this._off("ar:markerFound", this._onLegacyFound), this._off("ar:markerUpdated", this._onLegacyUpdated), this._off("ar:markerLost", this._onLegacyLost)), window.removeEventListener("resize", this._onResize), this._rafId && cancelAnimationFrame(this._rafId), this._rafId = 0, this.renderer?.domElement?.parentNode && this.renderer.domElement.parentNode.removeChild(this.renderer.domElement), console.log("[ThreeJSRendererPlugin] Disabled");
  }
  dispose() {
    this.disable(), this.anchors.forEach((e) => e.parent?.remove(e)), this.anchors.clear(), this.renderer?.dispose(), this.renderer = null, this.scene = null, this.camera = null, this.engine = null, this.emitter = null, console.log("[ThreeJSRendererPlugin] Disposed");
  }
  _sub(e, i) {
    try {
      this.emitter?.on?.(e, i);
    } catch {
    }
  }
  _off(e, i) {
    try {
      this.emitter?.off?.(e, i);
    } catch {
    }
  }
  _adaptLegacy(e, i) {
    return {
      id: String(e?.markerId ?? e?.id ?? "0"),
      matrix: e?.matrix || e?.transformationMatrix || e?.modelViewMatrix || e?.poseMatrix || null,
      visible: i,
      _legacy: !0
    };
  }
  handleRawGetMarker(e) {
    if (!e) return;
    const i = e?.marker?.confidence;
    if (i !== void 0 && i < this.options.minConfidence) return;
    const a = String(
      e?.marker?.markerId ?? e?.marker?.id ?? e?.marker?.pattHandle ?? e?.marker?.uid ?? e?.marker?.index ?? "0"
    ), s = e?.matrix;
    this.handleUnifiedMarker({ id: a, matrix: s, visible: !0, _source: "ar:getMarker" });
  }
  handleUnifiedMarker(e) {
    const { id: i, matrix: a, visible: s } = e || {};
    if (i == null) return;
    let r = this.anchors.get(i);
    if (r || (r = new t.Group(), r.name = `marker-${i}`, r.matrixAutoUpdate = !1, r.add(new t.AxesHelper(0.5)), this.scene.add(r), this.anchors.set(i, r), console.log("[ThreeJSRendererPlugin] anchor created", i)), typeof s == "boolean" && (r.visible = s), Array.isArray(a) && a.length === 16) {
      const o = new t.Matrix4().fromArray(a);
      let n;
      if (this.options.useLegacyAxisChain) {
        const h = new t.Matrix4().makeRotationY(Math.PI).multiply(new t.Matrix4().makeRotationZ(Math.PI)), d = new t.Matrix4().makeRotationX(Math.PI / 2);
        n = new t.Matrix4().copy(h).multiply(o).multiply(d), this.options.changeMatrixMode === "cameraTransformMatrix" && n.invert();
      } else
        n = o.clone(), this.options.invertModelView && n.invert(), this.options.applyAxisFix && n.multiply(this._axisFix);
      r.matrix.copy(n), r.matrix.decompose(r.position, r.quaternion, r.scale);
    }
  }
  handleCamera(e) {
    const i = e?.projectionMatrix || e?.matrix;
    Array.isArray(i) && i.length === 16 && (this.camera.projectionMatrix.fromArray(i), this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert(), console.log("[ThreeJSRendererPlugin] Projection applied"));
  }
  handleUpdate() {
    this.renderer && this.scene && this.camera && this.renderer.render(this.scene, this.camera);
  }
  handleResize() {
    const e = this.options.container || document.body;
    this._resizeToContainer(e);
  }
  _resizeToContainer(e) {
    const i = e.clientWidth || window.innerWidth, a = e.clientHeight || Math.round(i * 3 / 4);
    this.renderer.setSize(i, a), this.camera.aspect = i / a, this.camera.updateProjectionMatrix();
  }
  getAnchor(e) {
    return this.anchors.get(String(e));
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
export {
  c as ThreeJSRendererPlugin
};
//# sourceMappingURL=arjs-plugin-threejs.mjs.map
