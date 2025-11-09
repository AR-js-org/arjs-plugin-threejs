import { defineConfig } from 'vitest/config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

function getPkgVersion() {
    // Prefer npm-provided var when running via npm scripts
    if (process.env.npm_package_version) return process.env.npm_package_version;
    // Fallback: read package.json directly
    try {
        const __dirname = dirname(fileURLToPath(import.meta.url));
        const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8'));
        return pkg.version || '0.0.0-test';
    } catch {
        return '0.0.0-test';
    }
}

const version = getPkgVersion();

export default defineConfig({
    // Inject version for tests (matches vite.config.mjs define)
    define: {
        __THREEJS_RENDERER_PLUGIN_VERSION__: JSON.stringify(version),
    },
    test: {
        environment: 'jsdom',
        setupFiles: ['./test/setup.js'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov'],
            include: ['src/**/*.js'],
            exclude: ['dist/**', 'examples/**'],
        },
    },
});