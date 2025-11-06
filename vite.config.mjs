import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'ARjsPluginThreeJS',
      formats: ['es', 'cjs'],
      fileName: (format) => {
        if (format === 'es') {
          return 'arjs-plugin-threejs.mjs';
        }
        return 'arjs-plugin-threejs.js';
      }
    },
    rollupOptions: {
      // Externalize dependencies that shouldn't be bundled
      external: ['three', 'ar.js-core'],
      output: {
        // Provide global variables for UMD builds (if needed in the future)
        globals: {
          three: 'THREE',
          'ar.js-core': 'ARjsCore'
        }
      }
    },
    sourcemap: true,
    minify: false
  }
});
