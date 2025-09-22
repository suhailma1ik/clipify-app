import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useClipboardMonitoring } from '../useClipboardMonitoring';

// Mock Tauri API
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(),
}));

// Mock utils
vi.mock('../../utils', () => ({
  setupGlobalShortcut: vi.fn(),
  statusMessages: {
    shortcutError: vi.fn(),
  },
}));

const mockListen = vi.mocked(await import('@tauri-apps/api/event')).listen;
const mockSetupGlobalShortcut = vi.mocked(await import('../../utils')).setupGlobalShortcut;
const mockStatusMessages = vi.mocked(await import('../../utils')).statusMessages;

describe('useClipboardMonitoring', () => {
  const mockSetCleanedText = vi.fn();
  const mockLoadClipboardHistory = vi.fn();
  const mockSetShortcutStatus = vi.fn();
  const mockUnlisten = vi.fn();

  const defaultProps = {
    setCleanedText: mockSetCleanedText,
    loadClipboardHistory: mockLoadClipboardHistory,
    setShortcutStatus: mockSetShortcutStatus,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Default mock implementations
    mockSetupGlobalShortcut.mockResolvedValue(undefined);
    mockListen.mockResolvedValue(mockUnlisten);
    mockLoadClipboardHistory.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('setupClipboardMonitoring', () => {
    it('should setup clipboard monitoring successfully', async () => {
      const { result } = renderHook(() => useClipboardMonitoring(defaultProps));

      let cleanup: (() => void) | undefined;
      await act(async () => {
        cleanup = await result.current.setupClipboardMonitoring();
      });

      expect(mockSetupGlobalShortcut).toHaveBeenCalled();
      expect(mockListen).toHaveBeenCalledWith('clipboard-updated', expect.any(Function));
      expect(mockListen).toHaveBeenCalledWith('clipboard-content-changed', expect.any(Function));
      expect(console.log).toHaveBeenCalledWith(
        '[useClipboardMonitoring] Global shortcut setup complete - clipboard monitoring is now event-driven'
      );
      expect(console.log).toHaveBeenCalledWith(
        '[useClipboardMonitoring] Event-driven clipboard monitoring setup complete'
      );
      expect(cleanup).toBeInstanceOf(Function);
    });

    it('should handle setup errors gracefully', async () => {
      const error = new Error('Setup failed');
      mockSetupGlobalShortcut.mockRejectedValueOnce(error);
      (mockStatusMessages.shortcutError as any).mockReturnValue('❌ Failed to setup shortcut: Setup failed');

      const { result } = renderHook(() => useClipboardMonitoring(defaultProps));

      await act(async () => {
        await result.current.setupClipboardMonitoring();
      });

      expect(console.error).toHaveBeenCalledWith(
        '[useClipboardMonitoring] Failed to setup clipboard monitoring:',
        error
      );
      expect(mockSetShortcutStatus).toHaveBeenCalledWith('❌ Failed to setup shortcut: Setup failed');
    });

    it('should handle listen errors gracefully', async () => {
      const error = new Error('Listen failed');
      mockListen.mockRejectedValueOnce(error);
      (mockStatusMessages.shortcutError as any).mockReturnValue('❌ Failed to setup shortcut: Listen failed');

      const { result } = renderHook(() => useClipboardMonitoring(defaultProps));

      await act(async () => {
        await result.current.setupClipboardMonitoring();
      });

      expect(console.error).toHaveBeenCalledWith(
        '[useClipboardMonitoring] Failed to setup clipboard monitoring:',
        error
      );
      expect(mockSetShortcutStatus).toHaveBeenCalledWith('❌ Failed to setup shortcut: Listen failed');
    });
  });

  describe('clipboard-updated event handling', () => {
    it('should handle clipboard updates from global shortcut', async () => {
      let clipboardUpdatedHandler: ((event: any) => Promise<void>) | undefined;
      
      mockListen.mockImplementation((eventName: string, handler: any) => {
        if (eventName === 'clipboard-updated') {
          clipboardUpdatedHandler = handler;
        }
        return Promise.resolve(mockUnlisten);
      });

      const { result } = renderHook(() => useClipboardMonitoring(defaultProps));

      await act(async () => {
        await result.current.setupClipboardMonitoring();
      });

      expect(clipboardUpdatedHandler).toBeDefined();

      // Simulate clipboard update event
      const event = { payload: 'Updated clipboard text' };
      await act(async () => {
        await clipboardUpdatedHandler!(event);
      });

      expect(mockSetCleanedText).toHaveBeenCalledWith('Updated clipboard text');
      expect(mockLoadClipboardHistory).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        '[useClipboardMonitoring] Clipboard updated via global shortcut:',
        { textLength: 22 }
      );
      expect(console.log).toHaveBeenCalledWith(
        '[useClipboardMonitoring] Clipboard history reloaded'
      );
    });

    it('should ignore empty clipboard updates', async () => {
      let clipboardUpdatedHandler: ((event: any) => Promise<void>) | undefined;
      
      mockListen.mockImplementation((eventName: string, handler: any) => {
        if (eventName === 'clipboard-updated') {
          clipboardUpdatedHandler = handler;
        }
        return Promise.resolve(mockUnlisten);
      });

      const { result } = renderHook(() => useClipboardMonitoring(defaultProps));

      await act(async () => {
        await result.current.setupClipboardMonitoring();
      });

      // Test empty string
      const emptyEvent = { payload: '' };
      await act(async () => {
        await clipboardUpdatedHandler!(emptyEvent);
      });

      expect(mockSetCleanedText).not.toHaveBeenCalled();
      expect(mockLoadClipboardHistory).not.toHaveBeenCalled();

      // Test whitespace-only string
      const whitespaceEvent = { payload: '   ' };
      await act(async () => {
        await clipboardUpdatedHandler!(whitespaceEvent);
      });

      expect(mockSetCleanedText).not.toHaveBeenCalled();
      expect(mockLoadClipboardHistory).not.toHaveBeenCalled();
    });

    it('should handle clipboard history reload errors', async () => {
      let clipboardUpdatedHandler: ((event: any) => Promise<void>) | undefined;
      
      mockListen.mockImplementation((eventName: string, handler: any) => {
        if (eventName === 'clipboard-updated') {
          clipboardUpdatedHandler = handler;
        }
        return Promise.resolve(mockUnlisten);
      });

      const error = new Error('Failed to reload history');
      mockLoadClipboardHistory.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useClipboardMonitoring(defaultProps));

      await act(async () => {
        await result.current.setupClipboardMonitoring();
      });

      const event = { payload: 'Test text' };
      await act(async () => {
        await clipboardUpdatedHandler!(event);
      });

      expect(mockSetCleanedText).toHaveBeenCalledWith('Test text');
      expect(console.error).toHaveBeenCalledWith(
        '[useClipboardMonitoring] Failed to reload clipboard history:',
        error
      );
    });
  });

  describe('clipboard-content-changed event handling', () => {
    it('should handle regular clipboard changes', async () => {
      let clipboardChangedHandler: ((event: any) => Promise<void>) | undefined;
      
      mockListen.mockImplementation((eventName: string, handler: any) => {
        if (eventName === 'clipboard-content-changed') {
          clipboardChangedHandler = handler;
        }
        return Promise.resolve(mockUnlisten);
      });

      const { result } = renderHook(() => useClipboardMonitoring(defaultProps));

      await act(async () => {
        await result.current.setupClipboardMonitoring();
      });

      expect(clipboardChangedHandler).toBeDefined();

      // Simulate clipboard change event
      const event = { payload: 'Regular clipboard content' };
      await act(async () => {
        await clipboardChangedHandler!(event);
      });

      expect(mockLoadClipboardHistory).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        '[useClipboardMonitoring] Regular clipboard change detected:',
        { textLength: 25 }
      );
      expect(console.log).toHaveBeenCalledWith(
        '[useClipboardMonitoring] Clipboard history reloaded after regular clipboard change'
      );
    });

    it('should handle clipboard history reload errors for regular changes', async () => {
      let clipboardChangedHandler: ((event: any) => Promise<void>) | undefined;
      
      mockListen.mockImplementation((eventName: string, handler: any) => {
        if (eventName === 'clipboard-content-changed') {
          clipboardChangedHandler = handler;
        }
        return Promise.resolve(mockUnlisten);
      });

      const error = new Error('Failed to reload after regular change');
      mockLoadClipboardHistory.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useClipboardMonitoring(defaultProps));

      await act(async () => {
        await result.current.setupClipboardMonitoring();
      });

      const event = { payload: 'Test content' };
      await act(async () => {
        await clipboardChangedHandler!(event);
      });

      expect(console.error).toHaveBeenCalledWith(
        '[useClipboardMonitoring] Failed to reload clipboard history after regular change:',
        error
      );
    });
  });

  describe('cleanup', () => {
    it('should cleanup event listeners properly', async () => {
      const { result } = renderHook(() => useClipboardMonitoring(defaultProps));

      let cleanup: (() => void) | undefined;
      await act(async () => {
        cleanup = await result.current.setupClipboardMonitoring();
      });

      expect(cleanup).toBeInstanceOf(Function);

      // Call cleanup
      act(() => {
        cleanup!();
      });

      expect(mockUnlisten).toHaveBeenCalledTimes(2); // Called for both event listeners
      expect(console.log).toHaveBeenCalledWith(
        '[useClipboardMonitoring] Clipboard monitoring cleanup complete'
      );
    });

    it('should not cause memory leaks on unmount', () => {
      const { unmount } = renderHook(() => useClipboardMonitoring(defaultProps));

      // Should not throw any errors
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle null payload by throwing TypeError', async () => {
      let clipboardUpdatedHandler: ((event: any) => Promise<void>) | undefined;
      
      mockListen.mockImplementation((eventName: string, handler: any) => {
        if (eventName === 'clipboard-updated') {
          clipboardUpdatedHandler = handler;
        }
        return Promise.resolve(mockUnlisten);
      });

      const { result } = renderHook(() => useClipboardMonitoring(defaultProps));

      await act(async () => {
        await result.current.setupClipboardMonitoring();
      });

      const event = { payload: null };
      await expect(async () => {
        await clipboardUpdatedHandler!(event);
      }).rejects.toThrow(TypeError);

      expect(mockSetCleanedText).not.toHaveBeenCalled();
      expect(mockLoadClipboardHistory).not.toHaveBeenCalled();
    });

    it('should handle undefined payload by throwing TypeError', async () => {
      let clipboardUpdatedHandler: ((event: any) => Promise<void>) | undefined;
      
      mockListen.mockImplementation((eventName: string, handler: any) => {
        if (eventName === 'clipboard-updated') {
          clipboardUpdatedHandler = handler;
        }
        return Promise.resolve(mockUnlisten);
      });

      const { result } = renderHook(() => useClipboardMonitoring(defaultProps));

      await act(async () => {
        await result.current.setupClipboardMonitoring();
      });

      const event = { payload: undefined };
      await expect(async () => {
        await clipboardUpdatedHandler!(event);
      }).rejects.toThrow(TypeError);

      expect(mockSetCleanedText).not.toHaveBeenCalled();
      expect(mockLoadClipboardHistory).not.toHaveBeenCalled();
    });

    it('should handle very long clipboard content', async () => {
      let clipboardUpdatedHandler: ((event: any) => Promise<void>) | undefined;
      
      mockListen.mockImplementation((eventName: string, handler: any) => {
        if (eventName === 'clipboard-updated') {
          clipboardUpdatedHandler = handler;
        }
        return Promise.resolve(mockUnlisten);
      });

      const { result } = renderHook(() => useClipboardMonitoring(defaultProps));

      await act(async () => {
        await result.current.setupClipboardMonitoring();
      });

      const longText = 'A'.repeat(10000);
      const event = { payload: longText };
      await act(async () => {
        await clipboardUpdatedHandler!(event);
      });

      expect(mockSetCleanedText).toHaveBeenCalledWith(longText);
      expect(mockLoadClipboardHistory).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        '[useClipboardMonitoring] Clipboard updated via global shortcut:',
        { textLength: 10000 }
      );
    });
  });
});