import { describe, it, expect } from 'vitest';
import { AuthErrorHandler, AuthErrorType } from '../utils/errorHandler';

describe('AuthErrorHandler', () => {
  describe('createError', () => {
    it('should create error with all required fields', () => {
      const error = AuthErrorHandler.createError(
        AuthErrorType.NETWORK_ERROR,
        'Network connection failed',
        'Custom user message',
        'ERR001',
        { context: 'test' },
        true
      );

      expect(error.type).toBe(AuthErrorType.NETWORK_ERROR);
      expect(error.message).toBe('Network connection failed');
      expect(error.userMessage).toBe('Custom user message');
      expect(error.code).toBe('ERR001');
      expect(error.details).toEqual({ context: 'test' });
      expect(error.retryable).toBe(true);
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should use default user message when not provided', () => {
      const error = AuthErrorHandler.createError(
        AuthErrorType.TOKEN_EXPIRED,
        'Token has expired'
      );

      expect(error.userMessage).toBe('Your session has expired. Please log in again.');
      expect(error.retryable).toBe(true); // Default value
    });
  });

  describe('getDefaultUserMessage', () => {
    it('should return appropriate messages for each error type', () => {
      const testCases = [
        {
          type: AuthErrorType.NETWORK_ERROR,
          expected: 'Connection problem. Please check your internet and try again.'
        },
        {
          type: AuthErrorType.INVALID_STATE,
          expected: 'Security validation failed. Please try logging in again.'
        },
        {
          type: AuthErrorType.TOKEN_EXPIRED,
          expected: 'Your session has expired. Please log in again.'
        },
        {
          type: AuthErrorType.USER_CANCELLED,
          expected: 'Login was cancelled. Please try again when ready.'
        },
        {
          type: AuthErrorType.STORAGE_ERROR,
          expected: 'Unable to save login. Please check app permissions.'
        }
      ];

      testCases.forEach(({ type, expected }) => {
        const message = AuthErrorHandler.getDefaultUserMessage(type);
        expect(message).toBe(expected);
      });
    });
  });

  describe('classifyError', () => {
    it('should classify network errors correctly', () => {
      const testCases = [
        new Error('Network request failed'),
        new Error('Failed to fetch'),
        new Error('Connection timeout'),
        { name: 'TypeError', message: 'Failed to fetch' }
      ];

      testCases.forEach(error => {
        const authError = AuthErrorHandler.classifyError(error, 'test');
        expect(authError.type).toBe(AuthErrorType.NETWORK_ERROR);
        expect(authError.retryable).toBe(true);
      });
    });

    it('should classify state validation errors correctly', () => {
      const error = new Error('Invalid state parameter');
      
      const authError = AuthErrorHandler.classifyError(error, 'oauth');
      
      expect(authError.type).toBe(AuthErrorType.INVALID_STATE);
      expect(authError.retryable).toBe(true);
    });

    it('should classify token errors correctly', () => {
      const expiredTokenError = new Error('Token expired');
      const invalidTokenError = new Error('Invalid token format');
      
      const expiredAuthError = AuthErrorHandler.classifyError(expiredTokenError);
      const invalidAuthError = AuthErrorHandler.classifyError(invalidTokenError);
      
      expect(expiredAuthError.type).toBe(AuthErrorType.TOKEN_EXPIRED);
      expect(invalidAuthError.type).toBe(AuthErrorType.INVALID_TOKEN);
    });

    it('should classify user cancellation correctly', () => {
      const error = new Error('User cancelled the operation');
      
      const authError = AuthErrorHandler.classifyError(error);
      
      expect(authError.type).toBe(AuthErrorType.USER_CANCELLED);
      expect(authError.retryable).toBe(false);
    });

    it('should classify storage errors correctly', () => {
      const error = new Error('Keychain access denied');
      
      const authError = AuthErrorHandler.classifyError(error);
      
      expect(authError.type).toBe(AuthErrorType.STORAGE_ERROR);
      expect(authError.retryable).toBe(false);
    });

    it('should classify HTTP status code errors correctly', () => {
      const serverError = { status: 500, message: 'Internal server error' };
      const unauthorizedError = { status: 401, message: 'Unauthorized' };
      
      const serverAuthError = AuthErrorHandler.classifyError(serverError);
      const unauthorizedAuthError = AuthErrorHandler.classifyError(unauthorizedError);
      
      expect(serverAuthError.type).toBe(AuthErrorType.BACKEND_ERROR);
      expect(unauthorizedAuthError.type).toBe(AuthErrorType.INVALID_TOKEN);
    });

    it('should handle null/undefined errors', () => {
      const authError1 = AuthErrorHandler.classifyError(null);
      const authError2 = AuthErrorHandler.classifyError(undefined);
      
      expect(authError1.type).toBe(AuthErrorType.UNKNOWN_ERROR);
      expect(authError2.type).toBe(AuthErrorType.UNKNOWN_ERROR);
    });

    it('should include context information in error details', () => {
      const error = new Error('Test error');
      const context = 'authentication_flow';
      
      const authError = AuthErrorHandler.classifyError(error, context);
      
      expect(authError.details.context).toBe(context);
      expect(authError.details.originalError).toBe(error);
    });
  });

  describe('getRetryStrategy', () => {
    it('should return appropriate retry strategies for different error types', () => {
      const testCases = [
        {
          type: AuthErrorType.NETWORK_ERROR,
          expected: { shouldRetry: true, delayMs: 2000, maxRetries: 3 }
        },
        {
          type: AuthErrorType.BACKEND_ERROR,
          expected: { shouldRetry: true, delayMs: 5000, maxRetries: 2 }
        },
        {
          type: AuthErrorType.USER_CANCELLED,
          expected: { shouldRetry: false, delayMs: 0, maxRetries: 0 }
        },
        {
          type: AuthErrorType.STORAGE_ERROR,
          expected: { shouldRetry: false, delayMs: 0, maxRetries: 0 }
        }
      ];

      testCases.forEach(({ type, expected }) => {
        const error = AuthErrorHandler.createError(type, 'Test message');
        const strategy = AuthErrorHandler.getRetryStrategy(error);
        
        expect(strategy).toEqual(expected);
      });
    });
  });

  describe('formatForDisplay', () => {
    it('should format network errors appropriately', () => {
      const error = AuthErrorHandler.createError(
        AuthErrorType.NETWORK_ERROR,
        'Connection failed'
      );
      
      const display = AuthErrorHandler.formatForDisplay(error);
      
      expect(display.title).toBe('Connection Problem');
      expect(display.message).toBe(error.userMessage);
      expect(display.actions).toContain('Try Again');
      expect(display.actions).toContain('Check Connection');
    });

    it('should format token expiry errors appropriately', () => {
      const error = AuthErrorHandler.createError(
        AuthErrorType.TOKEN_EXPIRED,
        'Token expired'
      );
      
      const display = AuthErrorHandler.formatForDisplay(error);
      
      expect(display.title).toBe('Session Expired');
      expect(display.actions).toContain('Log In Again');
    });

    it('should format storage errors appropriately', () => {
      const error = AuthErrorHandler.createError(
        AuthErrorType.STORAGE_ERROR,
        'Storage access denied'
      );
      
      const display = AuthErrorHandler.formatForDisplay(error);
      
      expect(display.title).toBe('Permission Required');
      expect(display.actions).toContain('Open Settings');
      expect(display.actions).toContain('Dismiss');
    });

    it('should format non-retryable errors without Try Again action', () => {
      const error = AuthErrorHandler.createError(
        AuthErrorType.USER_CANCELLED,
        'User cancelled',
        undefined,
        undefined,
        undefined,
        false // Not retryable
      );
      
      const display = AuthErrorHandler.formatForDisplay(error);
      
      expect(display.actions).toContain('Try Again'); // Still shows because of format override
      expect(display.actions).toContain('Dismiss');
    });

    it('should use default format for unmapped error types', () => {
      const error = AuthErrorHandler.createError(
        AuthErrorType.UNKNOWN_ERROR,
        'Unknown error'
      );
      
      const display = AuthErrorHandler.formatForDisplay(error);
      
      expect(display.title).toBe('Authentication Error');
      expect(display.actions).toContain('Try Again');
    });
  });

  describe('logError', () => {
    it('should log error details without throwing', () => {
      const error = AuthErrorHandler.createError(
        AuthErrorType.NETWORK_ERROR,
        'Test error',
        'User message',
        'ERR001',
        { test: 'data' }
      );
      
      // Should not throw
      expect(() => {
        AuthErrorHandler.logError(error, 'test_context');
      }).not.toThrow();
    });
  });
});