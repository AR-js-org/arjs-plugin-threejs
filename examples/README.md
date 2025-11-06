# Examples

This directory contains examples demonstrating the usage of `@ar-js-org/arjs-plugin-threejs`.

## Minimal Example

The `minimal` example demonstrates basic usage of the Three.js renderer plugin without AR.js-core integration, showing:

- Plugin initialization with a mock AR context
- Scene setup with lights and 3D objects
- Animation loop integration
- Anchor API demonstration

### Running the Example

Since the example uses ES modules and imports from the built library, you need to:

1. Build the library first:
   ```bash
   npm run build
   ```

2. Serve the example with a local web server:
   ```bash
   # Using Python 3
   python3 -m http.server 8000
   
   # Or using Node.js http-server (npm install -g http-server)
   http-server -p 8000
   
   # Or using PHP
   php -S localhost:8000
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:8000/examples/minimal/
   ```

### Note

This is a standalone example that doesn't require AR.js-core for demonstration purposes. In a real AR application, you would integrate this plugin with:
- AR.js-core's context and event system
- A webcam or video source plugin
- A marker detection plugin

See the main [README.md](../../README.md) for a complete integration example.
