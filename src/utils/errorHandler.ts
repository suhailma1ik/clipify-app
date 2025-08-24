/**
 * Enumeration of error types for better categorization
 */
export enum AuthErrorType {
  NETWORK_ERROR = 'network_error',
  INVALID_STATE = 'invalid_state',
  EXPIRED_CODE = 'expired_code',
  USER_CANCELLED = 'user_cancelled',
  STORAGE_ERROR = 'storage_error',
  TOKEN_EXPIRED = 'token_expired',
  INVALID_TOKEN = 'invalid_token',
  BACKEND_ERROR = 'backend_error',
  DEEP_LINK_ERROR = 'deep_link_error',
  OAUTH_ERROR = 'oauth_error',
  UNKNOWN_ERROR = 'unknown_error'
}

/**
 * Interface for structured error information
 */
export interface AuthError {
  type: AuthErrorType;
  message: string;
  userMessage: string;
  code?: string;
  details?: any;
  timestamp: Date;
  retryable: boolean;
}

/**
 * Error handling utility class for authentication flows
 */
export class AuthErrorHandler {
  /**
   * Create a standardized auth error
   */
  static createError(
    type: AuthErrorType,
    message: string,
    userMessage?: string,
    code?: string,
    details?: any,
    retryable: boolean = true
  ): AuthError {
    return {
      type,
      message,
      userMessage: userMessage || AuthErrorHandler.getDefaultUserMessage(type),
      code,
      details,
      timestamp: new Date(),
      retryable
    };
  }

  /**
   * Get user-friendly error message based on error type
   */
  static getDefaultUserMessage(type: AuthErrorType): string {
    const messages: Record<AuthErrorType, string> = {
      [AuthErrorType.NETWORK_ERROR]: "Connection problem. Please check your internet and try again.",
      [AuthErrorType.INVALID_STATE]: "Security validation failed. Please try logging in again.",
      [AuthErrorType.EXPIRED_CODE]: "Login session expired. Please try again.",
      [AuthErrorType.USER_CANCELLED]: "Login was cancelled. Please try again when ready.",
      [AuthErrorType.STORAGE_ERROR]: "Unable to save login. Please check app permissions.",
      [AuthErrorType.TOKEN_EXPIRED]: "Your session has expired. Please log in again.",
      [AuthErrorType.INVALID_TOKEN]: "Authentication failed. Please log in again.",
      [AuthErrorType.BACKEND_ERROR]: "Server error. Please try again later.",
      [AuthErrorType.DEEP_LINK_ERROR]: "Failed to process login callback. Please try again.",
      [AuthErrorType.OAUTH_ERROR]: "Authentication service error. Please try again.",
      [AuthErrorType.UNKNOWN_ERROR]: "An unexpected error occurred. Please try again."
    };

    return messages[type] || messages[AuthErrorType.UNKNOWN_ERROR];
  }

