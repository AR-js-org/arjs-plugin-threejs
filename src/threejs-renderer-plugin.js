import * as THREE from 'three';

/**
 * ThreeJSRendererPlugin - A Three.js renderer plugin for AR.js-core
 * 
 * This plugin integrates with AR.js-core's ECS context via the plugin lifecycle
 * (init/enable/disable/dispose), subscribes to engine events, and renders a 
 * Three.js scene that reacts to marker events.
 */
export class ThreeJSRendererPlugin {
  /**
   * @param {Object} options - Configuration options
   * @param {HTMLElement|string} options.container - Container element or CSS selector
   * @param {boolean} options.autoResize - Enable automatic resize handling (default: true)
   * @param {Object} options.rendererOptions - Options passed to THREE.WebGLRenderer
   * @param {Object} options.cameraOptions - Options for camera setup
   */
  constructor(options = {}) {
    this.options = {
      container: options.container || document.body,
      autoResize: options.autoResize !== false,
      rendererOptions: options.rendererOptions || { alpha: true, antialias: true },
      cameraOptions: options.cameraOptions || {}
    };

    // Core Three.js objects
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.canvas = null;

    // AR.js-core context
    this.ctx = null;

    // Anchor management: Map of markerId -> Object3D
    this.anchors = new Map();

    // Event listeners (for cleanup)
    this.listeners = new Map();

    // State
    this.enabled = false;
    this.isInitialized = false;
  }

  /**
   * Initialize the plugin with AR.js-core context
   * @param {Object} ctx - AR.js-core context
   */
  async init(ctx) {
    if (this.isInitialized) {
      console.warn('ThreeJSRendererPlugin: Already initialized');
      return;
    }

    this.ctx = ctx;

    // Resolve container element
    const container = typeof this.options.container === 'string'
      ? document.querySelector(this.options.container)
      : this.options.container;

    if (!container) {
      throw new Error('ThreeJSRendererPlugin: Container element not found');
    }

    this.container = container;

    // Create Three.js renderer
    this.renderer = new THREE.WebGLRenderer({
      ...this.options.rendererOptions,
      alpha: true // Always enable alpha for AR overlay
    });

    this.canvas = this.renderer.domElement;

    // Set initial size
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    // Create scene
    this.scene = new THREE.Scene();

    // Create camera
    const cameraOptions = this.options.cameraOptions;
    const aspect = width / height;
    const fov = cameraOptions.fov || 60;
    const near = cameraOptions.near || 0.1;
    const far = cameraOptions.far || 1000;

    this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this.camera.position.set(0, 0, 0);

    // Subscribe to engine events if event bus is available
    if (ctx.eventBus) {
      this._subscribeToEvents(ctx.eventBus);
    } else if (ctx.events) {
      // Alternative event system
      this._subscribeToEvents(ctx.events);
    } else {
      console.warn('ThreeJSRendererPlugin: No event bus found in context');
    }

    // Setup resize handling
    if (this.options.autoResize) {
      this._setupResizeHandler();
    }

    this.isInitialized = true;
    console.log('ThreeJSRendererPlugin: Initialized');
  }

  /**
   * Enable the plugin (attach canvas and start rendering)
   */
  async enable() {
    if (!this.isInitialized) {
      throw new Error('ThreeJSRendererPlugin: Not initialized. Call init() first');
    }

    if (this.enabled) {
      console.warn('ThreeJSRendererPlugin: Already enabled');
      return;
    }

    // Attach canvas to container
    if (this.canvas && this.container && !this.container.contains(this.canvas)) {
      this.container.appendChild(this.canvas);
    }

    this.enabled = true;
    console.log('ThreeJSRendererPlugin: Enabled');
  }

  /**
   * Disable the plugin (detach canvas and pause rendering)
   */
  async disable() {
    if (!this.enabled) {
      return;
    }

    // Detach canvas from container
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }

