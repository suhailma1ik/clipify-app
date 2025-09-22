import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuthErrorHandler } from '../useAuthErrorHandler';
import { getAuthErrorHandler } from '../../services/authErrorHandler';

// Mock the authErrorHandler service
vi.mock('../../services/authErrorHandler', () => ({
  getAuthErrorHandler: vi.fn(),
}));

const mockGetAuthErrorHandler = vi.mocked(getAuthErrorHandler);

describe('useAuthErrorHandler', () => {
  const mockAuthErrorHandler = {
    isAuthError: vi.fn(),
    handleAuthError: vi.fn(),
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthErrorHandler.mockReturnValue(mockAuthErrorHandler);
  });

  describe('initialization', () => {
    it('should initialize with auth error handler', () => {
      const { result } = renderHook(() => useAuthErrorHandler());

      expect(result.current).toHaveProperty('handleError');
      expect(result.current).toHaveProperty('isAuthError');
      expect(typeof result.current.handleError).toBe('function');
      expect(typeof result.current.isAuthError).toBe('function');
      expect(mockGetAuthErrorHandler).toHaveBeenCalledOnce();
    });
  });

  describe('handleError', () => {
    it('should handle auth errors with default context', async () => {
      mockAuthErrorHandler.isAuthError.mockReturnValue(true);
      mockAuthErrorHandler.handleAuthError.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuthErrorHandler());
      const testError = new Error('Auth error');

      await act(async () => {
        await result.current.handleError(testError);
      });

      expect(mockAuthErrorHandler.isAuthError).toHaveBeenCalledWith(testError);
      expect(mockAuthErrorHandler.handleAuthError).toHaveBeenCalledWith(
        testError,
        'React Component'
      );
    });

    it('should handle auth errors with custom context', async () => {
      mockAuthErrorHandler.isAuthError.mockReturnValue(true);
      mockAuthErrorHandler.handleAuthError.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuthErrorHandler());
      const testError = new Error('Auth error');
      const customContext = 'Custom Context';

      await act(async () => {
        await result.current.handleError(testError, customContext);
      });

      expect(mockAuthErrorHandler.isAuthError).toHaveBeenCalledWith(testError);
      expect(mockAuthErrorHandler.handleAuthError).toHaveBeenCalledWith(
        testError,
        customContext
      );
    });

    it('should not handle non-auth errors', async () => {
      mockAuthErrorHandler.isAuthError.mockReturnValue(false);

      const { result } = renderHook(() => useAuthErrorHandler());
      const testError = new Error('Regular error');

      await act(async () => {
        await result.current.handleError(testError);
      });

      expect(mockAuthErrorHandler.isAuthError).toHaveBeenCalledWith(testError);
      expect(mockAuthErrorHandler.handleAuthError).not.toHaveBeenCalled();
    });

    it('should handle multiple errors sequentially', async () => {
      mockAuthErrorHandler.isAuthError.mockReturnValue(true);
      mockAuthErrorHandler.handleAuthError.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuthErrorHandler());
      const error1 = new Error('Auth error 1');
      const error2 = new Error('Auth error 2');

      await act(async () => {
        await result.current.handleError(error1, 'Context 1');
        await result.current.handleError(error2, 'Context 2');
      });

      expect(mockAuthErrorHandler.isAuthError).toHaveBeenCalledTimes(2);
      expect(mockAuthErrorHandler.handleAuthError).toHaveBeenCalledTimes(2);
      expect(mockAuthErrorHandler.handleAuthError).toHaveBeenNthCalledWith(
        1,
        error1,
        'Context 1'
      );
      expect(mockAuthErrorHandler.handleAuthError).toHaveBeenNthCalledWith(
        2,
        error2,
        'Context 2'
      );
    });
  });

  describe('isAuthError', () => {
    it('should return true for auth errors', () => {
      mockAuthErrorHandler.isAuthError.mockReturnValue(true);

      const { result } = renderHook(() => useAuthErrorHandler());
      const testError = new Error('Auth error');

      const isAuth = result.current.isAuthError(testError);

      expect(isAuth).toBe(true);
      expect(mockAuthErrorHandler.isAuthError).toHaveBeenCalledWith(testError);
    });

    it('should return false for non-auth errors', () => {
      mockAuthErrorHandler.isAuthError.mockReturnValue(false);

      const { result } = renderHook(() => useAuthErrorHandler());
      const testError = new Error('Regular error');

      const isAuth = result.current.isAuthError(testError);

      expect(isAuth).toBe(false);
      expect(mockAuthErrorHandler.isAuthError).toHaveBeenCalledWith(testError);
    });
  });

  describe('hook stability', () => {
    it('should maintain stable function references', () => {
      const { result, rerender } = renderHook(() => useAuthErrorHandler());

      const initialHandleError = result.current.handleError;
      const initialIsAuthError = result.current.isAuthError;

      rerender();

      expect(result.current.handleError).toBe(initialHandleError);
      expect(result.current.isAuthError).toBe(initialIsAuthError);
    });

    it('should update when auth error handler changes', () => {
      const { result, rerender } = renderHook(() => useAuthErrorHandler());

      const initialHandleError = result.current.handleError;
      const initialIsAuthError = result.current.isAuthError;

      // Change the mock to return a different handler
      const newMockHandler = {
        isAuthError: vi.fn(),
        handleAuthError: vi.fn(),
      } as any;
      mockGetAuthErrorHandler.mockReturnValue(newMockHandler);

      rerender();

      // Functions should be different since the handler changed
      expect(result.current.handleError).not.toBe(initialHandleError);
      expect(result.current.isAuthError).not.toBe(initialIsAuthError);
    });
  });

  describe('error edge cases', () => {
    it('should handle errors even when handleAuthError throws', async () => {
      mockAuthErrorHandler.isAuthError.mockReturnValue(true);
      mockAuthErrorHandler.handleAuthError.mockRejectedValue(
        new Error('Handler failed')
      );

      const { result } = renderHook(() => useAuthErrorHandler());
      const testError = new Error('Auth error');

      // Should not throw even if the handler fails
      await act(async () => {
        await result.current.handleError(testError);
      });

      expect(mockAuthErrorHandler.isAuthError).toHaveBeenCalledWith(testError);
      expect(mockAuthErrorHandler.handleAuthError).toHaveBeenCalledWith(
        testError,
        'React Component'
      );
    });

    it('should handle null/undefined errors gracefully', async () => {
      mockAuthErrorHandler.isAuthError.mockReturnValue(false);

      const { result } = renderHook(() => useAuthErrorHandler());

      await act(async () => {
        await result.current.handleError(null as any);
        await result.current.handleError(undefined as any);
      });

      expect(mockAuthErrorHandler.isAuthError).toHaveBeenCalledTimes(2);
      expect(mockAuthErrorHandler.handleAuthError).not.toHaveBeenCalled();
    });

    it('should handle empty context strings', async () => {
      mockAuthErrorHandler.isAuthError.mockReturnValue(true);
      mockAuthErrorHandler.handleAuthError.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuthErrorHandler());
      const testError = new Error('Auth error');

      await act(async () => {
        await result.current.handleError(testError, '');
      });

      expect(mockAuthErrorHandler.handleAuthError).toHaveBeenCalledWith(
        testError,
        'React Component'
      );
    });
  });
});