import { beforeAll } from 'vitest';

// JSDOM environment is active. Prepare a viewport container for the renderer.
beforeAll(() => {
    const viewport = document.createElement('div');
    viewport.id = 'viewport';
    Object.assign(viewport.style, {
        position: 'relative',
        width: '640px',
        height: '480px'
    });
    document.body.appendChild(viewport);
});