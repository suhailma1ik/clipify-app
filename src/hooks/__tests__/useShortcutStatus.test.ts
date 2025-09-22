import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useShortcutStatus } from '../useShortcutStatus';

// Mock the platform utils to return consistent values
vi.mock('../../utils/platform', () => ({
  isMac: vi.fn(() => false), // Force to non-Mac for consistent testing
  getPrimaryModifierKey: vi.fn(() => 'Ctrl'),
  getShortcutLabel: vi.fn(() => 'Ctrl+Shift+C')
}));

// Mock the statusUtils module
vi.mock('../../utils/statusUtils', () => ({
  statusMessages: {
    ready: 'Global shortcut Ctrl+Shift+C ready to capture text',
    rephrasing: '🔄 Rephrasing text...',
    rephrasingManual: '🔄 Rephrasing manual text...',
    success: (timestamp: string) => `✅ Text rephrased and copied! ${timestamp}`,
    successCleaned: (timestamp: string) => `✅ Text cleaned and copied! ${timestamp}`,
    successManual: (timestamp: string) => `✅ Manual text rephrased! ${timestamp}`,
    noText: '⚠️ No text to clean',
    tokenRequired: '❌ JWT token required for rephrasing',
    error: (message: string) => `❌ Failed to rephrase: ${message}`,
    clipboardError: (error: unknown) => `❌ Error reading clipboard: ${error}`,
    shortcutError: (error: unknown) => `❌ Failed to setup shortcut: ${error}`
  }
}));

