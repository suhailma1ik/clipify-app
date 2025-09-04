/**
 * Tests for AuthErrorHandler
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthErrorHandler, getAuthErrorHandler } from '../authErrorHandler';

// Mock the auth service
const mockLogout = vi.fn();
vi.mock('../authService', () => ({
  getAuthService: () => ({
    logout: mockLogout
  })
}));

// Mock the logging service
const mockWarn = vi.fn();
const mockError = vi.fn();
vi.mock('../loggingService', () => ({
  getLoggingService: () => ({
    warn: mockWarn,
    error: mockError
  })
}));

describe('AuthErrorHandler', () => {
  let authErrorHandler: AuthErrorHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    authErrorHandler = getAuthErrorHandler();
  });

  describe('isAuthError', () => {
    it('should identify authentication errors correctly', () => {
      const authErrors = [
        new Error('AUTHENTICATION_REQUIRED'),
        new Error('Unauthorized request'),
        new Error('Invalid or expired token'),
        new Error('Token refresh failed'),
        new Error('HTTP 401: Unauthorized'),
        new Error('HTTP 403: Forbidden')
      ];

      authErrors.forEach(error => {
        expect(authErrorHandler.isAuthError(error)).toBe(true);
      });
    });

    it('should not identify non-auth errors as auth errors', () => {
      const nonAuthErrors = [
        new Error('Network error'),
        new Error('Server error'),
        new Error('Validation failed'),
        new Error('HTTP 500: Internal Server Error')
      ];

      nonAuthErrors.forEach(error => {
        expect(authErrorHandler.isAuthError(error)).toBe(false);
      });
    });
  });

  describe('handleAuthError', () => {
    it('should trigger logout for authentication errors', async () => {
      const authError = new Error('AUTHENTICATION_REQUIRED');
      
      await authErrorHandler.handleAuthError(authError, 'test-context');
      
      expect(mockLogout).toHaveBeenCalledOnce();
      expect(mockWarn).toHaveBeenCalledWith(
        'auth',
        'Authentication error in test-context',
        authError
      );
    });

    it('should not trigger logout for non-authentication errors', async () => {
      const nonAuthError = new Error('Network error');
      
      await authErrorHandler.handleAuthError(nonAuthError, 'test-context');
      
      expect(mockLogout).not.toHaveBeenCalled();
    });

    it('should handle logout errors gracefully', async () => {
      const authError = new Error('AUTHENTICATION_REQUIRED');
      const logoutError = new Error('Logout failed');
      mockLogout.mockRejectedValueOnce(logoutError);
      
      await authErrorHandler.handleAuthError(authError, 'test-context');
      
      expect(mockLogout).toHaveBeenCalledOnce();
      expect(mockError).toHaveBeenCalledWith(
        'auth',
        'Failed to handle authentication error',
        logoutError
      );
    });
  });

  describe('singleton behavior', () => {
    it('should return the same instance', () => {
      const instance1 = getAuthErrorHandler();
      const instance2 = getAuthErrorHandler();
      
      expect(instance1).toBe(instance2);
    });
  });
});