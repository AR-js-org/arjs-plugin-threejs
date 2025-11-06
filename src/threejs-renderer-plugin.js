import * as THREE from 'three';

/**
 * ThreeJSRendererPlugin - Minimal Three.js renderer plugin for AR.js-core
 * 
 * Lifecycle:
 * - init: create renderer, scene, camera
 * - enable: attach renderer to DOM, subscribe to events
 * - disable: remove event listeners
 * - dispose: cleanup Three.js resources
 */
export class ThreeJSRendererPlugin {
  constructor(options = {}) {
    this.name = 'threejs-renderer';
    this.engine = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.anchors = new Map();
    this.containerElement = null;
    
    // Store bound event handlers for proper removal
    this.boundHandleUpdate = null;
    this.boundHandleMarker = null;
    this.boundHandleCamera = null;
    this.boundHandleResize = null;
    
    // Store options
    this.options = {
      antialias: options.antialias !== undefined ? options.antialias : true,
      alpha: options.alpha !== undefined ? options.alpha : true,
      ...options
    };
  }

  /**
   * Initialize the plugin with AR.js engine
   */
  init(engine) {
    this.engine = engine;
    
    // Create Three.js renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: this.options.antialias,
      alpha: this.options.alpha
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(0x000000, 0);
    
    // Create scene
    this.scene = new THREE.Scene();
    
    // Create camera (AR camera will be configured on ar:camera event)
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 0);
    
    console.log('[ThreeJSRendererPlugin] Initialized');
  }

  /**
   * Enable the plugin (attach to DOM and subscribe to events)
   */
  enable() {
    if (!this.engine) {
      throw new Error('Plugin must be initialized before enabling');
    }

    // Attach renderer to container element or body
    const container = this.options.container || document.body;
    this.containerElement = container;
    container.appendChild(this.renderer.domElement);
    
    // Set initial size
    this.handleResize();
    
    // Bind event handlers once and store references
    this.boundHandleUpdate = this.handleUpdate.bind(this);
    this.boundHandleMarker = this.handleMarker.bind(this);
    this.boundHandleCamera = this.handleCamera.bind(this);
    this.boundHandleResize = this.handleResize.bind(this);
    
    // Subscribe to engine events
    this.engine.on('engine:update', this.boundHandleUpdate);
    this.engine.on('ar:marker', this.boundHandleMarker);
    this.engine.on('ar:camera', this.boundHandleCamera);
    
    // Handle window resize
    window.addEventListener('resize', this.boundHandleResize);
    
    console.log('[ThreeJSRendererPlugin] Enabled');
  }

  /**
   * Disable the plugin (remove event listeners)
   */
  disable() {
    if (!this.engine) return;
    
    // Unsubscribe from engine events using stored bound references
    if (this.boundHandleUpdate) {
      this.engine.off('engine:update', this.boundHandleUpdate);
    }
    if (this.boundHandleMarker) {
      this.engine.off('ar:marker', this.boundHandleMarker);
    }
    if (this.boundHandleCamera) {
      this.engine.off('ar:camera', this.boundHandleCamera);
    }
    
    // Remove resize listener using stored bound reference
    if (this.boundHandleResize) {
      window.removeEventListener('resize', this.boundHandleResize);
    }
    
    // Clear bound references
    this.boundHandleUpdate = null;
    this.boundHandleMarker = null;
    this.boundHandleCamera = null;
    this.boundHandleResize = null;
    
    // Remove renderer from DOM
    if (this.renderer && this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
    
    console.log('[ThreeJSRendererPlugin] Disabled');
  }

  /**
   * Dispose and cleanup all resources
   */
  dispose() {
    this.disable();
    
    // Clear anchors
    this.anchors.forEach((anchor) => {
      if (anchor.parent) {
        anchor.parent.remove(anchor);
      }
    });
    this.anchors.clear();
    
    // Dispose Three.js resources
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
    
    if (this.scene) {
      this.scene = null;
    }
    
    if (this.camera) {
      this.camera = null;
    }
    
    this.engine = null;
    
    console.log('[ThreeJSRendererPlugin] Disposed');
  }

  /**
   * Handle engine update event - render the scene
   */
  handleUpdate() {
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  /**
   * Handle marker event - create/update marker anchors
   */
  handleMarker(event) {
    const { id, matrix, visible } = event;
    
    let anchor = this.anchors.get(id);
    
    if (!anchor) {
      // Create new anchor (Group) for this marker
      anchor = new THREE.Group();
      anchor.name = `marker-${id}`;
      this.scene.add(anchor);
      this.anchors.set(id, anchor);
    }
    
    // Update visibility
    anchor.visible = visible;
    
    // Update transform matrix if provided
    if (matrix && Array.isArray(matrix)) {
      anchor.matrix.fromArray(matrix);
      anchor.matrix.decompose(anchor.position, anchor.quaternion, anchor.scale);
    }
  }

  /**
   * Handle camera event - update camera projection
   */
  handleCamera(event) {
    if (event.projectionMatrix && Array.isArray(event.projectionMatrix)) {
      this.setProjectionFromArray(event.projectionMatrix);
    }
  }

  /**
   * Handle window resize
   */
  handleResize() {
    if (!this.renderer || !this.camera) return;
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Set camera projection matrix from array (column-major 4x4)
   */
  setProjectionFromArray(array) {
    if (!this.camera || !Array.isArray(array) || array.length !== 16) {
      console.warn('[ThreeJSRendererPlugin] Invalid projection matrix');
      return;
    }
    
    this.camera.projectionMatrix.fromArray(array);
    this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
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
  getAnchor(markerId) {
    return this.anchors.get(markerId);
  }
}
