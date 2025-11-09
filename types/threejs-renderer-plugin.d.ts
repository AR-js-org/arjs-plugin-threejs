/**
 * Plugin to render THREE.js scenes driven by AR markers.
 * Provides management of renderer, scene, camera and marker anchors.
 * Supported options: antialias, alpha, preferRAF, container, invertModelView, applyAxisFix
 */
export class ThreeJSRendererPlugin {
  constructor(options?: {});
  name: string;
  version: any;
  engine: any;
  emitter: any;
  renderer: any;
  scene: any;
  camera: any;
  anchors: Map<any, any>;
  options: {
    antialias: any;
    alpha: any;
    preferRAF: any;
    container: any;
    minConfidence: any;
    useLegacyAxisChain: any;
    changeMatrixMode: any;
    invertModelView: any;
    applyAxisFix: any;
    debugSceneAxes: any;
    sceneAxesSize: any;
    debugAnchorAxes: any;
    anchorAxesSize: any;
    rendererFactory: any;
  };
  _rafId: number;
  _axisFix: any;
  init(engine: any): void;
  enable(): void;
  _onUpdate: () => void;
  _onMarker: (e: any) => void;
  _onGetMarker: (e: any) => void;
  _onCamera: (e: any) => void;
  _onLegacyFound: (d: any) => void;
  _onLegacyUpdated: (d: any) => void;
  _onLegacyLost: (d: any) => void;
  _onResize: () => void;
  disable(): void;
  dispose(): void;
  _sub(ev: any, fn: any): void;
  _off(ev: any, fn: any): void;
  _adaptLegacy(
    d: any,
    visible: any,
  ): {
    id: string;
    matrix: any;
    visible: any;
    _legacy: boolean;
  };
  handleRawGetMarker(e: any): void;
  handleUnifiedMarker(evt: any): void;
  handleCamera(e: any): void;
  handleUpdate(): void;
  handleResize(): void;
  _resizeToContainer(container: any): void;
  getAnchor(id: any): any;
  getScene(): any;
  getCamera(): any;
  getRenderer(): any;
}
export const THREEJS_RENDERER_PLUGIN_VERSION: any;
//# sourceMappingURL=threejs-renderer-plugin.d.ts.map