  /**
   * Classify an error into appropriate type and create AuthError
   */
  static classifyError(error: any, context?: string): AuthError {
    console.error(`Authentication error in ${context || 'unknown context'}:`, error);

    if (!error) {
      return AuthErrorHandler.createError(
        AuthErrorType.UNKNOWN_ERROR,
        'Unknown error occurred',
        undefined,
        undefined,
        { context },
        true
      );
    }

    const errorMessage = error.message || error.toString() || 'Unknown error';
    const lowerMessage = errorMessage.toLowerCase();

    // Network-related errors
    if (lowerMessage.includes('network') || 
        lowerMessage.includes('fetch') ||
        lowerMessage.includes('connection') ||
        lowerMessage.includes('timeout') ||
        error.name === 'TypeError' && lowerMessage.includes('failed to fetch')) {
      return AuthErrorHandler.createError(
        AuthErrorType.NETWORK_ERROR,
        errorMessage,
        undefined,
        error.code,
        { originalError: error, context },
        true
      );
    }

    // State validation errors
    if (lowerMessage.includes('state') && 
        (lowerMessage.includes('invalid') || lowerMessage.includes('mismatch'))) {
      return AuthErrorHandler.createError(
        AuthErrorType.INVALID_STATE,
        errorMessage,
        undefined,
        error.code,
        { originalError: error, context },
        true
      );
    }

    // Token-related errors
    if (lowerMessage.includes('token')) {
      if (lowerMessage.includes('expired')) {
        return AuthErrorHandler.createError(
          AuthErrorType.TOKEN_EXPIRED,
          errorMessage,
          undefined,
          error.code,
          { originalError: error, context },
          true
        );
      }
      if (lowerMessage.includes('invalid')) {
        return AuthErrorHandler.createError(
          AuthErrorType.INVALID_TOKEN,
          errorMessage,
          undefined,
          error.code,
          { originalError: error, context },
          true
        );
      }
    }

    // Code expiry errors
    if (lowerMessage.includes('code') && lowerMessage.includes('expired')) {
      return AuthErrorHandler.createError(
        AuthErrorType.EXPIRED_CODE,
        errorMessage,
        undefined,
        error.code,
        { originalError: error, context },
        true
      );
    }

    // User cancellation
    if (lowerMessage.includes('cancel') || lowerMessage.includes('abort')) {
      return AuthErrorHandler.createError(
        AuthErrorType.USER_CANCELLED,
        errorMessage,
        undefined,
        error.code,
        { originalError: error, context },
        false
      );
    }

    // Storage errors
    if (lowerMessage.includes('storage') || 
        lowerMessage.includes('keychain') ||
        lowerMessage.includes('permission')) {
      return AuthErrorHandler.createError(
        AuthErrorType.STORAGE_ERROR,
        errorMessage,
        undefined,
        error.code,
        { originalError: error, context },
        false
      );
    }

    // Deep link errors
    if (lowerMessage.includes('deep') && lowerMessage.includes('link')) {
      return AuthErrorHandler.createError(
        AuthErrorType.DEEP_LINK_ERROR,
        errorMessage,
        undefined,
        error.code,
        { originalError: error, context },
        true
      );
    }

    // OAuth specific errors
    if (lowerMessage.includes('oauth') || 
        lowerMessage.includes('authorization') ||
        lowerMessage.includes('consent')) {
      return AuthErrorHandler.createError(
        AuthErrorType.OAUTH_ERROR,
        errorMessage,
        undefined,
        error.code,
        { originalError: error, context },
        true
      );
    }

    // HTTP status code based classification
    if (error.status) {
      const status = error.status;
      if (status >= 500) {
        return AuthErrorHandler.createError(
          AuthErrorType.BACKEND_ERROR,
          errorMessage,
          "Server error. Please try again later.",
          error.code,
          { originalError: error, context, status },
          true
        );
      }
      if (status === 401 || status === 403) {
        return AuthErrorHandler.createError(
          AuthErrorType.INVALID_TOKEN,
          errorMessage,
          "Authentication failed. Please log in again.",
          error.code,
          { originalError: error, context, status },
          true
        );
      }
    }

    // Default classification
    return AuthErrorHandler.createError(
      AuthErrorType.UNKNOWN_ERROR,
      errorMessage,
      undefined,
      error.code,
      { originalError: error, context },
      true
    );
  }

  /**
   * Determine retry strategy based on error type
   */
  static getRetryStrategy(error: AuthError): {
    shouldRetry: boolean;
    delayMs: number;
    maxRetries: number;
  } {
    const strategies: Record<AuthErrorType, { shouldRetry: boolean; delayMs: number; maxRetries: number }> = {
      [AuthErrorType.NETWORK_ERROR]: { shouldRetry: true, delayMs: 2000, maxRetries: 3 },
      [AuthErrorType.BACKEND_ERROR]: { shouldRetry: true, delayMs: 5000, maxRetries: 2 },
      [AuthErrorType.OAUTH_ERROR]: { shouldRetry: true, delayMs: 1000, maxRetries: 2 },
      [AuthErrorType.DEEP_LINK_ERROR]: { shouldRetry: true, delayMs: 1000, maxRetries: 1 },
      [AuthErrorType.TOKEN_EXPIRED]: { shouldRetry: true, delayMs: 0, maxRetries: 1 },
      [AuthErrorType.EXPIRED_CODE]: { shouldRetry: true, delayMs: 0, maxRetries: 1 },
      [AuthErrorType.INVALID_STATE]: { shouldRetry: true, delayMs: 0, maxRetries: 1 },
      [AuthErrorType.INVALID_TOKEN]: { shouldRetry: true, delayMs: 0, maxRetries: 1 },
      [AuthErrorType.USER_CANCELLED]: { shouldRetry: false, delayMs: 0, maxRetries: 0 },
      [AuthErrorType.STORAGE_ERROR]: { shouldRetry: false, delayMs: 0, maxRetries: 0 },
      [AuthErrorType.UNKNOWN_ERROR]: { shouldRetry: true, delayMs: 1000, maxRetries: 1 }
    };

    return strategies[error.type] || strategies[AuthErrorType.UNKNOWN_ERROR];
  }

