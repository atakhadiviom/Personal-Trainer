import '@testing-library/jest-dom';

// Node 22+ shadow-defines globalThis.localStorage as undefined unless --localstorage-file is given,
// breaking jsdom window.localStorage fallback when code uses bare `localStorage`.
if (typeof globalThis.localStorage === 'undefined' || globalThis.localStorage === null) {
  const store = new Map();
  class LocalStorageMock {
    getItem(key) { return store.get(String(key)) ?? null; }
    setItem(key, val) { store.set(String(key), String(val)); }
    removeItem(key) { store.delete(String(key)); }
    clear() { store.clear(); }
    key(i) { return Array.from(store.keys())[i] ?? null; }
    get length() { return store.size; }
  }
  const mockStorage = new LocalStorageMock();
  Object.setPrototypeOf(mockStorage, Storage.prototype);
  Object.defineProperty(globalThis, 'localStorage', {
    value: mockStorage,
    configurable: true,
    writable: true
  });
}

