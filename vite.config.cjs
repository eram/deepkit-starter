// vite.config.cjs - Using .cjs to ensure localStorage mock runs before any ES module processing

// Mock localStorage for Node.js environments (required by some vite dependencies like @typescript/vfs)
if (typeof globalThis.localStorage === 'undefined') {
    const storage = new Map();
    globalThis.localStorage = {
        getItem: (key) => storage.get(key) || null,
        setItem: (key, value) => storage.set(key, String(value)),
        removeItem: (key) => storage.delete(key),
        clear: () => storage.clear(),
        get length() { return storage.size; },
        key: (index) => {
            const keys = Array.from(storage.keys());
            return keys[index] || null;
        }
    };
}

const { defineConfig } = require('vite');
const { deepkitType } = require('@deepkit/vite');

module.exports = defineConfig({
    plugins: [
        deepkitType()
    ]
});
