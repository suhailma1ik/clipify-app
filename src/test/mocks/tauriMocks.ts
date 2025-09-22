/**
 * Comprehensive Tauri API mocks for testing
 * Provides mock implementations for all Tauri plugins and APIs used in the project
 */

import { vi } from 'vitest';

// Mock Store Plugin
export const mockStore = {
  load: vi.fn().mockResolvedValue(undefined),
  save: vi.fn().mockResolvedValue(undefined),
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(undefined),
  clear: vi.fn().mockResolvedValue(undefined),
  reset: vi.fn().mockResolvedValue(undefined),
  keys: vi.fn().mockResolvedValue([]),
  values: vi.fn().mockResolvedValue([]),
  entries: vi.fn().mockResolvedValue([]),
  length: vi.fn().mockResolvedValue(0),
  has: vi.fn().mockResolvedValue(false),
};

// Mock Store constructor and load function
export const mockStoreConstructor = vi.fn().mockImplementation(() => mockStore);
export const mockLoadFunction = vi.fn().mockResolvedValue(mockStore);

// Mock Clipboard Manager Plugin
export const mockClipboardManager = {
  readText: vi.fn().mockResolvedValue(''),
  writeText: vi.fn().mockResolvedValue(undefined),
  readImage: vi.fn().mockResolvedValue(null),
  writeImage: vi.fn().mockResolvedValue(undefined),
  clear: vi.fn().mockResolvedValue(undefined),
  hasText: vi.fn().mockResolvedValue(false),
  hasImage: vi.fn().mockResolvedValue(false),
  hasFiles: vi.fn().mockResolvedValue(false),
  hasHTML: vi.fn().mockResolvedValue(false),
  hasRTF: vi.fn().mockResolvedValue(false),
};

// Mock Global Shortcut Plugin
export const mockGlobalShortcut = {
  register: vi.fn().mockResolvedValue(undefined),
  registerAll: vi.fn().mockResolvedValue(undefined),
  unregister: vi.fn().mockResolvedValue(undefined),
  unregisterAll: vi.fn().mockResolvedValue(undefined),
  isRegistered: vi.fn().mockResolvedValue(false),
};

// Mock HTTP Plugin
export const mockHttp = {
  fetch: vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
    json: vi.fn().mockResolvedValue({}),
    text: vi.fn().mockResolvedValue(''),
    blob: vi.fn().mockResolvedValue(new Blob()),
    arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
  }),
  Body: {
    json: vi.fn(),
    text: vi.fn(),
    bytes: vi.fn(),
    form: vi.fn(),
  },
  Client: vi.fn().mockImplementation(() => ({
    request: mockHttp.fetch,
    get: mockHttp.fetch,
    post: mockHttp.fetch,
    put: mockHttp.fetch,
    delete: mockHttp.fetch,
    patch: mockHttp.fetch,
    head: mockHttp.fetch,
    options: mockHttp.fetch,
  })),
};

// Mock Notification Plugin
export const mockNotification = {
  sendNotification: vi.fn().mockResolvedValue(undefined),
  requestPermission: vi.fn().mockResolvedValue('granted'),
  isPermissionGranted: vi.fn().mockResolvedValue(true),
};

// Mock Shell Plugin
export const mockShell = {
  open: vi.fn().mockResolvedValue(undefined),
  Command: vi.fn().mockImplementation(() => ({
    execute: vi.fn().mockResolvedValue({ code: 0, stdout: '', stderr: '' }),
    spawn: vi.fn().mockResolvedValue({
      write: vi.fn(),
      kill: vi.fn(),
    }),
  })),
};

// Mock Core API
export const mockCore = {
  invoke: vi.fn().mockResolvedValue(undefined),
  convertFileSrc: vi.fn().mockReturnValue(''),
  transformCallback: vi.fn(),
};

