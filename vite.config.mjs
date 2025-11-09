import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        lib: {
            entry: 'src/index.js',
            name: 'ARJSPluginThreeJS',
            formats: ['es', 'cjs'],
            fileName: (format) =>
                format === 'es' ? 'arjs-plugin-threejs.mjs' : 'arjs-plugin-threejs.js',
        },
        sourcemap: true,
        rollupOptions: {
            external: ['three', 'ar.js-core'],
            output: {
                globals: {
                    three: 'THREE',
                },
            },
        },
    },
    // Inject the package version as a global constant for the plugin to log.
    // Vite automatically populates process.env.npm_package_version.
    define: {
        __THREEJS_RENDERER_PLUGIN_VERSION__: JSON.stringify(process.env.npm_package_version),
    },
});