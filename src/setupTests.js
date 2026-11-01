import '@testing-library/jest-dom';

// Node 22+ shadow-defines globalThis.localStorage as undefined unless --localstorage-file is given,
// breaking jsdom window.localStorage fallback when code uses bare `localStorage`.
if (typeof globalThis.localStorage === 'undefined' || globalThis.localStorage === null) {
  const store = new Map();
  const mockStorage = Object.create(Storage.prototype, {
    length: { get: () => store.size }
  });
  // Native Storage methods reject non-jsdom instances; route the mock through the prototype
  // so tests can still spy on Storage.prototype.*.
  const impl = {
    getItem: (key) => store.get(String(key)) ?? null,
    setItem: (key, val) => { store.set(String(key), String(val)); },
    removeItem: (key) => { store.delete(String(key)); },
    clear: () => { store.clear(); },
    key: (i) => Array.from(store.keys())[i] ?? null
  };
  Object.entries(impl).forEach(([name, fn]) => {
    const native = Storage.prototype[name];
    Storage.prototype[name] = function (...args) {
      return this === mockStorage ? fn(...args) : native.apply(this, args);
    };
  });
  Object.defineProperty(globalThis, 'localStorage', {
    value: mockStorage,
    configurable: true,
    writable: true
  });
}