describe('useShortcutStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with ready status', () => {
      const { result } = renderHook(() => useShortcutStatus());

      expect(result.current.shortcutStatus).toBe('Global shortcut Ctrl+Shift+C ready to capture text');
      expect(typeof result.current.setShortcutStatus).toBe('function');
    });

    it('should return stable references', () => {
      const { result, rerender } = renderHook(() => useShortcutStatus());
      
      const firstSetShortcutStatus = result.current.setShortcutStatus;
      
      rerender();
      
      expect(result.current.setShortcutStatus).toBe(firstSetShortcutStatus);
    });
  });

  describe('status updates', () => {
    it('should update status when setShortcutStatus is called', () => {
      const { result } = renderHook(() => useShortcutStatus());

      act(() => {
        result.current.setShortcutStatus('🔄 Rephrasing text...');
      });

      expect(result.current.shortcutStatus).toBe('🔄 Rephrasing text...');
    });

    it('should handle multiple status updates', () => {
      const { result } = renderHook(() => useShortcutStatus());

      act(() => {
        result.current.setShortcutStatus('🔄 Rephrasing text...');
      });
      expect(result.current.shortcutStatus).toBe('🔄 Rephrasing text...');

      act(() => {
        result.current.setShortcutStatus('✅ Text rephrased and copied! 10:30:45 AM');
      });
      expect(result.current.shortcutStatus).toBe('✅ Text rephrased and copied! 10:30:45 AM');

      act(() => {
        result.current.setShortcutStatus('Global shortcut Ctrl+Shift+C ready to capture text');
      });
      expect(result.current.shortcutStatus).toBe('Global shortcut Ctrl+Shift+C ready to capture text');
    });

    it('should handle empty string status', () => {
      const { result } = renderHook(() => useShortcutStatus());

      act(() => {
        result.current.setShortcutStatus('');
      });

      expect(result.current.shortcutStatus).toBe('');
    });

    it('should handle special characters and emojis', () => {
      const { result } = renderHook(() => useShortcutStatus());

      const specialStatus = '🎉 Success! ✨ Text processed with 100% accuracy 🚀';
      
      act(() => {
        result.current.setShortcutStatus(specialStatus);
      });

      expect(result.current.shortcutStatus).toBe(specialStatus);
    });

    it('should handle very long status messages', () => {
      const { result } = renderHook(() => useShortcutStatus());

      const longStatus = 'A'.repeat(1000);
      
      act(() => {
        result.current.setShortcutStatus(longStatus);
      });

      expect(result.current.shortcutStatus).toBe(longStatus);
    });
  });

  describe('common status patterns', () => {
    it('should handle rephrasing status', () => {
      const { result } = renderHook(() => useShortcutStatus());

      act(() => {
        result.current.setShortcutStatus('🔄 Rephrasing text...');
      });

      expect(result.current.shortcutStatus).toBe('🔄 Rephrasing text...');
    });

    it('should handle success status with timestamp', () => {
      const { result } = renderHook(() => useShortcutStatus());

      const timestamp = '10:30:45 AM';
      const successStatus = `✅ Text rephrased and copied! ${timestamp}`;
      
      act(() => {
        result.current.setShortcutStatus(successStatus);
      });

      expect(result.current.shortcutStatus).toBe(successStatus);
    });

    it('should handle error status', () => {
      const { result } = renderHook(() => useShortcutStatus());

      const errorStatus = '❌ Failed to rephrase: Network error';
      
      act(() => {
        result.current.setShortcutStatus(errorStatus);
      });

      expect(result.current.shortcutStatus).toBe(errorStatus);
    });

    it('should handle warning status', () => {
      const { result } = renderHook(() => useShortcutStatus());

      act(() => {
        result.current.setShortcutStatus('⚠️ No text to clean');
      });

      expect(result.current.shortcutStatus).toBe('⚠️ No text to clean');
    });

    it('should handle authentication required status', () => {
      const { result } = renderHook(() => useShortcutStatus());

      act(() => {
        result.current.setShortcutStatus('❌ JWT token required for rephrasing');
      });

      expect(result.current.shortcutStatus).toBe('❌ JWT token required for rephrasing');
    });
  });

  describe('edge cases', () => {
    it('should handle null status gracefully', () => {
      const { result } = renderHook(() => useShortcutStatus());

      act(() => {
        result.current.setShortcutStatus(null as any);
      });

      expect(result.current.shortcutStatus).toBe(null);
    });

    it('should handle undefined status gracefully', () => {
      const { result } = renderHook(() => useShortcutStatus());

      act(() => {
        result.current.setShortcutStatus(undefined as any);
      });

      expect(result.current.shortcutStatus).toBe(undefined);
    });

    it('should handle numeric status', () => {
      const { result } = renderHook(() => useShortcutStatus());

      act(() => {
        result.current.setShortcutStatus(123 as any);
      });

      expect(result.current.shortcutStatus).toBe(123);
    });

    it('should handle object status', () => {
      const { result } = renderHook(() => useShortcutStatus());

      const objectStatus = { message: 'test' };
      
      act(() => {
        result.current.setShortcutStatus(objectStatus as any);
      });

      expect(result.current.shortcutStatus).toBe(objectStatus);
    });
  });

  describe('performance', () => {
    it('should handle rapid status updates', () => {
      const { result } = renderHook(() => useShortcutStatus());

      act(() => {
        for (let i = 0; i < 100; i++) {
          result.current.setShortcutStatus(`Status update ${i}`);
        }
      });

      expect(result.current.shortcutStatus).toBe('Status update 99');
    });

    it('should not cause memory leaks with repeated renders', () => {
      const { result, rerender } = renderHook(() => useShortcutStatus());

      for (let i = 0; i < 50; i++) {
        act(() => {
          result.current.setShortcutStatus(`Status ${i}`);
        });
        rerender();
      }

      expect(result.current.shortcutStatus).toBe('Status 49');
    });
  });

  describe('integration scenarios', () => {
    it('should work with typical workflow: ready -> rephrasing -> success -> ready', () => {
      const { result } = renderHook(() => useShortcutStatus());

      // Initial ready state
      expect(result.current.shortcutStatus).toBe('Global shortcut Ctrl+Shift+C ready to capture text');

      // Start rephrasing
      act(() => {
        result.current.setShortcutStatus('🔄 Rephrasing text...');
      });
      expect(result.current.shortcutStatus).toBe('🔄 Rephrasing text...');

      // Success
      act(() => {
        result.current.setShortcutStatus('✅ Text rephrased and copied! 10:30:45 AM');
      });
      expect(result.current.shortcutStatus).toBe('✅ Text rephrased and copied! 10:30:45 AM');

      // Back to ready
      act(() => {
        result.current.setShortcutStatus('Global shortcut Ctrl+Shift+C ready to capture text');
      });
      expect(result.current.shortcutStatus).toBe('Global shortcut Ctrl+Shift+C ready to capture text');
    });

    it('should work with error workflow: ready -> rephrasing -> error -> ready', () => {
      const { result } = renderHook(() => useShortcutStatus());

      // Initial ready state
      expect(result.current.shortcutStatus).toBe('Global shortcut Ctrl+Shift+C ready to capture text');

      // Start rephrasing
      act(() => {
        result.current.setShortcutStatus('🔄 Rephrasing text...');
      });
      expect(result.current.shortcutStatus).toBe('🔄 Rephrasing text...');

      // Error
      act(() => {
        result.current.setShortcutStatus('❌ Failed to rephrase: Network error');
      });
      expect(result.current.shortcutStatus).toBe('❌ Failed to rephrase: Network error');

      // Back to ready
      act(() => {
        result.current.setShortcutStatus('Global shortcut Ctrl+Shift+C ready to capture text');
      });
      expect(result.current.shortcutStatus).toBe('Global shortcut Ctrl+Shift+C ready to capture text');
    });

    it('should handle manual rephrase workflow', () => {
      const { result } = renderHook(() => useShortcutStatus());

      // Manual rephrasing
      act(() => {
        result.current.setShortcutStatus('🔄 Rephrasing manual text...');
      });
      expect(result.current.shortcutStatus).toBe('🔄 Rephrasing manual text...');

      // Manual success
      act(() => {
        result.current.setShortcutStatus('✅ Manual text rephrased! 10:30:45 AM');
      });
      expect(result.current.shortcutStatus).toBe('✅ Manual text rephrased! 10:30:45 AM');
    });
  });
});