// Mock Event API
export const mockEvent = {
  listen: vi.fn().mockResolvedValue(() => {}),
  once: vi.fn().mockResolvedValue(() => {}),
  emit: vi.fn().mockResolvedValue(undefined),
  unlisten: vi.fn().mockResolvedValue(undefined),
  TauriEvent: {
    WINDOW_RESIZED: 'tauri://resize',
    WINDOW_MOVED: 'tauri://move',
    WINDOW_CLOSE_REQUESTED: 'tauri://close-requested',
    WINDOW_CREATED: 'tauri://window-created',
    WINDOW_DESTROYED: 'tauri://window-destroyed',
    WINDOW_FOCUS: 'tauri://focus',
    WINDOW_BLUR: 'tauri://blur',
    WINDOW_SCALE_FACTOR_CHANGED: 'tauri://scale-change',
    WINDOW_THEME_CHANGED: 'tauri://theme-changed',
    WINDOW_FILE_DROP: 'tauri://file-drop',
    WINDOW_FILE_DROP_HOVER: 'tauri://file-drop-hover',
    WINDOW_FILE_DROP_CANCELLED: 'tauri://file-drop-cancelled',
  },
};

// Mock Window API
export const mockWindow = {
  getCurrent: vi.fn().mockReturnValue({
    label: 'main',
    scaleFactor: vi.fn().mockResolvedValue(1),
    innerPosition: vi.fn().mockResolvedValue({ x: 0, y: 0 }),
    outerPosition: vi.fn().mockResolvedValue({ x: 0, y: 0 }),
    innerSize: vi.fn().mockResolvedValue({ width: 800, height: 600 }),
    outerSize: vi.fn().mockResolvedValue({ width: 800, height: 600 }),
    isFullscreen: vi.fn().mockResolvedValue(false),
    isMinimized: vi.fn().mockResolvedValue(false),
    isMaximized: vi.fn().mockResolvedValue(false),
    isFocused: vi.fn().mockResolvedValue(true),
    isDecorated: vi.fn().mockResolvedValue(true),
    isResizable: vi.fn().mockResolvedValue(true),
    isMaximizable: vi.fn().mockResolvedValue(true),
    isMinimizable: vi.fn().mockResolvedValue(true),
    isClosable: vi.fn().mockResolvedValue(true),
    isVisible: vi.fn().mockResolvedValue(true),
    title: vi.fn().mockResolvedValue('Test App'),
    theme: vi.fn().mockResolvedValue('light'),
    show: vi.fn().mockResolvedValue(undefined),
    hide: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn().mockResolvedValue(undefined),
    minimize: vi.fn().mockResolvedValue(undefined),
    unminimize: vi.fn().mockResolvedValue(undefined),
    maximize: vi.fn().mockResolvedValue(undefined),
    unmaximize: vi.fn().mockResolvedValue(undefined),
    toggleMaximize: vi.fn().mockResolvedValue(undefined),
    setFullscreen: vi.fn().mockResolvedValue(undefined),
    setFocus: vi.fn().mockResolvedValue(undefined),
    setIcon: vi.fn().mockResolvedValue(undefined),
    setTitle: vi.fn().mockResolvedValue(undefined),
    setResizable: vi.fn().mockResolvedValue(undefined),
    setMaximizable: vi.fn().mockResolvedValue(undefined),
    setMinimizable: vi.fn().mockResolvedValue(undefined),
    setClosable: vi.fn().mockResolvedValue(undefined),
    setSize: vi.fn().mockResolvedValue(undefined),
    setMinSize: vi.fn().mockResolvedValue(undefined),
    setMaxSize: vi.fn().mockResolvedValue(undefined),
    setPosition: vi.fn().mockResolvedValue(undefined),
    center: vi.fn().mockResolvedValue(undefined),
    requestUserAttention: vi.fn().mockResolvedValue(undefined),
    setSkipTaskbar: vi.fn().mockResolvedValue(undefined),
    setCursorGrab: vi.fn().mockResolvedValue(undefined),
    setCursorVisible: vi.fn().mockResolvedValue(undefined),
    setCursorIcon: vi.fn().mockResolvedValue(undefined),
    setCursorPosition: vi.fn().mockResolvedValue(undefined),
    setIgnoreCursorEvents: vi.fn().mockResolvedValue(undefined),
    startDragging: vi.fn().mockResolvedValue(undefined),
    onResized: vi.fn().mockResolvedValue(() => {}),
    onMoved: vi.fn().mockResolvedValue(() => {}),
    onCloseRequested: vi.fn().mockResolvedValue(() => {}),
    onFocusChanged: vi.fn().mockResolvedValue(() => {}),
    onScaleChanged: vi.fn().mockResolvedValue(() => {}),
    onMenuClicked: vi.fn().mockResolvedValue(() => {}),
    onFileDropEvent: vi.fn().mockResolvedValue(() => {}),
    onThemeChanged: vi.fn().mockResolvedValue(() => {}),
  }),
  getAll: vi.fn().mockReturnValue([]),
  WebviewWindow: vi.fn(),
};