  /**
   * Log error details for debugging
   */
  static logError(error: AuthError, context?: string): void {
    const logContext = context || 'AuthErrorHandler';
    
    console.group(`🚨 ${logContext} - ${error.type}`);
    console.error('Message:', error.message);
    console.error('User Message:', error.userMessage);
    console.error('Timestamp:', error.timestamp.toISOString());
    console.error('Retryable:', error.retryable);
    
    if (error.code) {
      console.error('Code:', error.code);
    }
    
    if (error.details) {
      console.error('Details:', error.details);
    }
    
    console.groupEnd();
  }

  /**
   * Format error for display to users
   */
  static formatForDisplay(error: AuthError): {
    title: string;
    message: string;
    actions: string[];
  } {
    const baseActions = error.retryable ? ['Try Again'] : ['Dismiss'];
    
    const formats: Record<AuthErrorType, { title: string; actions: string[] }> = {
      [AuthErrorType.NETWORK_ERROR]: {
        title: 'Connection Problem',
        actions: ['Try Again', 'Check Connection']
      },
      [AuthErrorType.TOKEN_EXPIRED]: {
        title: 'Session Expired',
        actions: ['Log In Again']
      },
      [AuthErrorType.STORAGE_ERROR]: {
        title: 'Permission Required',
        actions: ['Open Settings', 'Dismiss']
      },
      [AuthErrorType.USER_CANCELLED]: {
        title: 'Login Cancelled',
        actions: ['Try Again', 'Dismiss']
      },
      [AuthErrorType.BACKEND_ERROR]: {
        title: 'Server Error',
        actions: ['Try Again', 'Report Issue']
      },
      [AuthErrorType.INVALID_STATE]: {
        title: 'Security Error',
        actions: ['Try Again']
      },
      [AuthErrorType.EXPIRED_CODE]: {
        title: 'Session Expired',
        actions: ['Try Again']
      },
      [AuthErrorType.INVALID_TOKEN]: {
        title: 'Invalid Token',
        actions: ['Log In Again']
      },
      [AuthErrorType.DEEP_LINK_ERROR]: {
        title: 'Link Error',
        actions: ['Try Again']
      },
      [AuthErrorType.OAUTH_ERROR]: {
        title: 'Authentication Error',
        actions: ['Try Again']
      },
      [AuthErrorType.UNKNOWN_ERROR]: {
        title: 'Unknown Error',
        actions: ['Dismiss']
      }
    };

    const format = formats[error.type] || {
      title: 'Authentication Error',
      actions: baseActions
    };

    return {
      title: format.title,
      message: error.userMessage,
      actions: format.actions
    };
  }
}

/**
 * Hook for using error handling in React components
 */
export const useAuthErrorHandler = () => {
  const handleError = (error: any, context?: string): AuthError => {
    const authError = AuthErrorHandler.classifyError(error, context);
    AuthErrorHandler.logError(authError, context);
    return authError;
  };

  const formatError = (error: AuthError) => {
    return AuthErrorHandler.formatForDisplay(error);
  };

  const getRetryStrategy = (error: AuthError) => {
    return AuthErrorHandler.getRetryStrategy(error);
  };

  return {
    handleError,
    formatError,
    getRetryStrategy,
    AuthErrorType
  };
};