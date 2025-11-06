import * as THREE from 'three';
import { ThreeJSRendererPlugin } from '../../dist/arjs-plugin-threejs.mjs';

// Note: This example uses a mock AR.js-core engine since ar.js-core is not yet published.
// When ar.js-core is available, replace MockAREngine with:
// import { AREngine } from 'ar.js-core';
// const engine = new AREngine();

// Mock AR.js-core engine for demonstration
class MockAREngine {
  constructor() {
    this.listeners = new Map();
    this.plugins = [];
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return;
    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  emit(event, data) {
    if (!this.listeners.has(event)) return;
    this.listeners.get(event).forEach(callback => callback(data));
  }

  registerPlugin(plugin) {
    this.plugins.push(plugin);
  }

  async init() {
    for (const plugin of this.plugins) {
      if (plugin.init) {
        plugin.init(this);
      }
    }
  }

  start() {
    // Start animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      this.emit('engine:update', { timestamp: Date.now() });
    };
    animate();
  }
}

// Initialize the example
async function init() {
  const statusEl = document.getElementById('status');
  
  try {
    statusEl.textContent = 'Creating AR engine...';
    
    // Create mock AR engine
    const engine = new MockAREngine();
    
    statusEl.textContent = 'Initializing Three.js plugin...';
    
    // Create and register the Three.js renderer plugin
    const threePlugin = new ThreeJSRendererPlugin({
      container: document.getElementById('viewport'),
      antialias: true,
      alpha: true
    });
    
    engine.registerPlugin(threePlugin);
    await engine.init();
    threePlugin.enable();
    
    statusEl.textContent = 'Setting up scene...';
    
    // Get the Three.js scene
    const scene = threePlugin.getScene();
    
    // Add a simple cube to demonstrate rendering
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0x00ff00,
      wireframe: true 
    });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.z = -5;
    scene.add(cube);
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    // Animate the cube
    let rotation = 0;
    engine.on('engine:update', () => {
      rotation += 0.01;
      cube.rotation.x = rotation;
      cube.rotation.y = rotation * 0.7;
    });
    
    statusEl.textContent = 'Running! 🎉';
    
    // Start the engine
    engine.start();
    
    // Simulate marker events for demonstration
    setTimeout(() => {
      console.log('Simulating marker detection...');
      
      // Create a simple rotation matrix for marker
      const matrix = new THREE.Matrix4();
      matrix.makeRotationY(Math.PI / 4);
      matrix.setPosition(0, 0, -3);
      
      engine.emit('ar:marker', {
        id: 'marker-0',
        visible: true,
        matrix: matrix.toArray()
      });
      
      // Add a sphere to the marker anchor
      const markerAnchor = threePlugin.getAnchor('marker-0');
      if (markerAnchor) {
        const sphereGeometry = new THREE.SphereGeometry(0.5, 16, 16);
        const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        markerAnchor.add(sphere);
        console.log('Added sphere to marker anchor');
      }
    }, 2000);
    
  } catch (error) {
    console.error('Error initializing example:', error);
    statusEl.textContent = `Error: ${error.message}`;
  }
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
