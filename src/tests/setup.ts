import { beforeEach, vi } from "vitest";

// In-memory mock for localStorage
const storage = new Map<string, string>();

const localStorageMock = {
  getItem: (key: string) => storage.get(key) || null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
  get length() {
    return storage.size;
  },
  key: (index: number) => Array.from(storage.keys())[index] || null,
};

globalThis.localStorage = localStorageMock as any;

if (typeof window === "undefined") {
  (globalThis as any).window = {
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
}

beforeEach(() => {
  storage.clear();
  vi.clearAllMocks();
});
