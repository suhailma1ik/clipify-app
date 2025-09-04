/**
 * React hook for desktop authentication
 * Provides authentication state and methods for React components
 */

import { useState, useEffect, useCallback } from 'react';
import { getAuthService, AuthState, AuthUser } from '../services/authService';

export interface UseAuthReturn {
  // State
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  error: string | null;
  
  // Methods
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  hasValidAccessToken: () => Promise<boolean>;
  
  // Utilities
  clearError: () => void;
}

/**
 * Hook for managing desktop authentication state
 */
export const useAuth = (): UseAuthReturn => {
  const authService = getAuthService();
  const [authState, setAuthState] = useState<AuthState>(authService.getAuthState());

  // Subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = authService.subscribe((newState) => {
      setAuthState(newState);
    });

    return unsubscribe;
  }, [authService]);

  // Login method
  const login = useCallback(async () => {
    await authService.login();
  }, [authService]);

  // Logout method
  const logout = useCallback(async () => {
    await authService.logout();
  }, [authService]);

  // Get access token
  const getAccessToken = useCallback(async () => {
    return await authService.getAccessToken();
  }, [authService]);

  // Check if access token is valid
  const hasValidAccessToken = useCallback(async () => {
    return await authService.hasValidAccessToken();
  }, [authService]);

  // Clear error state
  const clearError = useCallback(() => {
    // This would need to be implemented in the auth service
    // For now, we'll just trigger a state update
    setAuthState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    // State
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    user: authState.user,
    error: authState.error,
    
    // Methods
    login,
    logout,
    getAccessToken,
    hasValidAccessToken,
    
    // Utilities
    clearError,
  };
};

export default useAuth;