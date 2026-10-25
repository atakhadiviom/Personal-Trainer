import '@testing-library/jest-dom';

// Node 25+ exposes a global `localStorage` that is undefined without a flag, and it
// shadows jsdom's. Install an in-memory Storage class when the global is missing or broken.
if (typeof globalThis.localStorage?.getItem !== 'function') {
  class MemoryStorage {
    #store = new Map();
    getItem(key) {
      return this.#store.has(String(key)) ? this.#store.get(String(key)) : null;
    }
    setItem(key, value) {
      this.#store.set(String(key), String(value));
    }
    removeItem(key) {
      this.#store.delete(String(key));
    }
    clear() {
      this.#store.clear();
    }
    key(index) {
      return [...this.#store.keys()][index] ?? null;
    }
    get length() {
      return this.#store.size;
    }
  }
  globalThis.Storage = MemoryStorage;
  Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true });
}
