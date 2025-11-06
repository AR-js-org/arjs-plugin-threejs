/**
 * Minimal example demonstrating @ar-js-org/arjs-plugin-threejs
 * 
 * This example shows how to:
 * 1. Import and initialize the ThreeJSRendererPlugin
 * 2. Set up a basic Three.js scene
 * 3. Add 3D objects and lighting
 * 4. Create a simple animation loop
 * 
 * Note: This is a standalone example that doesn't require AR.js-core
 * for demonstration purposes. In a real AR application, you would
 * integrate this with AR.js-core's context and event system.
 */

import { ThreeJSRendererPlugin } from '../../dist/arjs-plugin-threejs.mjs';
import * as THREE from 'three';

// Update status message
function updateStatus(message, isError = false) {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  statusEl.className = isError ? 'status error' : 'status';
}

// Mock AR.js-core context for demonstration
class MockARContext {
  constructor() {
    this.eventBus = {
      listeners: new Map(),
      on(event, handler) {
        if (!this.listeners.has(event)) {
          this.listeners.set(event, []);
        }
        this.listeners.get(event).push(handler);
      },
      off(event, handler) {
        if (this.listeners.has(event)) {
          const handlers = this.listeners.get(event);
          const index = handlers.indexOf(handler);
          if (index > -1) {
            handlers.splice(index, 1);
          }
        }
      },
      emit(event, data) {
        if (this.listeners.has(event)) {
          this.listeners.get(event).forEach(handler => handler(data));
        }
      }
    };
  }

  startUpdateLoop(fps = 60) {
    const interval = 1000 / fps;
    let lastTime = performance.now();

    const update = () => {
      const currentTime = performance.now();
      const deltaTime = currentTime - lastTime;

      if (deltaTime >= interval) {
        this.eventBus.emit('engine:update', { 
          time: currentTime, 
          deltaTime: deltaTime / 1000 
        });
        lastTime = currentTime - (deltaTime % interval);
      }

      requestAnimationFrame(update);
    };

    requestAnimationFrame(update);
  }
}

// Initialize the application
async function init() {
  try {
    updateStatus('Creating mock AR context...');

    // Create mock context
    const mockContext = new MockARContext();

    updateStatus('Initializing Three.js renderer plugin...');

    // Create the renderer plugin
    const rendererPlugin = new ThreeJSRendererPlugin({
      container: '#ar-container',
      autoResize: true,
      rendererOptions: {
        alpha: true,
        antialias: true
      },
      cameraOptions: {
        fov: 60,
        near: 0.1,
        far: 1000
      }
    });

    // Initialize the plugin
    await rendererPlugin.init(mockContext);
    await rendererPlugin.enable();

    updateStatus('Setting up Three.js scene...');

    // Get Three.js objects
    const scene = rendererPlugin.getScene();
    const camera = rendererPlugin.getCamera();

    // Position camera
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Create a rotating cube
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({
      color: 0x00ff88,
      metalness: 0.5,
      roughness: 0.5
    });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    // Add edges for better visibility
    const edges = new THREE.EdgesGeometry(geometry);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
    const wireframe = new THREE.LineSegments(edges, lineMaterial);
    cube.add(wireframe);

    // Animation variables
    let time = 0;

    // Subscribe to update events to animate the cube
    mockContext.eventBus.on('engine:update', (event) => {
      time += event.deltaTime;

      // Rotate the cube
      cube.rotation.x = time * 0.5;
      cube.rotation.y = time * 0.7;

      // Slight scale animation
      const scale = 1 + Math.sin(time * 2) * 0.1;
      cube.scale.set(scale, scale, scale);
    });

    // Start the update loop
    mockContext.startUpdateLoop(60);

    updateStatus('✓ Running! Cube is animated.');

    // Demonstrate anchor API (without actual AR markers)
    setTimeout(() => {
      updateStatus('✓ Running! Added marker anchor demo.');

      // Create an anchor (as if a marker was detected)
      const anchor = rendererPlugin.getAnchor('demo-marker');
      anchor.visible = true;

      // Add a sphere to the anchor
      const sphereGeometry = new THREE.SphereGeometry(0.3, 32, 32);
      const sphereMaterial = new THREE.MeshStandardMaterial({
        color: 0xff6600,
        emissive: 0xff3300,
        emissiveIntensity: 0.3
      });
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      sphere.position.set(2, 0, 0);
      anchor.add(sphere);

      // Simulate marker transform update
      const mockMatrix = new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        2, 1, 0, 1
      ]);
      
      // Apply transform using the plugin's internal method
      anchor.matrix.fromArray(mockMatrix);
      anchor.matrixAutoUpdate = false;

      // Animate the sphere within the anchor
      mockContext.eventBus.on('engine:update', (event) => {
        sphere.rotation.y += event.deltaTime * 2;
      });
    }, 2000);

    // Cleanup on page unload
    window.addEventListener('beforeunload', async () => {
      await rendererPlugin.dispose();
    });

  } catch (error) {
    console.error('Initialization error:', error);
    updateStatus(`Error: ${error.message}`, true);
  }
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
