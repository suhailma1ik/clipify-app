// Vitest setup file for the desktop (refine) project
// Comprehensive test environment setup with Tauri mocks and polyfills

import { vi } from 'vitest';
import { setupTauriMocks } from './mocks/tauriMocks';
import '@testing-library/jest-dom';

// Ensure TextEncoder/TextDecoder exist in the JSDOM test environment
import { TextEncoder, TextDecoder } from "util";

// @ts-ignore
if (!(globalThis as any).TextEncoder) {
  // @ts-ignore
  (globalThis as any).TextEncoder = TextEncoder;
}
// @ts-ignore
if (!(globalThis as any).TextDecoder) {
  // @ts-ignore
  (globalThis as any).TextDecoder = TextDecoder as unknown as typeof globalThis.TextDecoder;
}

// Ensure crypto API exists (Node provides webcrypto via node:crypto)
try {
  // Dynamically import to avoid issues in environments that already provide crypto
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const nodeCrypto = require("node:crypto");
  if (!globalThis.crypto) {
    // @ts-ignore
    globalThis.crypto = nodeCrypto.webcrypto;
  }
} catch {
  // Ignore if unavailable; most Node versions used by Vitest provide crypto
}

// Setup comprehensive Tauri API mocks
setupTauriMocks();

// Mock fetch globally for HTTP requests
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// Setup default fetch responses
mockFetch.mockResolvedValue({
  ok: true,
  status: 200,
  statusText: 'OK',
  headers: new Headers(),
  json: vi.fn().mockResolvedValue({}),
  text: vi.fn().mockResolvedValue(''),
  blob: vi.fn().mockResolvedValue(new Blob()),
  arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
});

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };
globalThis.console = {
  ...originalConsole,
  log: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

// Mock localStorage and sessionStorage
const createStorageMock = () => {
  const storage: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => storage[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      storage[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete storage[key];
    }),
    clear: vi.fn(() => {
      Object.keys(storage).forEach(key => delete storage[key]);
    }),
    key: vi.fn((index: number) => Object.keys(storage)[index] || null),
    get length() {
      return Object.keys(storage).length;
    },
  };
};

Object.defineProperty(globalThis, 'localStorage', {
  value: createStorageMock(),
});

Object.defineProperty(globalThis, 'sessionStorage', {
  value: createStorageMock(),
});

// Mock window.matchMedia
Object.defineProperty(globalThis, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
globalThis.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock URL.createObjectURL and URL.revokeObjectURL
globalThis.URL.createObjectURL = vi.fn(() => 'mock-object-url');
globalThis.URL.revokeObjectURL = vi.fn();

// Export mock fetch for individual test customization
export { mockFetch };
