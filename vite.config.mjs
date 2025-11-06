import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'ARJSPluginThreeJS',
      formats: ['es', 'cjs'],
      fileName: (format) => {
        if (format === 'es') return 'arjs-plugin-threejs.mjs';
        if (format === 'cjs') return 'arjs-plugin-threejs.js';
        return `arjs-plugin-threejs.${format}.js`;
      }
    },
    rollupOptions: {
      external: ['three', 'ar.js-core'],
      output: {
        globals: {
          'three': 'THREE',
          'ar.js-core': 'ARJS'
        }
      }
    },
    sourcemap: true
  }
});
