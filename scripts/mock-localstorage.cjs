// scripts/mock-localstorage.cjs
// Mock localStorage for Node.js environments (required by some vite dependencies)
// This runs early via NODE_OPTIONS --require before other modules load

const storage = new Map();

global.localStorage = {
    getItem: (key) => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
    clear: () => storage.clear(),
    get length() {
        return storage.size;
    },
    key: (index) => {
        const keys = Array.from(storage.keys());
        return keys[index] || null;
    },
};

// Also set on globalThis for compatibility
globalThis.localStorage = global.localStorage;
