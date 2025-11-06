class R {
  constructor() {
    this.nextEntityId = 1, this.entities = /* @__PURE__ */ new Set(), this.components = /* @__PURE__ */ new Map(), this.resources = /* @__PURE__ */ new Map();
  }
  /**
   * Create a new entity
   * @returns {number} The entity ID
   */
  createEntity() {
    const t = this.nextEntityId++;
    return this.entities.add(t), t;
  }
  /**
   * Destroy an entity and all its components
   * @param {number} entityId
   */
  destroyEntity(t) {
    if (this.entities.has(t)) {
      this.entities.delete(t);
      for (const i of this.components.values())
        i.delete(t);
    }
  }
  /**
   * Add or update a component for an entity
   * @param {number} entityId
   * @param {string} componentKey
   * @param {*} data
   */
  setComponent(t, i, e) {
    if (!this.entities.has(t))
      throw new Error(`Entity ${t} does not exist`);
    this.components.has(i) || this.components.set(i, /* @__PURE__ */ new Map()), this.components.get(i).set(t, e);
  }
  /**
   * Get a component for an entity
   * @param {number} entityId
   * @param {string} componentKey
   * @returns {*} The component data or undefined
   */
  getComponent(t, i) {
    const e = this.components.get(i);
    return e ? e.get(t) : void 0;
  }
  /**
   * Check if an entity has a component
   * @param {number} entityId
   * @param {string} componentKey
   * @returns {boolean}
   */
  hasComponent(t, i) {
    const e = this.components.get(i);
    return e ? e.has(t) : !1;
  }
  /**
   * Remove a component from an entity
   * @param {number} entityId
   * @param {string} componentKey
   */
  removeComponent(t, i) {
    const e = this.components.get(i);
    e && e.delete(t);
  }
  /**
   * Set a global resource (singleton data)
   * @param {string} resourceKey
   * @param {*} data
   */
  setResource(t, i) {
    this.resources.set(t, i);
  }
  /**
   * Get a global resource
   * @param {string} resourceKey
   * @returns {*}
   */
  getResource(t) {
    return this.resources.get(t);
  }
  /**
   * Check if a resource exists
   * @param {string} resourceKey
   * @returns {boolean}
   */
  hasResource(t) {
    return this.resources.has(t);
  }
  /**
   * Remove a resource
   * @param {string} resourceKey
   */
  removeResource(t) {
    this.resources.delete(t);
  }
  /**
   * Query entities that have all specified components
   * @param {...string} componentKeys
   * @returns {Array<number>} Array of entity IDs
   */
  query(...t) {
    if (t.length === 0)
      return Array.from(this.entities);
    const i = [];
    for (const e of this.entities) {
      let r = !0;
      for (const n of t)
        if (!this.hasComponent(e, n)) {
          r = !1;
          break;
        }
      r && i.push(e);
    }
    return i;
  }
  /**
   * Get all components for a specific component key
   * @param {string} componentKey
   * @returns {Map<number, *>} Map of entity IDs to component data
   */
  getAllComponents(t) {
    return this.components.get(t) || /* @__PURE__ */ new Map();
  }
  /**
   * Clear all entities and components
   */
  clear() {
    this.entities.clear(), this.components.clear(), this.resources.clear(), this.nextEntityId = 1;
  }
}
class v {
  constructor() {
    this.listeners = /* @__PURE__ */ new Map();
  }
  /**
   * Subscribe to an event
   * @param {string} eventType
   * @param {Function} callback
   * @returns {Function} Unsubscribe function
   */
  on(t, i) {
    return this.listeners.has(t) || this.listeners.set(t, /* @__PURE__ */ new Set()), this.listeners.get(t).add(i), () => this.off(t, i);
  }
  /**
   * Subscribe to an event once (auto-unsubscribe after first trigger)
   * @param {string} eventType
   * @param {Function} callback
   * @returns {Function} Unsubscribe function
   */
  once(t, i) {
    const e = (r) => {
      this.off(t, e), i(r);
    };
    return this.on(t, e);
  }
  /**
   * Unsubscribe from an event
   * @param {string} eventType
   * @param {Function} callback
   */
  off(t, i) {
    const e = this.listeners.get(t);
    e && (e.delete(i), e.size === 0 && this.listeners.delete(t));
  }
  /**
   * Emit an event to all subscribers
   * @param {string} eventType
   * @param {*} data
   */
  emit(t, i) {
    const e = this.listeners.get(t);
    if (e) {
      const r = Array.from(e);
      for (const n of r)
        try {
          n(i);
        } catch (a) {
          console.error(`Error in event listener for ${t}:`, a);
        }
    }
  }
  /**
   * Remove all listeners for a specific event type, or all listeners if no type specified
   * @param {string} [eventType]
   */
  clear(t) {
    t ? this.listeners.delete(t) : this.listeners.clear();
  }
  /**
   * Get the number of listeners for an event type
   * @param {string} eventType
   * @returns {number}
   */
  listenerCount(t) {
    const i = this.listeners.get(t);
    return i ? i.size : 0;
  }
}
class b {
  constructor(t) {
    this.eventBus = t, this.plugins = /* @__PURE__ */ new Map(), this.enabledPlugins = /* @__PURE__ */ new Set();
  }
  /**
   * Register a plugin
   * @param {string} pluginId - Unique identifier for the plugin
   * @param {Object} plugin - Plugin instance
   * @param {Function} [plugin.init] - Initialize plugin (called on enable)
   * @param {Function} [plugin.dispose] - Cleanup plugin (called on disable)
   * @param {Function} [plugin.update] - Called each frame if implemented
   * @returns {boolean} Success
   */
  register(t, i) {
    return this.plugins.has(t) ? (console.warn(`Plugin ${t} is already registered`), !1) : typeof i != "object" ? (console.error(`Plugin ${t} must be an object`), !1) : (this.plugins.set(t, i), this.eventBus && this.eventBus.emit("plugin:registered", { pluginId: t, plugin: i }), !0);
  }
  /**
   * Unregister a plugin
   * @param {string} pluginId
   * @returns {boolean} Success
   */
  unregister(t) {
    return this.plugins.has(t) ? (this.enabledPlugins.has(t) && this.disable(t), this.plugins.delete(t), !0) : (console.warn(`Plugin ${t} is not registered`), !1);
  }
  /**
   * Enable a plugin
   * @param {string} pluginId
   * @param {Object} context - Engine context (ecs, eventBus, etc.)
   * @returns {Promise<boolean>} Success
   */
  async enable(t, i) {
    if (!this.plugins.has(t))
      return console.error(`Plugin ${t} is not registered`), !1;
    if (this.enabledPlugins.has(t))
      return console.warn(`Plugin ${t} is already enabled`), !1;
    const e = this.plugins.get(t);
    try {
      return typeof e.init == "function" && await e.init(i), this.enabledPlugins.add(t), this.eventBus && this.eventBus.emit("plugin:enabled", { pluginId: t, plugin: e }), !0;
    } catch (r) {
      return console.error(`Failed to enable plugin ${t}:`, r), !1;
    }
  }
  /**
   * Disable a plugin
   * @param {string} pluginId
   * @returns {Promise<boolean>} Success
   */
  async disable(t) {
    if (!this.enabledPlugins.has(t))
      return console.warn(`Plugin ${t} is not enabled`), !1;
    const i = this.plugins.get(t);
    try {
      return typeof i.dispose == "function" && await i.dispose(), this.enabledPlugins.delete(t), this.eventBus && this.eventBus.emit("plugin:disabled", { pluginId: t, plugin: i }), !0;
    } catch (e) {
      return console.error(`Failed to disable plugin ${t}:`, e), !1;
    }
  }
  /**
   * Get a plugin instance
   * @param {string} pluginId
   * @returns {Object|undefined}
   */
  getPlugin(t) {
    return this.plugins.get(t);
  }
  /**
   * Check if a plugin is registered
   * @param {string} pluginId
   * @returns {boolean}
   */
  isRegistered(t) {
    return this.plugins.has(t);
  }
  /**
   * Check if a plugin is enabled
   * @param {string} pluginId
   * @returns {boolean}
   */
  isEnabled(t) {
    return this.enabledPlugins.has(t);
  }
  /**
   * Get all registered plugin IDs
   * @returns {Array<string>}
   */
  getRegisteredPlugins() {
    return Array.from(this.plugins.keys());
  }
  /**
   * Get all enabled plugin IDs
   * @returns {Array<string>}
   */
  getEnabledPlugins() {
    return Array.from(this.enabledPlugins);
  }
  /**
   * Update all enabled plugins that have an update method
   * @param {number} deltaTime - Time since last frame in milliseconds
   * @param {Object} context - Engine context
   */
  update(t, i) {
    for (const e of this.enabledPlugins) {
      const r = this.plugins.get(e);
      if (r && typeof r.update == "function")
        try {
          r.update(t, i);
        } catch (n) {
          console.error(`Error updating plugin ${e}:`, n);
        }
    }
  }
  /**
   * Disable all plugins and clear registry
   */
  async clear() {
    const t = Array.from(this.enabledPlugins);
    for (const i of t)
      await this.disable(i);
    this.plugins.clear(), this.enabledPlugins.clear();
  }
}
const S = {
  // Marker or tracking target component
  TRACKING_TARGET: "TrackingTarget",
  // Transform component (position, rotation, scale)
  TRANSFORM: "Transform",
  // Visibility state
  VISIBLE: "Visible"
}, g = {
  // Configuration for AR processing
  PROCESSING_CONFIG: "ProcessingConfig",
  // Current state of capture (ready, error, etc.)
  CAPTURE_STATE: "CaptureState",
  // Reference to the frame source (video element, image, etc.)
  FRAME_SOURCE_REF: "FrameSourceRef",
  // Device profile (desktop-normal, phone-normal, etc.)
  DEVICE_PROFILE: "DeviceProfile",
  // Enabled plugins
  ENABLED_PLUGINS: "EnabledPlugins"
}, l = {
  // Capture lifecycle events
  CAPTURE_INIT_START: "capture:init:start",
  CAPTURE_INIT_SUCCESS: "capture:init:success",
  CAPTURE_INIT_ERROR: "capture:init:error",
  CAPTURE_READY: "capture:ready",
  CAPTURE_DISPOSED: "capture:disposed",
  // Source lifecycle events
  SOURCE_LOADED: "source:loaded",
  SOURCE_ERROR: "source:error",
  SOURCE_PLAYING: "source:playing",
  SOURCE_PAUSED: "source:paused",
  // Frame processing events
  FRAME_PROCESSED: "frame:processed",
  // Engine lifecycle events
  ENGINE_START: "engine:start",
  ENGINE_STOP: "engine:stop",
  ENGINE_UPDATE: "engine:update",
  // Plugin lifecycle events
  PLUGIN_REGISTERED: "plugin:registered",
  PLUGIN_ENABLED: "plugin:enabled",
  PLUGIN_DISABLED: "plugin:disabled"
}, E = {
  UNINITIALIZED: "uninitialized",
  INITIALIZING: "initializing",
  READY: "ready",
  ERROR: "error",
  DISPOSED: "disposed"
}, f = {
  WEBCAM: "webcam",
  VIDEO: "video",
  IMAGE: "image"
}, p = {
  DESKTOP_FAST: "desktop-fast",
  DESKTOP_NORMAL: "desktop-normal",
  PHONE_NORMAL: "phone-normal",
  PHONE_SLOW: "phone-slow"
}, y = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  ULTRA: "ultra"
}, w = "0.2.0", P = {
  version: w
};
class _ {
  // Library identity/versioning
  static NAME = "@ar-js-org/ar.js-core";
  static VERSION = P?.version;
  // Back-compat friendly alias (similar to old Context.REVISION)
  static REVISION = _.VERSION;
  constructor() {
    this.ecs = new R(), this.eventBus = new v(), this.pluginManager = new b(this.eventBus), this.systems = [], this.isRunning = !1, this.lastFrameTime = 0, this.animationFrameId = null;
  }
  /**
   * Add a system to the engine
   * Systems are functions that run each frame: (deltaTime, context) => void
   * @param {Function} system - System function
   */
  addSystem(t) {
    if (typeof t != "function") {
      console.error("System must be a function");
      return;
    }
    this.systems.push(t);
  }
  /**
   * Remove a system from the engine
   * @param {Function} system
   */
  removeSystem(t) {
    const i = this.systems.indexOf(t);
    i !== -1 && this.systems.splice(i, 1);
  }
  /**
   * Start the engine and game loop
   */
  start() {
    if (this.isRunning) {
      console.warn("Engine is already running");
      return;
    }
    this.isRunning = !0, this.lastFrameTime = performance.now(), this.eventBus.emit(l.ENGINE_START, { engine: this }), this.animationFrameId = requestAnimationFrame(this.#e.bind(this));
  }
  /**
   * Stop the engine and game loop
   */
  stop() {
    this.isRunning && (this.isRunning = !1, this.animationFrameId !== null && (cancelAnimationFrame(this.animationFrameId), this.animationFrameId = null), this.eventBus.emit(l.ENGINE_STOP, { engine: this }));
  }
  /**
   * Game loop - runs each frame
   * @private
   */
  #e(t) {
    if (!this.isRunning) return;
    const i = t - this.lastFrameTime;
    this.lastFrameTime = t;
    const e = {
      ecs: this.ecs,
      eventBus: this.eventBus,
      pluginManager: this.pluginManager,
      engine: this
    };
    for (const r of this.systems)
      try {
        r(i, e);
      } catch (n) {
        console.error("Error in system:", n);
      }
    this.pluginManager.update(i, e), this.eventBus.emit(l.ENGINE_UPDATE, { deltaTime: i, context: e }), this.animationFrameId = requestAnimationFrame(this.#e.bind(this));
  }
  /**
   * Run a single update manually (useful for testing or non-realtime scenarios)
   * @param {number} [deltaTime=16.67] - Time delta in milliseconds
   */
  update(t = 16.67) {
    const i = {
      ecs: this.ecs,
      eventBus: this.eventBus,
      pluginManager: this.pluginManager,
      engine: this
    };
    for (const e of this.systems)
      try {
        e(t, i);
      } catch (r) {
        console.error("Error in system:", r);
      }
    this.pluginManager.update(t, i), this.eventBus.emit(l.ENGINE_UPDATE, { deltaTime: t, context: i });
  }
  /**
   * Get the current context
   * @returns {Object}
   */
  getContext() {
    return {
      ecs: this.ecs,
      eventBus: this.eventBus,
      pluginManager: this.pluginManager,
      engine: this
    };
  }
  /**
   * Dispose the engine and clean up resources
   */
  async dispose() {
    this.stop(), await this.pluginManager.clear(), this.systems = [], this.ecs.clear(), this.eventBus.clear();
  }
}
class A {
  /**
   * Initialize capture system with configuration
   * @param {Object} config
   * @param {string} config.sourceType - Type of source (webcam, video, image)
   * @param {string} [config.sourceUrl] - URL for video/image sources
   * @param {string} [config.deviceId] - Specific camera device ID
   * @param {number} [config.sourceWidth] - Desired source width
   * @param {number} [config.sourceHeight] - Desired source height
   */
  static async initialize(t, i) {
    const { ecs: e, eventBus: r, pluginManager: n } = i;
    e.setResource(g.CAPTURE_STATE, {
      state: E.INITIALIZING,
      error: null
    }), r.emit(l.CAPTURE_INIT_START, { config: t });
    try {
      const a = t.sourceType || f.WEBCAM;
      let o;
      switch (a) {
        case f.WEBCAM:
          o = "source:webcam";
          break;
        case f.VIDEO:
          o = "source:video";
          break;
        case f.IMAGE:
          o = "source:image";
          break;
        default:
          throw new Error(`Unknown source type: ${a}`);
      }
      if (!n.isRegistered(o))
        throw new Error(`Plugin ${o} is not registered`);
      if (!n.isEnabled(o) && !await n.enable(o, i))
        throw new Error(`Failed to enable plugin ${o}`);
      const m = n.getPlugin(o);
      if (!m || typeof m.capture != "function")
        throw new Error(`Plugin ${o} does not have a capture method`);
      const h = await m.capture(t, i);
      return e.setResource(g.FRAME_SOURCE_REF, {
        element: h.element,
        stream: h.stream,
        type: a,
        width: h.width || t.sourceWidth || 640,
        height: h.height || t.sourceHeight || 480
      }), e.setResource(g.CAPTURE_STATE, {
        state: E.READY,
        error: null
      }), r.emit(l.CAPTURE_INIT_SUCCESS, { frameSource: h }), r.emit(l.CAPTURE_READY, { frameSource: h }), h;
    } catch (a) {
      throw console.error("Capture initialization failed:", a), e.setResource(g.CAPTURE_STATE, {
        state: E.ERROR,
        error: a.message || "Unknown error"
      }), r.emit(l.CAPTURE_INIT_ERROR, { error: a }), a;
    }
  }
  /**
   * Dispose the capture system and clean up resources
   */
  static async dispose(t) {
    const { ecs: i, eventBus: e, pluginManager: r } = t, n = i.getResource(g.FRAME_SOURCE_REF), a = ["source:webcam", "source:video", "source:image"];
    for (const o of a)
      r.isEnabled(o) && await r.disable(o);
    i.removeResource(g.FRAME_SOURCE_REF), i.setResource(g.CAPTURE_STATE, {
      state: E.DISPOSED,
      error: null
    }), e.emit(l.CAPTURE_DISPOSED, { frameSourceRef: n });
  }
  /**
   * Get the current capture state
   */
  static getState(t) {
    return t.ecs.getResource(g.CAPTURE_STATE);
  }
  /**
   * Get the current frame source
   */
  static getFrameSource(t) {
    return t.ecs.getResource(g.FRAME_SOURCE_REF);
  }
}
class C {
  static start(t) {
    if (!t) throw new Error("FramePumpSystem.start requires a context");
    const i = t.eventBus, e = t.ecs.getResource(g.FRAME_SOURCE_REF);
    if (!e?.element)
      return console.warn(
        "[FramePumpSystem] No frame source element found; did you call CaptureSystem.initialize?"
      ), !1;
    const r = e.element;
    if (String(r.tagName).toUpperCase() !== "VIDEO")
      return console.warn("[FramePumpSystem] Frame source is not a <video> element; skipping frame pump."), !1;
    t.__framePump = t.__framePump || {};
    const n = t.__framePump;
    if (n.running) return !0;
    n.running = !0, n._fid = 0, n._raf = 0, n._rvfc = 0;
    let a = null, o = null;
    function m(c, u) {
      if (!(a && a.width === c && a.height === u))
        try {
          if (typeof globalThis.OffscreenCanvas < "u")
            a = new globalThis.OffscreenCanvas(c, u), o = a.getContext("2d", { willReadFrequently: !0 });
          else {
            const d = globalThis.document?.createElement?.("canvas");
            if (!d) {
              a = null, o = null;
              return;
            }
            d.width = c, d.height = u, d.style.display = "none";
            try {
              globalThis.document?.body?.appendChild?.(d);
            } catch {
            }
            a = d, o = d.getContext("2d", { willReadFrequently: !0 });
          }
        } catch {
          a = null, o = null;
        }
    }
    async function h() {
      const c = r.videoWidth || e.width || 640, u = r.videoHeight || e.height || 480;
      try {
        if (typeof globalThis.createImageBitmap == "function") {
          const d = await globalThis.createImageBitmap(r);
          i.emit("engine:update", { id: ++n._fid, imageBitmap: d, width: c, height: u });
          return;
        }
      } catch {
      }
      try {
        if (m(c, u), !a || !o) return;
        if (o.clearRect(0, 0, c, u), o.drawImage(r, 0, 0, c, u), typeof globalThis.createImageBitmap == "function") {
          const d = await globalThis.createImageBitmap(a);
          i.emit("engine:update", { id: ++n._fid, imageBitmap: d, width: c, height: u });
        } else
          i.emit("engine:update", { id: ++n._fid, width: c, height: u });
      } catch {
      }
    }
    if (typeof r.requestVideoFrameCallback == "function") {
      const c = async () => {
        n.running && (await h(), n._rvfc = r.requestVideoFrameCallback(c));
      };
      n._rvfc = r.requestVideoFrameCallback(c);
    } else {
      const c = globalThis.requestAnimationFrame || ((d) => setTimeout(d, 16)), u = async () => {
        n.running && (await h(), n._raf = c(u));
      };
      n._raf = c(u);
    }
    return !0;
  }
  static stop(t) {
    const i = t?.__framePump, r = t?.ecs?.getResource?.(g.FRAME_SOURCE_REF)?.element;
    if (!i || !i.running) return;
    if (i.running = !1, r && typeof r.cancelVideoFrameCallback == "function" && i._rvfc)
      try {
        r.cancelVideoFrameCallback(i._rvfc);
      } catch {
      }
    const n = globalThis.cancelAnimationFrame || ((a) => {
      try {
        clearTimeout(a);
      } catch {
      }
    });
    if (i._raf)
      try {
        n(i._raf);
      } catch {
      }
    t.__framePump = void 0;
  }
}
const T = {
  id: "source:webcam",
  name: "Webcam Source",
  type: "source",
  // Internal state
  _videoElement: null,
  _stream: null,
  _context: null,
  /**
   * Initialize the plugin
   */
  async init(s) {
    this._context = s;
  },
  /**
   * Capture video from webcam
   * @param {Object} config
   * @param {string} [config.deviceId] - Specific camera device ID
   * @param {number} [config.sourceWidth] - Desired video width
   * @param {number} [config.sourceHeight] - Desired video height
   * @param {number} [config.displayWidth] - Display width
   * @param {number} [config.displayHeight] - Display height
   * @param {Object} context - Engine context
   * @returns {Promise<Object>} Frame source with element and stream
   */
  async capture(s, t) {
    const { eventBus: i } = t;
    if (!globalThis.navigator?.mediaDevices || !globalThis.navigator.mediaDevices.getUserMedia || !globalThis.navigator.mediaDevices.enumerateDevices) {
      const e = new Error("MediaDevices API not available in this browser");
      throw i.emit(l.SOURCE_ERROR, { error: e, source: "webcam" }), e;
    }
    try {
      const e = globalThis.document?.createElement?.("video") || Object.assign(
        {},
        {
          setAttribute() {
          },
          style: {},
          play: async () => {
          }
        }
      );
      e.setAttribute?.("autoplay", ""), e.setAttribute?.("muted", ""), e.setAttribute?.("playsinline", ""), e.setAttribute?.("id", "arjs-video");
      const r = s.displayWidth || 640, n = s.displayHeight || 480;
      e.style && (e.style.width = r + "px", e.style.height = n + "px", e.style.position = "absolute", e.style.top = "0px", e.style.left = "0px", e.style.zIndex = "-2");
      const a = {
        audio: !1,
        video: {
          facingMode: "environment",
          width: { ideal: s.sourceWidth || 640 },
          height: { ideal: s.sourceHeight || 480 }
        }
      };
      s.deviceId && (a.video.deviceId = { exact: s.deviceId });
      const o = await globalThis.navigator.mediaDevices.getUserMedia(a);
      e.srcObject = o, this._videoElement = e, this._stream = o, await new Promise((c, u) => {
        e.onloadedmetadata = () => {
          e.play?.().then(() => {
            try {
              globalThis.document?.body?.appendChild?.(e);
            } catch {
            }
            try {
              globalThis.window?.dispatchEvent?.(
                new globalThis.CustomEvent("camera-init", {
                  detail: { stream: o }
                })
              ), globalThis.window?.dispatchEvent?.(
                new globalThis.CustomEvent("arjs-video-loaded", {
                  detail: { component: e }
                })
              );
            } catch {
            }
            i.emit(l.SOURCE_LOADED, {
              element: e,
              stream: o,
              source: "webcam"
            }), i.emit(l.SOURCE_PLAYING, {
              element: e,
              source: "webcam"
            }), c();
          }).catch(u);
        }, e.onerror = u;
      });
      const m = e.videoWidth || s.sourceWidth || 640, h = e.videoHeight || s.sourceHeight || 480;
      return {
        element: e,
        stream: o,
        width: m,
        height: h,
        type: "webcam"
      };
    } catch (e) {
      t?.eventBus?.emit?.(l.SOURCE_ERROR, {
        error: e,
        source: "webcam",
        message: e.message
      });
      try {
        globalThis.window?.dispatchEvent?.(
          new globalThis.CustomEvent("camera-error", { detail: { error: e } })
        );
      } catch {
      }
      throw e;
    }
  },
  /**
   * Dispose the plugin and clean up resources
   */
  async dispose() {
    if (this._stream) {
      try {
        this._stream.getTracks?.().forEach((s) => s.stop?.());
      } catch {
      }
      this._stream = null;
    }
    if (this._videoElement) {
      try {
        this._videoElement.parentNode?.removeChild && this._videoElement.parentNode.removeChild(this._videoElement), this._videoElement.srcObject = null;
      } catch {
      }
      this._videoElement = null;
    }
    this._context?.eventBus && this._context.eventBus.emit(l.CAPTURE_DISPOSED, {
      source: "webcam"
    });
  },
  /**
   * Check if mobile torch is available
   * @returns {boolean}
   */
  hasMobileTorch() {
    if (!this._stream) return !1;
    if (!(typeof globalThis.MediaStream == "function")) {
      const e = this._stream?.getVideoTracks?.();
      return Array.isArray(e) && e[0]?.getCapabilities ? !!e[0].getCapabilities().torch : !1;
    }
    const t = this._stream.getVideoTracks?.()[0];
    return !t || !t.getCapabilities ? !1 : !!t.getCapabilities().torch;
  },
  /**
   * Toggle mobile torch on/off
   * @param {boolean} [enabled] - Force enable/disable, or toggle if not provided
   * @returns {Promise<boolean>} New torch state
   */
  async toggleMobileTorch(s) {
    if (!this.hasMobileTorch())
      return console.warn?.("Mobile torch is not available on this device"), !1;
    const t = this._stream.getVideoTracks()[0], i = this._torchEnabled || !1, e = s !== void 0 ? s : !i;
    try {
      return await t.applyConstraints?.({
        advanced: [{ torch: e }]
      }), this._torchEnabled = e, e;
    } catch (r) {
      return console.error?.("Failed to toggle torch:", r), i;
    }
  }
}, O = {
  id: "source:video",
  name: "Video Source",
  type: "source",
  // Internal state
  _videoElement: null,
  _context: null,
  /**
   * Initialize the plugin
   */
  async init(s) {
    this._context = s;
  },
  /**
   * Capture video from a file or URL
   * @param {Object} config
   * @param {string} config.sourceUrl - URL or path to video file
   * @param {number} [config.sourceWidth] - Desired video width
   * @param {number} [config.sourceHeight] - Desired video height
   * @param {number} [config.displayWidth] - Display width
   * @param {number} [config.displayHeight] - Display height
   * @param {boolean} [config.loop] - Whether to loop the video
   * @param {boolean} [config.muted] - Whether to mute the video
   * @param {Object} context - Engine context
   * @returns {Promise<Object>} Frame source with element
   */
  async capture(s, t) {
    const { eventBus: i } = t;
    if (!s.sourceUrl) {
      const e = new Error("sourceUrl is required for video source");
      throw i.emit(l.SOURCE_ERROR, { error: e, source: "video" }), e;
    }
    try {
      const e = document.createElement("video");
      e.src = s.sourceUrl, e.setAttribute("id", "arjs-video"), e.autoplay = !0, e.setAttribute("playsinline", ""), e.controls = !1, e.loop = s.loop !== !1, e.muted = s.muted !== !1;
      const r = s.displayWidth || 640, n = s.displayHeight || 480;
      e.style.width = r + "px", e.style.height = n + "px", e.style.position = "absolute", e.style.top = "0px", e.style.left = "0px", e.style.zIndex = "-2", e.style.objectFit = "initial", s.sourceWidth && (e.width = s.sourceWidth), s.sourceHeight && (e.height = s.sourceHeight), this._videoElement = e, await new Promise((m, h) => {
        e.onloadeddata = () => {
          document.body.appendChild(e), e.play().then(() => {
            window.dispatchEvent(
              new CustomEvent("arjs-video-loaded", {
                detail: { component: e }
              })
            ), i.emit(l.SOURCE_LOADED, {
              element: e,
              source: "video"
            }), i.emit(l.SOURCE_PLAYING, {
              element: e,
              source: "video"
            }), m();
          }).catch((c) => {
            console.warn("Autoplay failed, waiting for user interaction");
            const u = () => {
              e.play().then(() => {
                i.emit(l.SOURCE_PLAYING, {
                  element: e,
                  source: "video"
                });
              }), document.body.removeEventListener("click", u);
            };
            document.body.addEventListener("click", u, {
              once: !0
            }), m();
          });
        }, e.onerror = (c) => {
          h(new Error(`Failed to load video: ${c.message || "Unknown error"}`));
        };
      });
      const a = e.videoWidth || s.sourceWidth || 640, o = e.videoHeight || s.sourceHeight || 480;
      return {
        element: e,
        width: a,
        height: o,
        type: "video"
      };
    } catch (e) {
      throw console.error("Video capture failed:", e), i.emit(l.SOURCE_ERROR, {
        error: e,
        source: "video",
        message: e.message
      }), e;
    }
  },
  /**
   * Dispose the plugin and clean up resources
   */
  async dispose() {
    this._videoElement && (this._videoElement.pause(), this._videoElement.removeAttribute("src"), this._videoElement.load(), this._videoElement.parentNode && this._videoElement.parentNode.removeChild(this._videoElement), this._videoElement = null), this._context && this._context.eventBus && this._context.eventBus.emit(l.CAPTURE_DISPOSED, {
      source: "video"
    });
  }
}, I = {
  id: "source:image",
  name: "Image Source",
  type: "source",
  // Internal state
  _imageElement: null,
  _context: null,
  /**
   * Initialize the plugin
   */
  async init(s) {
    this._context = s;
  },
  /**
   * Load an image from a file or URL
   * @param {Object} config
   * @param {string} config.sourceUrl - URL or path to image file
   * @param {number} [config.sourceWidth] - Desired image width
   * @param {number} [config.sourceHeight] - Desired image height
   * @param {number} [config.displayWidth] - Display width
   * @param {number} [config.displayHeight] - Display height
   * @param {Object} context - Engine context
   * @returns {Promise<Object>} Frame source with element
   */
  async capture(s, t) {
    const { eventBus: i } = t;
    if (!s.sourceUrl) {
      const e = new Error("sourceUrl is required for image source");
      throw i.emit(l.SOURCE_ERROR, { error: e, source: "image" }), e;
    }
    try {
      const e = document.createElement("img");
      e.src = s.sourceUrl, e.setAttribute("id", "arjs-video");
      const r = s.displayWidth || 640, n = s.displayHeight || 480;
      e.style.width = r + "px", e.style.height = n + "px", e.style.position = "absolute", e.style.top = "0px", e.style.left = "0px", e.style.zIndex = "-2", s.sourceWidth && (e.width = s.sourceWidth), s.sourceHeight && (e.height = s.sourceHeight), this._imageElement = e, await new Promise((m, h) => {
        e.onload = () => {
          document.body.appendChild(e), window.dispatchEvent(
            new CustomEvent("arjs-video-loaded", {
              detail: { component: e }
            })
          ), i.emit(l.SOURCE_LOADED, {
            element: e,
            source: "image"
          }), m();
        }, e.onerror = (c) => {
          h(new Error(`Failed to load image: ${c.message || "Unknown error"}`));
        };
      });
      const a = e.naturalWidth || s.sourceWidth || 640, o = e.naturalHeight || s.sourceHeight || 480;
      return {
        element: e,
        width: a,
        height: o,
        type: "image"
      };
    } catch (e) {
      throw console.error("Image capture failed:", e), i.emit(l.SOURCE_ERROR, {
        error: e,
        source: "image",
        message: e.message
      }), e;
    }
  },
  /**
   * Dispose the plugin and clean up resources
   */
  async dispose() {
    this._imageElement && (this._imageElement.parentNode && this._imageElement.parentNode.removeChild(this._imageElement), this._imageElement = null), this._context && this._context.eventBus && this._context.eventBus.emit(l.CAPTURE_DISPOSED, {
      source: "image"
    });
  }
}, M = {
  id: "profile:default",
  name: "Default Profile Policy (auto)",
  type: "profile",
  /**
   * Initialize the plugin: compute auto profile and publish it
   */
  async init(s) {
    const t = await this._computeAutoProfile();
    s.ecs.setResource(g.DEVICE_PROFILE, t), s?.eventBus?.emit?.("profile:applied", { profile: t });
  },
  /**
   * Preferred: detect a structured capability-based profile
   */
  async detectProfile() {
    return this._computeAutoProfile();
  },
  /**
   * Compute a capability-based profile
   * Returns a structured profile with backward-compatible fields.
   */
  async _computeAutoProfile() {
    const s = this._getCaps(), t = await this._microBenchmark(8), i = this._scoreCaps(s, t), e = this._pickTier(i), [r, n] = e.capture, a = {
      label: `auto-${e.tier}`,
      sourceWidth: r,
      sourceHeight: n,
      displayWidth: r,
      displayHeight: n,
      canvasWidth: r,
      canvasHeight: n,
      maxDetectionRate: 60
    }, o = {
      qualityTier: e.tier,
      // QUALITY_TIERS value
      score: i,
      caps: s,
      capture: {
        sourceWidth: r,
        sourceHeight: n,
        displayWidth: r,
        displayHeight: n,
        fpsHint: 30
      },
      processing: {
        budgetMsPerFrame: e.budget,
        complexity: e.complexity
      }
    };
    return { ...a, ...o };
  },
  /**
   * Get device capability signals (defensive checks for non-browser envs)
   */
  _getCaps() {
    const s = typeof navigator < "u" ? navigator : {}, t = typeof window < "u" ? window : {}, i = typeof screen < "u" ? screen : {}, e = typeof s.userAgent == "string" ? s.userAgent : "", r = Math.max(1, Number(s.hardwareConcurrency || 2)), n = Math.max(0.5, Number(s.deviceMemory || 2)), a = !!t.WebGL2RenderingContext, o = typeof WebAssembly == "object" && typeof WebAssembly.validate == "function", m = Math.max(Number(i.width || 0), Number(i.height || 0)) || 0;
    let h = !1, c = "unknown";
    try {
      const u = s.mediaDevices?.getSupportedConstraints?.bind(s.mediaDevices), d = u ? u() : {};
      h = !!d?.torch, c = d?.focusMode ? "supported" : "unknown";
    } catch {
    }
    return {
      userAgentHint: e,
      cores: r,
      memoryGB: n,
      webgl2: a,
      wasmSIMD: o,
      screenLongSide: m,
      camera: { torch: h, focusMode: c }
    };
  },
  /**
   * Very small CPU probe to approximate budget
   */
  async _microBenchmark(s = 8) {
    if (typeof performance > "u" || typeof performance.now != "function")
      return 0;
    const t = performance.now();
    let i = 0;
    for (; performance.now() - t < s; ) {
      for (let e = 0; e < 1e3; e++) i += Math.sqrt(e + i % 5);
      if (performance.now() - t > s * 2) break;
    }
    return i;
  },
  /**
   * Convert caps + bench signal into a 0..100 score
   */
  _scoreCaps(s, t) {
    let i = 0;
    if (i += Math.min(30, (s.cores || 0) * 5), i += Math.min(30, (s.memoryGB || 0) * 4), s.webgl2 && (i += 10), s.wasmSIMD && (i += 10), i += Math.min(10, Math.floor((s.screenLongSide || 0) / 600)), typeof t == "number") {
      const e = Math.max(0, Math.log10(Math.max(10, t)));
      i += Math.min(10, 5 + e);
    }
    return i = Math.round(Math.max(0, Math.min(100, i))), i;
  },
  /**
   * Map score to a quality tier and capture/budget hints
   */
  _pickTier(s) {
    return s >= 85 ? {
      tier: y.ULTRA,
      capture: [1280, 720],
      budget: 12,
      complexity: "high"
    } : s >= 65 ? {
      tier: y.HIGH,
      capture: [960, 540],
      budget: 10,
      complexity: "high"
    } : s >= 45 ? {
      tier: y.MEDIUM,
      capture: [800, 450],
      budget: 8,
      complexity: "medium"
    } : {
      tier: y.LOW,
      capture: [640, 360],
      budget: 6,
      complexity: "low"
    };
  },
  /**
   * Legacy mapping: return a minimal legacy profile by label
   */
  getProfile(s) {
    const t = {
      [p.DESKTOP_FAST]: {
        label: p.DESKTOP_FAST,
        canvasWidth: 1920,
        canvasHeight: 1440,
        maxDetectionRate: 30,
        sourceWidth: 640,
        sourceHeight: 480
      },
      [p.DESKTOP_NORMAL]: {
        label: p.DESKTOP_NORMAL,
        canvasWidth: 640,
        canvasHeight: 480,
        maxDetectionRate: 60,
        sourceWidth: 640,
        sourceHeight: 480
      },
      [p.PHONE_NORMAL]: {
        label: p.PHONE_NORMAL,
        canvasWidth: 320,
        canvasHeight: 240,
        maxDetectionRate: 30,
        sourceWidth: 640,
        sourceHeight: 480
      },
      [p.PHONE_SLOW]: {
        label: p.PHONE_SLOW,
        canvasWidth: 240,
        canvasHeight: 180,
        maxDetectionRate: 30,
        sourceWidth: 640,
        sourceHeight: 480
      }
    };
    return t[s] || t[p.DESKTOP_NORMAL];
  },
  /**
   * Keep legacy setter: If a legacy label is passed, set that profile.
   */
  setProfile(s, t) {
    const i = this.getProfile(s);
    t.ecs.setResource(g.DEVICE_PROFILE, i);
  },
  /**
   * Read currently applied profile
   */
  getCurrentProfile(s) {
    return s.ecs.getResource(g.DEVICE_PROFILE);
  },
  /**
   * Legacy mobile detection retained (unused by default)
   * Enhanced to cover additional mobile devices and tablets
   * @private
   */
  _isMobileDevice() {
    const s = typeof navigator < "u" && navigator.userAgent || "";
    return !!(s.match(/Android/i) || s.match(/webOS/i) || s.match(/iPhone/i) || s.match(/iPad/i) || s.match(/iPod/i) || s.match(/BlackBerry/i) || s.match(/Windows Phone/i) || s.match(/Opera Mini/i) || s.match(/Opera Mobi/i) || s.match(/IEMobile/i) || s.match(/Mobile/i) || s.match(/Kindle/i) || s.match(/Silk/i) || s.match(/PlayStation/i) || s.match(/Nintendo/i));
  },
  /**
   * Dispose hook
   */
  async dispose() {
  }
};
export {
  E as CAPTURE_STATES,
  S as COMPONENTS,
  A as CaptureSystem,
  p as DEVICE_PROFILES,
  R as ECS,
  l as EVENTS,
  _ as Engine,
  v as EventBus,
  C as FramePumpSystem,
  b as PluginManager,
  y as QUALITY_TIERS,
  g as RESOURCES,
  f as SOURCE_TYPES,
  M as defaultProfilePlugin,
  I as imagePlugin,
  O as videoPlugin,
  T as webcamPlugin
};
//# sourceMappingURL=arjs-core.mjs.map
