import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useManualRephrase } from '../useManualRephrase';
import { rephraseService } from '../../services/rephraseService';
import { writeToClipboard, statusMessages, getCurrentTimestamp, resetStatusAfterDelay } from '../../utils';

// Mock all dependencies
vi.mock('../../services/rephraseService');
vi.mock('../../utils');
vi.mock('../useAuthErrorHandler');

const mockRephraseService = vi.mocked(rephraseService);
const mockWriteToClipboard = vi.mocked(writeToClipboard);
const mockStatusMessages = vi.mocked(statusMessages);
const mockGetCurrentTimestamp = vi.mocked(getCurrentTimestamp);
const mockResetStatusAfterDelay = vi.mocked(resetStatusAfterDelay);

// Mock useAuthErrorHandler
const mockHandleError = vi.fn();
const mockIsAuthError = vi.fn();
vi.mocked(require('../useAuthErrorHandler')).useAuthErrorHandler = vi.fn(() => ({
  handleError: mockHandleError,
  isAuthError: mockIsAuthError,
}));

describe('useManualRephrase', () => {
  const mockShowNotification = vi.fn();
  const mockSetShortcutStatus = vi.fn();

  const defaultProps = {
    isAuthenticated: true,
    showNotification: mockShowNotification,
    setShortcutStatus: mockSetShortcutStatus,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockRephraseService.rephrase.mockResolvedValue({
      rephrased_text: 'This is the rephrased text',
    });
    
    mockWriteToClipboard.mockResolvedValue(undefined);
    mockGetCurrentTimestamp.mockReturnValue('12:34:56');
    mockStatusMessages.rephrasingManual = 'Rephrasing manual text...';
    mockStatusMessages.successManual = vi.fn().mockReturnValue('Manual rephrase successful at 12:34:56');
    mockStatusMessages.error = vi.fn().mockReturnValue('Error occurred');
    
    mockHandleError.mockResolvedValue(undefined);
    mockIsAuthError.mockReturnValue(false);

    // Mock console methods to avoid noise in tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useManualRephrase(defaultProps));

      expect(result.current.manualText).toBe('');
      expect(result.current.rephrasedText).toBe('');
      expect(result.current.isRephrasingManual).toBe(false);
      expect(typeof result.current.setManualText).toBe('function');
      expect(typeof result.current.setRephrasedText).toBe('function');
      expect(typeof result.current.handleManualRephrase).toBe('function');
    });
  });

  describe('state management', () => {
    it('should update manual text', () => {
      const { result } = renderHook(() => useManualRephrase(defaultProps));

      act(() => {
        result.current.setManualText('New manual text');
      });

      expect(result.current.manualText).toBe('New manual text');
    });

    it('should update rephrased text', () => {
      const { result } = renderHook(() => useManualRephrase(defaultProps));

      act(() => {
        result.current.setRephrasedText('New rephrased text');
      });

      expect(result.current.rephrasedText).toBe('New rephrased text');
    });
  });

  describe('handleManualRephrase', () => {
    it('should show info notification for empty text', async () => {
      const { result } = renderHook(() => useManualRephrase(defaultProps));

      await act(async () => {
        await result.current.handleManualRephrase();
      });

      expect(mockShowNotification).toHaveBeenCalledWith(
        'Please enter some text to rephrase',
        'info'
      );
    });

    it('should show info notification when not authenticated', async () => {
      const props = { ...defaultProps, isAuthenticated: false };
      const { result } = renderHook(() => useManualRephrase(props));

      act(() => {
        result.current.setManualText('Test text');
      });

      await act(async () => {
        await result.current.handleManualRephrase();
      });

      expect(mockShowNotification).toHaveBeenCalledWith(
        'Please authenticate to use the rephrase feature',
        'info'
      );
    });

    it('should successfully rephrase text', async () => {
      const { result } = renderHook(() => useManualRephrase(defaultProps));

      act(() => {
        result.current.setManualText('Test text');
      });

      await act(async () => {
        await result.current.handleManualRephrase();
      });

      expect(mockRephraseService.rephrase).toHaveBeenCalledWith(
        'Test text',
        'formal',
        'Business communication',
        'Colleagues',
        false
      );
      expect(result.current.rephrasedText).toBe('This is the rephrased text');
      expect(mockWriteToClipboard).toHaveBeenCalledWith('This is the rephrased text');
      expect(mockShowNotification).toHaveBeenCalledWith(
        'Manual rephrase successful at 12:34:56',
        'success'
      );
    });

    it('should handle rephrase service errors', async () => {
      const error = new Error('Service error');
      mockRephraseService.rephrase.mockRejectedValue(error);

      const { result } = renderHook(() => useManualRephrase(defaultProps));

      act(() => {
        result.current.setManualText('Test text');
      });

      await act(async () => {
        await result.current.handleManualRephrase();
      });

      expect(mockShowNotification).toHaveBeenCalledWith('Error occurred', 'error');
      expect(mockHandleError).toHaveBeenCalledWith(error, 'Manual Rephrase');
    });
  });

  describe('callback stability', () => {
    it('should maintain stable callback references when dependencies do not change', () => {
      const { result, rerender } = renderHook(() => useManualRephrase(defaultProps));

      const initialHandleManualRephrase = result.current.handleManualRephrase;

      rerender();

      expect(result.current.handleManualRephrase).toBe(initialHandleManualRephrase);
    });

    it('should create new callbacks when dependencies change', () => {
      const { result, rerender } = renderHook(
        (props) => useManualRephrase(props),
        { initialProps: defaultProps }
      );

      const initialHandleManualRephrase = result.current.handleManualRephrase;

      const newProps = {
        ...defaultProps,
        showNotification: vi.fn(),
      };

      rerender(newProps);

      expect(result.current.handleManualRephrase).not.toBe(initialHandleManualRephrase);
    });
  });

  describe('edge cases', () => {
    it('should handle whitespace-only text', async () => {
      const { result } = renderHook(() => useManualRephrase(defaultProps));

      act(() => {
        result.current.setManualText('   ');
      });

      await act(async () => {
        await result.current.handleManualRephrase();
      });

      expect(mockShowNotification).toHaveBeenCalledWith(
        'Please enter some text to rephrase',
        'info'
      );
      expect(mockRephraseService.rephrase).not.toHaveBeenCalled();
    });

    it('should handle clipboard write errors gracefully', async () => {
      mockWriteToClipboard.mockRejectedValue(new Error('Clipboard error'));

      const { result } = renderHook(() => useManualRephrase(defaultProps));

      act(() => {
        result.current.setManualText('Test text');
      });

      await act(async () => {
        await result.current.handleManualRephrase();
      });

      // Should still show success notification even if clipboard fails
      expect(mockShowNotification).toHaveBeenCalledWith(
        'Manual rephrase successful at 12:34:56',
        'success'
      );
    });

    it('should handle concurrent rephrase calls', async () => {
      const { result } = renderHook(() => useManualRephrase(defaultProps));

      act(() => {
        result.current.setManualText('Test text');
      });

      // Start multiple concurrent calls
      const promises = [
        result.current.handleManualRephrase(),
        result.current.handleManualRephrase(),
        result.current.handleManualRephrase(),
      ];

      await act(async () => {
        await Promise.all(promises);
      });

      // Should handle all calls without errors
      expect(mockRephraseService.rephrase).toHaveBeenCalledTimes(3);
    });
  });

  describe('cleanup', () => {
    it('should not cause memory leaks on unmount', () => {
      const { unmount } = renderHook(() => useManualRephrase(defaultProps));

      expect(() => unmount()).not.toThrow();
    });
  });

  describe('integration with dependencies', () => {
    it('should use correct parameters for rephrase service', async () => {
      const { result } = renderHook(() => useManualRephrase(defaultProps));

      act(() => {
        result.current.setManualText('Test text');
      });

      await act(async () => {
        await result.current.handleManualRephrase();
      });

      expect(mockRephraseService.rephrase).toHaveBeenCalledWith(
        'Test text',
        'formal',
        'Business communication',
        'Colleagues',
        false
      );
    });

    it('should call utility functions with correct parameters', async () => {
      const { result } = renderHook(() => useManualRephrase(defaultProps));

      act(() => {
        result.current.setManualText('Test text');
      });

      await act(async () => {
        await result.current.handleManualRephrase();
      });

      expect(mockGetCurrentTimestamp).toHaveBeenCalledTimes(1);
      expect(mockWriteToClipboard).toHaveBeenCalledWith('This is the rephrased text');
      expect(mockStatusMessages.successManual).toHaveBeenCalledWith('12:34:56');
      expect(mockResetStatusAfterDelay).toHaveBeenCalledWith(mockSetShortcutStatus, 3000);
    });
  });
});