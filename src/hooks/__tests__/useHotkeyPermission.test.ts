import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useHotkeyPermission } from '../useHotkeyPermission';

// Mock Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-global-shortcut', () => ({
  register: vi.fn(),
  unregister: vi.fn(),
  isRegistered: vi.fn(),
}));

// Mock utils
vi.mock('../../utils', () => ({
  isTauriEnvironment: vi.fn(),
}));

const mockInvoke = vi.mocked(await import('@tauri-apps/api/core')).invoke;
const mockRegister = vi.mocked(await import('@tauri-apps/plugin-global-shortcut')).register;
const mockUnregister = vi.mocked(await import('@tauri-apps/plugin-global-shortcut')).unregister;
const mockIsRegistered = vi.mocked(await import('@tauri-apps/plugin-global-shortcut')).isRegistered;
const mockIsTauriEnvironment = vi.mocked(await import('../../utils')).isTauriEnvironment;

describe('useHotkeyPermission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Default mock implementations
    mockIsTauriEnvironment.mockReturnValue(true);
    mockInvoke.mockResolvedValue(undefined);
    mockIsRegistered.mockResolvedValue(false);
    mockRegister.mockResolvedValue(undefined);
    mockUnregister.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default state', async () => {
      const { result } = renderHook(() => useHotkeyPermission());

      // The hook starts loading immediately due to useEffect calling checkPermissions
      expect(result.current.permissionStatus).toBeNull();
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();
      
      // Wait for the initial checkPermissions to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should check permissions on mount', async () => {
      renderHook(() => useHotkeyPermission());

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('check_accessibility_permissions');
        expect(mockIsRegistered).toHaveBeenCalledWith('CommandOrControl+Shift+C');
      });
    });

    it('should not check permissions in non-Tauri environment', () => {
      mockIsTauriEnvironment.mockReturnValue(false);

      renderHook(() => useHotkeyPermission());

      expect(console.warn).toHaveBeenCalledWith(
        'Permission checking not available in browser environment'
      );
      expect(mockInvoke).not.toHaveBeenCalled();
    });
  });

  describe('checkPermissions', () => {
    it('should check permissions successfully', async () => {
      const { result } = renderHook(() => useHotkeyPermission());

      await act(async () => {
        await result.current.checkPermissions();
      });

      expect(result.current.permissionStatus).toEqual({
        accessibility_granted: true,
        shortcut_registered: false,
        can_register_shortcut: true,
        error_message: null,
        needs_restart: false,
      });
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle accessibility permission denied', async () => {
      mockInvoke.mockImplementation((command) => {
        if (command === 'check_accessibility_permissions') {
          return Promise.reject(new Error('Permission denied'));
        }
        return Promise.resolve();
      });

      const { result } = renderHook(() => useHotkeyPermission());

      await act(async () => {
        await result.current.checkPermissions();
      });

      expect(result.current.permissionStatus).toEqual({
        accessibility_granted: false,
        shortcut_registered: false,
        can_register_shortcut: false,
        error_message: null,
        needs_restart: false,
      });
    });

    it('should check permissions with shortcut registered', async () => {
      // Override the default mock for this specific test
      mockIsRegistered.mockResolvedValueOnce(true);

      const { result } = renderHook(() => useHotkeyPermission());

      // Wait for the initial checkPermissions call to complete
      await waitFor(() => {
        expect(result.current.permissionStatus).not.toBeNull();
      });

      expect(result.current.permissionStatus).toEqual({
        accessibility_granted: true,
        shortcut_registered: true,
        can_register_shortcut: true,
        error_message: null,
        needs_restart: false,
      });
    });

    it('should handle shortcut check error', async () => {
      mockIsRegistered.mockRejectedValueOnce(new Error('Shortcut check failed'));

      const { result } = renderHook(() => useHotkeyPermission());

      await act(async () => {
        await result.current.checkPermissions();
      });

      expect(result.current.permissionStatus).toEqual({
        accessibility_granted: true,
        shortcut_registered: false,
        can_register_shortcut: true,
        error_message: null,
        needs_restart: false,
      });
    });

    it('should handle general error', async () => {
      // Mock the entire try block to fail by making the status creation fail
      const error = new Error('General error');
      
      // Mock console.log to throw an error to trigger the outer catch
      const originalConsoleLog = console.log;
      console.log = vi.fn().mockImplementation(() => {
        throw error;
      });

      const { result } = renderHook(() => useHotkeyPermission());

      await act(async () => {
        await result.current.checkPermissions();
      });

      expect(result.current.error).toBe('General error');
      expect(result.current.permissionStatus).toBeNull();
      
      // Restore console.log
      console.log = originalConsoleLog;
    });
  });

  describe('requestPermissions', () => {
    it('should request permissions successfully', async () => {
      const { result } = renderHook(() => useHotkeyPermission());

      await act(async () => {
        await result.current.requestPermissions();
      });

      expect(mockInvoke).toHaveBeenCalledWith('request_input_monitoring_permission');
      expect(mockInvoke).toHaveBeenCalledWith('open_accessibility_settings');
      expect(console.log).toHaveBeenCalledWith('🔐 Requesting input monitoring permission...');
      expect(console.log).toHaveBeenCalledWith('🔐 Opening accessibility settings...');
    });

    it('should handle input monitoring permission error gracefully', async () => {
      mockInvoke.mockImplementation((command) => {
        if (command === 'request_input_monitoring_permission') {
          return Promise.reject(new Error('Input monitoring failed'));
        }
        return Promise.resolve();
      });

      const { result } = renderHook(() => useHotkeyPermission());

      await act(async () => {
        await result.current.requestPermissions();
      });

      expect(console.log).toHaveBeenCalledWith('Input monitoring permission needed:', expect.any(Error));
      expect(mockInvoke).toHaveBeenCalledWith('open_accessibility_settings');
    });

    it('should handle accessibility settings error', async () => {
      mockInvoke.mockImplementation((command) => {
        if (command === 'open_accessibility_settings') {
          return Promise.reject(new Error('Settings error'));
        }
        return Promise.resolve();
      });

      const { result } = renderHook(() => useHotkeyPermission());

      await act(async () => {
        await result.current.requestPermissions();
      });

      expect(result.current.error).toBe('Settings error');
    });

    it('should not request permissions in non-Tauri environment', async () => {
      mockIsTauriEnvironment.mockReturnValue(false);

      const { result } = renderHook(() => useHotkeyPermission());

      await act(async () => {
        await result.current.requestPermissions();
      });

      expect(console.warn).toHaveBeenCalledWith(
        'Permission request not available in browser environment'
      );
      expect(mockInvoke).not.toHaveBeenCalled();
    });
  });

  describe('registerShortcut', () => {
    it('should register shortcut successfully', async () => {
      const { result } = renderHook(() => useHotkeyPermission());

      await act(async () => {
        await result.current.registerShortcut();
      });

      expect(mockIsRegistered).toHaveBeenCalledWith('CommandOrControl+Shift+C');
      expect(mockRegister).toHaveBeenCalledWith('CommandOrControl+Shift+C', expect.any(Function));
      expect(console.log).toHaveBeenCalledWith('✅ Global shortcut registered successfully using Tauri v2 API');
    });

    it('should unregister existing shortcut before registering', async () => {
      mockIsRegistered.mockResolvedValueOnce(true);

      const { result } = renderHook(() => useHotkeyPermission());

      await act(async () => {
        await result.current.registerShortcut();
      });

      expect(mockUnregister).toHaveBeenCalledWith('CommandOrControl+Shift+C');
      expect(mockRegister).toHaveBeenCalledWith('CommandOrControl+Shift+C', expect.any(Function));
    });

    it('should handle unregister error gracefully', async () => {
      mockIsRegistered.mockResolvedValueOnce(true);
      mockUnregister.mockRejectedValueOnce(new Error('Unregister failed'));

      const { result } = renderHook(() => useHotkeyPermission());

      await act(async () => {
        await result.current.registerShortcut();
      });

      expect(console.warn).toHaveBeenCalledWith(
        'Could not check/unregister existing shortcut before registering:',
        expect.any(Error)
      );
      expect(mockRegister).toHaveBeenCalled();
    });

    it('should handle RegisterEventHotKey failure with retry', async () => {
      mockRegister
        .mockRejectedValueOnce(new Error('RegisterEventHotKey failed'))
        .mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useHotkeyPermission());

      await act(async () => {
        await result.current.registerShortcut();
      });

      expect(mockUnregister).toHaveBeenCalledWith('CommandOrControl+Shift+C');
      expect(mockRegister).toHaveBeenCalledTimes(2);
      expect(console.warn).toHaveBeenCalledWith(
        'RegisterEventHotKey failed. Attempting to unregister existing binding and retry once...'
      );
    });

    it('should handle registration error', async () => {
      const error = new Error('Registration failed');
      mockRegister.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useHotkeyPermission());

      await act(async () => {
        await result.current.registerShortcut();
      });

      expect(result.current.error).toBe('Registration failed');
      expect(console.error).toHaveBeenCalledWith('❌ Failed to register global shortcut:', 'Registration failed');
    });

    it('should handle permission error with suggestion', async () => {
      const error = new Error('Permission denied for accessibility');
      mockRegister.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useHotkeyPermission());

      await act(async () => {
        await result.current.registerShortcut();
      });

      expect(result.current.error).toBe('Permission denied for accessibility');
      expect(console.log).toHaveBeenCalledWith(
        '🔧 Permission error detected, user may need to grant accessibility permissions'
      );
    });

    it('should not register shortcut in non-Tauri environment', async () => {
      mockIsTauriEnvironment.mockReturnValue(false);

      const { result } = renderHook(() => useHotkeyPermission());

      await act(async () => {
        await result.current.registerShortcut();
      });

      expect(console.warn).toHaveBeenCalledWith(
        'Shortcut registration not available in browser environment'
      );
      expect(mockRegister).not.toHaveBeenCalled();
    });

    it('should trigger clipboard copy when shortcut is pressed', async () => {
      let shortcutHandler: ((event: any) => void) | undefined;
      
      mockRegister.mockImplementation((_shortcut, handler) => {
        shortcutHandler = handler;
        return Promise.resolve();
      });

      const { result } = renderHook(() => useHotkeyPermission());

      await act(async () => {
        await result.current.registerShortcut();
      });

      expect(shortcutHandler).toBeDefined();

      // Simulate shortcut press
      act(() => {
        shortcutHandler!({ state: 'Pressed' });
      });

      expect(mockInvoke).toHaveBeenCalledWith('trigger_clipboard_copy');
    });

    it('should handle clipboard copy error', async () => {
      let shortcutHandler: ((event: any) => void) | undefined;
      
      mockRegister.mockImplementation((_shortcut, handler) => {
        shortcutHandler = handler;
        return Promise.resolve();
      });

      mockInvoke.mockImplementation((command) => {
        if (command === 'trigger_clipboard_copy') {
          return Promise.reject(new Error('Clipboard copy failed'));
        }
        return Promise.resolve();
      });

      const { result } = renderHook(() => useHotkeyPermission());

      await act(async () => {
        await result.current.registerShortcut();
      });

      // Simulate shortcut press
      await act(async () => {
        shortcutHandler!({ state: 'Pressed' });
        // Wait for the promise to resolve/reject
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(console.error).toHaveBeenCalledWith('Failed to copy selected text:', expect.any(Error));
    });
  });

  describe('openAccessibilitySettings', () => {
    it('should open accessibility settings successfully', async () => {
      const { result } = renderHook(() => useHotkeyPermission());

      await act(async () => {
        await result.current.openAccessibilitySettings();
      });

      expect(mockInvoke).toHaveBeenCalledWith('open_accessibility_settings');
      expect(console.log).toHaveBeenCalledWith('🔧 Opening accessibility settings...');
      expect(console.log).toHaveBeenCalledWith('✅ Accessibility settings opened');
    });

    it('should handle settings error', async () => {
      const error = new Error('Settings failed');
      mockInvoke.mockImplementation((command) => {
        if (command === 'open_accessibility_settings') {
          return Promise.reject(error);
        }
        return Promise.resolve();
      });

      const { result } = renderHook(() => useHotkeyPermission());

      await act(async () => {
        await result.current.openAccessibilitySettings();
      });

      expect(result.current.error).toBe('Settings failed');
      expect(console.error).toHaveBeenCalledWith('❌ Failed to open accessibility settings:', 'Settings failed');
    });

    it('should not open settings in non-Tauri environment', async () => {
      mockIsTauriEnvironment.mockReturnValue(false);

      const { result } = renderHook(() => useHotkeyPermission());

      await act(async () => {
        await result.current.openAccessibilitySettings();
      });

      expect(console.warn).toHaveBeenCalledWith(
        'Settings opening not available in browser environment'
      );
      expect(mockInvoke).not.toHaveBeenCalled();
    });
  });

  describe('refreshStatus', () => {
    it('should refresh permission status', async () => {
      const { result } = renderHook(() => useHotkeyPermission());

      await act(async () => {
        await result.current.refreshStatus();
      });

      expect(mockInvoke).toHaveBeenCalledWith('check_accessibility_permissions');
      expect(mockIsRegistered).toHaveBeenCalledWith('CommandOrControl+Shift+C');
    });
  });

  describe('loading states', () => {
    it('should set loading state during checkPermissions', async () => {
      let resolveInvoke: () => void;
      const invokePromise = new Promise<void>((resolve) => {
        resolveInvoke = resolve;
      });
      mockInvoke.mockReturnValueOnce(invokePromise);

      const { result } = renderHook(() => useHotkeyPermission());

      act(() => {
        result.current.checkPermissions();
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveInvoke!();
        await invokePromise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should set loading state during registerShortcut', async () => {
      let resolveRegister: () => void;
      const registerPromise = new Promise<void>((resolve) => {
        resolveRegister = resolve;
      });
      mockRegister.mockReturnValueOnce(registerPromise);

      const { result } = renderHook(() => useHotkeyPermission());

      act(() => {
        result.current.registerShortcut();
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveRegister!();
        await registerPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle non-Error objects in catch blocks', async () => {
      // Mock setPermissionStatus to throw a non-Error object to trigger the outer catch
      const error = 'String error';
      
      // Mock console.log to throw a string error to trigger the outer catch
      const originalConsoleLog = console.log;
      console.log = vi.fn().mockImplementation((message) => {
        if (message === '✅ Permission status received:') {
          throw error;
        }
      });

      const { result } = renderHook(() => useHotkeyPermission());

      await act(async () => {
        await result.current.checkPermissions();
      });

      expect(result.current.error).toBe('String error');
      
      // Restore console.log
      console.log = originalConsoleLog;
    });

    it('should handle shortcut event with non-Pressed state', async () => {
      let shortcutHandler: ((event: any) => void) | undefined;
      
      mockRegister.mockImplementation((_shortcut, handler) => {
        shortcutHandler = handler;
        return Promise.resolve();
      });

      const { result } = renderHook(() => useHotkeyPermission());

      await act(async () => {
        await result.current.registerShortcut();
      });

      // Simulate shortcut release
      act(() => {
        shortcutHandler!({ state: 'Released' });
      });

      // Should not trigger clipboard copy
      expect(mockInvoke).not.toHaveBeenCalledWith('trigger_clipboard_copy');
    });

    it('should handle multiple concurrent operations', async () => {
      const { result } = renderHook(() => useHotkeyPermission());

      await act(async () => {
        await Promise.all([
          result.current.checkPermissions(),
          result.current.refreshStatus(),
        ]);
      });

      // Should handle concurrent calls without issues
      expect(mockInvoke).toHaveBeenCalledWith('check_accessibility_permissions');
      expect(mockIsRegistered).toHaveBeenCalledWith('CommandOrControl+Shift+C');
    });
  });
});