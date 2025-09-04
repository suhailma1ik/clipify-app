/**
 * React hook for handling authentication errors in components
 */

import { useCallback } from 'react';
import { getAuthErrorHandler } from '../services/authErrorHandler';

export const useAuthErrorHandler = () => {
  const authErrorHandler = getAuthErrorHandler();

  const handleError = useCallback(async (error: Error, context?: string) => {
    if (authErrorHandler.isAuthError(error)) {
      await authErrorHandler.handleAuthError(error, context || 'React Component');
    }
  }, [authErrorHandler]);

  const isAuthError = useCallback((error: Error) => {
    return authErrorHandler.isAuthError(error);
  }, [authErrorHandler]);

  return {
    handleError,
    isAuthError
  };
};