// Setup all Tauri mocks
export const setupTauriMocks = () => {
  // Mock all Tauri plugins with proper exports
  vi.mock('@tauri-apps/plugin-store', () => ({
    Store: mockStoreConstructor,
    load: mockLoadFunction,
  }));

  vi.mock('@tauri-apps/plugin-clipboard-manager', () => mockClipboardManager);
  vi.mock('@tauri-apps/plugin-global-shortcut', () => mockGlobalShortcut);
  vi.mock('@tauri-apps/plugin-http', () => mockHttp);
  vi.mock('@tauri-apps/plugin-notification', () => mockNotification);
  vi.mock('@tauri-apps/plugin-shell', () => mockShell);

  // Mock core Tauri APIs
  vi.mock('@tauri-apps/api/core', () => mockCore);
  vi.mock('@tauri-apps/api/event', () => mockEvent);
  vi.mock('@tauri-apps/api/window', () => mockWindow);
};

// Reset all mocks
export const resetTauriMocks = () => {
  Object.values(mockStore).forEach(mock => {
    if (typeof mock === 'function' && 'mockReset' in mock) {
      mock.mockReset();
    }
  });
  mockStoreConstructor.mockReset();
  mockLoadFunction.mockReset();
  Object.values(mockClipboardManager).forEach(mock => {
    if (typeof mock === 'function' && 'mockReset' in mock) {
      mock.mockReset();
    }
  });
  Object.values(mockGlobalShortcut).forEach(mock => {
    if (typeof mock === 'function' && 'mockReset' in mock) {
      mock.mockReset();
    }
  });
  Object.values(mockNotification).forEach(mock => {
    if (typeof mock === 'function' && 'mockReset' in mock) {
      mock.mockReset();
    }
  });
  Object.values(mockShell).forEach(mock => {
    if (typeof mock === 'function' && 'mockReset' in mock) {
      mock.mockReset();
    }
  });
  Object.values(mockCore).forEach(mock => {
    if (typeof mock === 'function' && 'mockReset' in mock) {
      mock.mockReset();
    }
  });
  Object.values(mockEvent).forEach(mock => {
    if (typeof mock === 'function' && 'mockReset' in mock) {
      mock.mockReset();
    }
  });
};

// Export individual mocks for specific test needs
export {
  mockStore as tauriStore,
  mockStoreConstructor as tauriStoreConstructor,
  mockLoadFunction as tauriStoreLoad,
  mockClipboardManager as tauriClipboard,
  mockGlobalShortcut as tauriShortcut,
  mockHttp as tauriHttp,
  mockNotification as tauriNotification,
  mockShell as tauriShell,
  mockCore as tauriCore,
  mockEvent as tauriEvent,
  mockWindow as tauriWindow,
};