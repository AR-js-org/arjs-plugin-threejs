import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'jsdom',
        setupFiles: ['./test/setup.js'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov'],
            include: ['src/**/*.js'],
            exclude: ['dist/**', 'examples/**']
        },
        // If you prefer using global hooks without imports, set globals: true
        // globals: true
    }
});