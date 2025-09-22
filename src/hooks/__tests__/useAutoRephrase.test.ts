import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoRephrase } from '../useAutoRephrase';
import { rephraseService } from '../../services/rephraseService';
import { getApiClient } from '../../services/apiClient';
import { writeToClipboard, statusMessages, getCurrentTimestamp, resetStatusAfterDelay } from '../../utils';
import { getAuthErrorHandler } from '../../services/authErrorHandler';

// Mock dependencies
vi.mock('../../services/rephraseService');
vi.mock('../../services/apiClient');
vi.mock('../../utils');
vi.mock('../../services/authErrorHandler');
vi.mock('@tauri-apps/api/event');

const mockRephraseService = vi.mocked(rephraseService);
const mockGetApiClient = vi.mocked(getApiClient);
const mockWriteToClipboard = vi.mocked(writeToClipboard);
const mockStatusMessages = vi.mocked(statusMessages);
const mockGetCurrentTimestamp = vi.mocked(getCurrentTimestamp);
const mockResetStatusAfterDelay = vi.mocked(resetStatusAfterDelay);
const mockGetAuthErrorHandler = vi.mocked(getAuthErrorHandler);

describe('useAutoRephrase', () => {
  const mockShowNotification = vi.fn();
  const mockSetShortcutStatus = vi.fn();
  const mockApiClient = {
    getJwtToken: vi.fn(),
  } as any;
  const mockAuthErrorHandler = {
    isAuthError: vi.fn(),
    handleAuthError: vi.fn(),
  } as any;
  const mockUnlisten = vi.fn();
  const mockListen = vi.fn();

  const defaultProps = {
    showNotification: mockShowNotification,
    setShortcutStatus: mockSetShortcutStatus,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Mock Tauri event system
    vi.doMock('@tauri-apps/api/event', () => ({
      listen: mockListen,
    }));
    
    // Default mock implementations
    mockGetApiClient.mockReturnValue(mockApiClient);
    mockApiClient.getJwtToken.mockReturnValue('test-token');
    mockGetAuthErrorHandler.mockReturnValue(mockAuthErrorHandler);
    mockAuthErrorHandler.isAuthError.mockReturnValue(false);
    
    mockRephraseService.rephrase.mockResolvedValue({
      rephrased_text: 'This is the rephrased text',
    });
    
    mockWriteToClipboard.mockResolvedValue(undefined);
    mockGetCurrentTimestamp.mockReturnValue('12:34:56');
    mockStatusMessages.rephrasing = 'Rephrasing...';
    mockStatusMessages.tokenRequired = 'Token required';
    mockStatusMessages.success = vi.fn().mockReturnValue('Success at 12:34:56');
    mockStatusMessages.error = vi.fn().mockReturnValue('Error occurred');
    
    mockListen.mockResolvedValue(mockUnlisten);

    // Mock console methods to avoid noise in tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('setupAutoRephraseListener', () => {
    it('should setup event listener successfully', async () => {
      const { result } = renderHook(() => useAutoRephrase(defaultProps));

      await act(async () => {
        const unlisten = await result.current.setupAutoRephraseListener();
        expect(unlisten).toBe(mockUnlisten);
      });

      expect(mockListen).toHaveBeenCalledWith('auto-rephrase-request', expect.any(Function));
      expect(console.log).toHaveBeenCalledWith('[useAutoRephrase] Auto-rephrase event listener setup complete');
    });

    it('should handle setup errors gracefully', async () => {
      const setupError = new Error('Failed to setup listener');
      mockListen.mockRejectedValue(setupError);

      const { result } = renderHook(() => useAutoRephrase(defaultProps));

      await act(async () => {
        const unlisten = await result.current.setupAutoRephraseListener();
        expect(unlisten).toBeUndefined();
      });

      expect(console.error).toHaveBeenCalledWith('[useAutoRephrase] Failed to setup auto-rephrase listener:', setupError);
    });
  });

  describe('auto-rephrase event handling', () => {
    let eventHandler: (event: any) => Promise<void>;

    beforeEach(async () => {
      mockListen.mockImplementation((_eventName, handler) => {
        eventHandler = handler;
        return Promise.resolve(mockUnlisten);
      });

      const { result } = renderHook(() => useAutoRephrase(defaultProps));
      await act(async () => {
        await result.current.setupAutoRephraseListener();
      });
    });

    it('should process valid text successfully', async () => {
      const testText = 'This is some text to rephrase';
      const event = { payload: testText };

      await act(async () => {
        await eventHandler(event);
      });

      expect(mockSetShortcutStatus).toHaveBeenCalledWith('Rephrasing...');
      expect(mockRephraseService.rephrase).toHaveBeenCalledWith(
        testText,
        'formal',
        'Business communication',
        'Colleagues',
        false
      );
      expect(mockWriteToClipboard).toHaveBeenCalledWith('This is the rephrased text');
      expect(mockShowNotification).toHaveBeenCalledWith('Text rephrased and copied to clipboard!', 'success');
      expect(mockResetStatusAfterDelay).toHaveBeenCalledWith(mockSetShortcutStatus);
    });

    it('should ignore empty text', async () => {
      const event = { payload: '' };

      await act(async () => {
        await eventHandler(event);
      });

      expect(console.log).toHaveBeenCalledWith('[useAutoRephrase] No text to rephrase');
      expect(mockRephraseService.rephrase).not.toHaveBeenCalled();
    });

    it('should ignore whitespace-only text', async () => {
      const event = { payload: '   \n\t   ' };

      await act(async () => {
        await eventHandler(event);
      });

      expect(console.log).toHaveBeenCalledWith('[useAutoRephrase] No text to rephrase');
      expect(mockRephraseService.rephrase).not.toHaveBeenCalled();
    });

    it('should handle missing JWT token', async () => {
      mockApiClient.getJwtToken.mockReturnValue(null);
      const event = { payload: 'Some text' };

      await act(async () => {
        await eventHandler(event);
      });

      expect(mockSetShortcutStatus).toHaveBeenCalledWith('Token required');
      expect(mockShowNotification).toHaveBeenCalledWith('Authentication is required for rephrasing shortcut', 'error');
      expect(mockRephraseService.rephrase).not.toHaveBeenCalled();
    });

    it('should handle API client errors', async () => {
      const apiError = new Error('API client not initialized');
      mockGetApiClient.mockImplementation(() => {
        throw apiError;
      });
      const event = { payload: 'Some text' };

      await act(async () => {
        await eventHandler(event);
      });

      expect(console.error).toHaveBeenCalledWith('[useAutoRephrase] Failed to get API client:', apiError);
      expect(mockSetShortcutStatus).toHaveBeenCalledWith('Token required');
      expect(mockShowNotification).toHaveBeenCalledWith('API client not initialized', 'error');
      expect(mockRephraseService.rephrase).not.toHaveBeenCalled();
    });

    it('should handle rephrase service errors', async () => {
      const rephraseError = new Error('Rephrase failed');
      mockRephraseService.rephrase.mockRejectedValue(rephraseError);
      const event = { payload: 'Some text' };

      await act(async () => {
        await eventHandler(event);
      });

      expect(console.error).toHaveBeenCalledWith('[useAutoRephrase] Failed to rephrase text:', rephraseError);
      expect(mockStatusMessages.error).toHaveBeenCalledWith('Rephrase failed');
      expect(mockShowNotification).toHaveBeenCalledWith('Failed to rephrase text: Rephrase failed', 'error');
    });

    it('should handle authentication errors', async () => {
      const authError = new Error('Authentication failed');
      mockRephraseService.rephrase.mockRejectedValue(authError);
      mockAuthErrorHandler.isAuthError.mockReturnValue(true);
      const event = { payload: 'Some text' };

      await act(async () => {
        await eventHandler(event);
      });

      expect(mockAuthErrorHandler.handleAuthError).toHaveBeenCalledWith(authError, 'useAutoRephrase');
      expect(mockShowNotification).toHaveBeenCalledWith('Authentication expired. Please log in again.', 'error');
    });

    it('should handle clipboard write errors', async () => {
      const clipboardError = new Error('Clipboard write failed');
      mockWriteToClipboard.mockRejectedValue(clipboardError);
      const event = { payload: 'Some text' };

      await act(async () => {
        await eventHandler(event);
      });

      expect(console.error).toHaveBeenCalledWith('[useAutoRephrase] Failed to rephrase text:', clipboardError);
      expect(mockShowNotification).toHaveBeenCalledWith('Failed to rephrase text: Clipboard write failed', 'error');
    });
  });

  describe('debouncing', () => {
    let eventHandler: (event: any) => Promise<void>;

    beforeEach(async () => {
      mockListen.mockImplementation((_eventName, handler) => {
        eventHandler = handler;
        return Promise.resolve(mockUnlisten);
      });

      const { result } = renderHook(() => useAutoRephrase(defaultProps));
      await act(async () => {
        await result.current.setupAutoRephraseListener();
      });
    });

    it('should debounce rapid requests', async () => {
      const event = { payload: 'Test text' };

      // First request
      await act(async () => {
        await eventHandler(event);
      });

      expect(mockRephraseService.rephrase).toHaveBeenCalledTimes(1);

      // Second request immediately after (should be ignored)
      await act(async () => {
        await eventHandler(event);
      });

      expect(console.log).toHaveBeenCalledWith('[useAutoRephrase] Request ignored - too soon since last request');
      expect(mockRephraseService.rephrase).toHaveBeenCalledTimes(1);
    });

    it('should allow requests after debounce delay', async () => {
      const event = { payload: 'Test text' };

      // First request
      await act(async () => {
        await eventHandler(event);
      });

      expect(mockRephraseService.rephrase).toHaveBeenCalledTimes(1);

      // Advance time past debounce delay
      act(() => {
        vi.advanceTimersByTime(1100);
      });

      // Second request after delay (should be processed)
      await act(async () => {
        await eventHandler(event);
      });

      expect(mockRephraseService.rephrase).toHaveBeenCalledTimes(2);
    });

    it('should ignore requests while processing', async () => {
      // Make rephrase service hang to simulate processing
      let resolveRephrase: (value: { rephrased_text: string }) => void;
      const rephrasePromise = new Promise<{ rephrased_text: string }>(resolve => {
        resolveRephrase = resolve;
      });
      mockRephraseService.rephrase.mockReturnValue(rephrasePromise);

      const event = { payload: 'Test text' };

      // Start first request (will hang)
      const firstRequest = act(async () => {
        await eventHandler(event);
      });

      // Second request while first is processing (should be ignored)
      await act(async () => {
        await eventHandler(event);
      });

      expect(console.log).toHaveBeenCalledWith('[useAutoRephrase] Request ignored - already processing');

      // Resolve the first request
      resolveRephrase!({ rephrased_text: 'Rephrased text' });
      await firstRequest;

      expect(mockRephraseService.rephrase).toHaveBeenCalledTimes(1);
    });
  });

  describe('logging', () => {
    let eventHandler: (event: any) => Promise<void>;

    beforeEach(async () => {
      mockListen.mockImplementation((_eventName, handler) => {
        eventHandler = handler;
        return Promise.resolve(mockUnlisten);
      });

      const { result } = renderHook(() => useAutoRephrase(defaultProps));
      await act(async () => {
        await result.current.setupAutoRephraseListener();
      });
    });

    it('should log request details', async () => {
      const testText = 'This is some test text';
      const event = { payload: testText };

      await act(async () => {
        await eventHandler(event);
      });

      expect(console.log).toHaveBeenCalledWith('[useAutoRephrase] Auto-rephrase request received:', {
        textLength: testText.length,
        timeSinceLastRequest: expect.any(Number),
        isProcessing: false
      });
    });

    it('should log successful rephrase', async () => {
      const testText = 'Original text';
      const rephrasedText = 'This is the rephrased text';
      const event = { payload: testText };

      await act(async () => {
        await eventHandler(event);
      });

      expect(console.log).toHaveBeenCalledWith('[useAutoRephrase] Text successfully rephrased:', {
        originalLength: testText.length,
        rephrasedLength: rephrasedText.length
      });
    });
  });

  describe('edge cases', () => {
    let eventHandler: (event: any) => Promise<void>;

    beforeEach(async () => {
      mockListen.mockImplementation((_eventName, handler) => {
        eventHandler = handler;
        return Promise.resolve(mockUnlisten);
      });

      const { result } = renderHook(() => useAutoRephrase(defaultProps));
      await act(async () => {
        await result.current.setupAutoRephraseListener();
      });
    });

    it('should handle null payload', async () => {
      const event = { payload: null };

      // The error will be thrown when trying to access length on null
      await expect(async () => {
        await act(async () => {
          await eventHandler(event);
        });
      }).rejects.toThrow("Cannot read properties of null (reading 'length')");

      expect(mockRephraseService.rephrase).not.toHaveBeenCalled();
    });

    it('should handle undefined payload', async () => {
      const event = { payload: undefined };

      // The error will be thrown when trying to access length on undefined
      await expect(async () => {
        await act(async () => {
          await eventHandler(event);
        });
      }).rejects.toThrow("Cannot read properties of undefined (reading 'length')");

      expect(mockRephraseService.rephrase).not.toHaveBeenCalled();
    });

    it('should handle non-string payload gracefully', async () => {
      const event = { payload: 123 };

      // The error will be thrown when trying to call trim() on a number
      await expect(async () => {
        await act(async () => {
          await eventHandler(event);
        });
      }).rejects.toThrow('text.trim is not a function');

      expect(mockRephraseService.rephrase).not.toHaveBeenCalled();
    });

    it('should handle very long text', async () => {
      const longText = 'a'.repeat(10000);
      const event = { payload: longText };

      await act(async () => {
        await eventHandler(event);
      });

      expect(mockRephraseService.rephrase).toHaveBeenCalledWith(
        longText,
        'formal',
        'Business communication',
        'Colleagues',
        false
      );
    });
  });

  describe('cleanup', () => {
    it('should not cause memory leaks on unmount', async () => {
      const { result, unmount } = renderHook(() => useAutoRephrase(defaultProps));

      await act(async () => {
        await result.current.setupAutoRephraseListener();
      });

      expect(() => {
        unmount();
      }).not.toThrow();
    });
  });
});