    this.enabled = false;
    console.log('ThreeJSRendererPlugin: Disabled');
  }

  /**
   * Dispose of the plugin and cleanup resources
   */
  async dispose() {
    // Disable first
    if (this.enabled) {
      await this.disable();
    }

    // Cleanup event listeners
    this.listeners.forEach((unsubscribe, eventName) => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    this.listeners.clear();

    // Cleanup resize handler
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }

    // Cleanup anchors
    this.anchors.forEach((anchor) => {
      if (anchor.parent) {
        anchor.parent.remove(anchor);
      }
      this._disposeObject3D(anchor);
    });
    this.anchors.clear();

    // Cleanup Three.js objects
    if (this.scene) {
      this._disposeObject3D(this.scene);
      this.scene = null;
    }

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }

    this.camera = null;
    this.canvas = null;
    this.ctx = null;
    this.isInitialized = false;

    console.log('ThreeJSRendererPlugin: Disposed');
  }

  /**
   * Render the scene (called on engine updates or manually)
   */
  render() {
    if (!this.enabled || !this.renderer || !this.scene || !this.camera) {
      return;
    }

    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Set camera projection matrix from a 4x4 matrix array
   * @param {Float32Array|Array} mat4Array - 4x4 projection matrix in column-major order
   */
  setProjectionFromMatrix(mat4Array) {
    if (!this.camera || !mat4Array || mat4Array.length !== 16) {
      console.warn('ThreeJSRendererPlugin: Invalid projection matrix');
      return;
    }

    // Apply projection matrix
    this.camera.projectionMatrix.fromArray(mat4Array);
    this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
  }

  /**
   * Get or create an anchor for a marker
   * @param {string|number} markerId - Marker identifier
   * @returns {THREE.Object3D} Anchor object
   */
  getAnchor(markerId) {
    if (!this.anchors.has(markerId)) {
      const anchor = new THREE.Group();
      anchor.name = `marker-${markerId}`;
      anchor.matrixAutoUpdate = false;
      this.scene.add(anchor);
      this.anchors.set(markerId, anchor);
    }
    return this.anchors.get(markerId);
  }

  /**
   * Remove an anchor
   * @param {string|number} markerId - Marker identifier
   */
  removeAnchor(markerId) {
    const anchor = this.anchors.get(markerId);
    if (anchor) {
      if (anchor.parent) {
        anchor.parent.remove(anchor);
      }
      this._disposeObject3D(anchor);
      this.anchors.delete(markerId);
    }
  }

  /**
   * Subscribe to AR.js-core events
   * @private
   */
  _subscribeToEvents(eventBus) {
    // Engine update event - render on each frame
    this._subscribe(eventBus, 'engine:update', () => {
      this.render();
    });

    // Marker found event
    this._subscribe(eventBus, 'ar:markerFound', (event) => {
      this._handleMarkerFound(event);
    });

    // Marker updated event
    this._subscribe(eventBus, 'ar:markerUpdated', (event) => {
      this._handleMarkerUpdated(event);
    });

    // Marker lost event
    this._subscribe(eventBus, 'ar:markerLost', (event) => {
      this._handleMarkerLost(event);
    });

    // Camera projection event (optional)
    this._subscribe(eventBus, 'ar:cameraProjection', (event) => {
      if (event && event.matrix) {
        this.setProjectionFromMatrix(event.matrix);
      }
    });
  }

  /**
   * Subscribe to an event and store the unsubscribe function
   * @private
   */
  _subscribe(eventBus, eventName, handler) {
    try {
      let unsubscribe;

      // Support different event bus APIs
      if (typeof eventBus.on === 'function') {
        eventBus.on(eventName, handler);
        unsubscribe = () => {
          if (typeof eventBus.off === 'function') {
            eventBus.off(eventName, handler);
          }
        };
      } else if (typeof eventBus.subscribe === 'function') {
        unsubscribe = eventBus.subscribe(eventName, handler);
      } else if (typeof eventBus.addEventListener === 'function') {
        eventBus.addEventListener(eventName, handler);
        unsubscribe = () => eventBus.removeEventListener(eventName, handler);
      } else {
        console.warn(`ThreeJSRendererPlugin: Unable to subscribe to event ${eventName}`);
        return;
      }

      this.listeners.set(eventName, unsubscribe);
    } catch (error) {
      console.error(`ThreeJSRendererPlugin: Error subscribing to ${eventName}:`, error);
    }
  }

  /**
   * Handle marker found event
   * @private
   */
  _handleMarkerFound(event) {
    if (!event || event.markerId === undefined) {
      return;
    }

    const anchor = this.getAnchor(event.markerId);
    anchor.visible = true;

    // Apply initial transform if provided
    if (event.matrix) {
      this._applyMatrixToAnchor(anchor, event.matrix);
    }
  }

  /**
   * Handle marker updated event
   * @private
   */
  _handleMarkerUpdated(event) {
    if (!event || event.markerId === undefined) {
      return;
    }

    const anchor = this.anchors.get(event.markerId);
    if (!anchor) {
      // Marker not tracked yet, treat as found
      this._handleMarkerFound(event);
      return;
    }

    // Update transform
    if (event.matrix) {
      this._applyMatrixToAnchor(anchor, event.matrix);
    }

    anchor.visible = true;
  }

  /**
   * Handle marker lost event
   * @private
   */
  _handleMarkerLost(event) {
    if (!event || event.markerId === undefined) {
      return;
    }

    const anchor = this.anchors.get(event.markerId);
    if (anchor) {
      // Hide the anchor instead of removing it (allows for quick recovery)
      anchor.visible = false;
    }
  }

  /**
   * Apply a 4x4 transform matrix to an anchor
   * @private
   */
  _applyMatrixToAnchor(anchor, matrix) {
    if (!matrix || matrix.length !== 16) {
      console.warn('ThreeJSRendererPlugin: Invalid matrix provided');
      return;
    }

    // Matrix is in column-major order (typical for WebGL/Three.js)
    anchor.matrix.fromArray(matrix);
    anchor.matrixAutoUpdate = false;
  }

  /**
   * Setup window resize handler
   * @private
   */
  _setupResizeHandler() {
    this.resizeHandler = () => {
      if (!this.container || !this.renderer || !this.camera) {
        return;
      }

      const width = this.container.clientWidth || window.innerWidth;
      const height = this.container.clientHeight || window.innerHeight;

      this.renderer.setSize(width, height);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    };

    window.addEventListener('resize', this.resizeHandler);
  }

  /**
   * Recursively dispose of an Object3D and its children
   * @private
   */
  _disposeObject3D(obj) {
    if (!obj) return;

    // Dispose of children first
    if (obj.children) {
      for (let i = obj.children.length - 1; i >= 0; i--) {
        this._disposeObject3D(obj.children[i]);
      }
    }

    // Dispose of geometry
    if (obj.geometry) {
      obj.geometry.dispose();
    }

    // Dispose of material(s)
    if (obj.material) {
      if (Array.isArray(obj.material)) {
        obj.material.forEach(material => this._disposeMaterial(material));
      } else {
        this._disposeMaterial(obj.material);
      }
    }

    // Remove from parent
    if (obj.parent) {
      obj.parent.remove(obj);
    }
  }

  /**
   * Dispose of a material and its textures
   * @private
   */
  _disposeMaterial(material) {
    if (!material) return;

    // Dispose of textures
    if (material.map) material.map.dispose();
    if (material.lightMap) material.lightMap.dispose();
    if (material.bumpMap) material.bumpMap.dispose();
    if (material.normalMap) material.normalMap.dispose();
    if (material.specularMap) material.specularMap.dispose();
    if (material.envMap) material.envMap.dispose();

    material.dispose();
  }

  /**
   * Public API: Get the Three.js scene
   * @returns {THREE.Scene}
   */
  getScene() {
    return this.scene;
  }

  /**
   * Public API: Get the Three.js camera
   * @returns {THREE.Camera}
   */
  getCamera() {
    return this.camera;
  }

  /**
   * Public API: Get the Three.js renderer
   * @returns {THREE.WebGLRenderer}
   */
  getRenderer() {
    return this.renderer;
  }
}
