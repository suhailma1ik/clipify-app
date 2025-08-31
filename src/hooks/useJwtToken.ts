import { useState, useEffect, useCallback } from 'react';
import { getApiClient } from '../services/apiClient';

export interface JwtTokenHook {
  jwtToken: string | null;
  showTokenInput: boolean;
  setShowTokenInput: (show: boolean) => void;
  saveJwtToken: (token: string) => void;
  clearJwtToken: () => void;
  hasJwtToken: boolean;
}

const JWT_TOKEN_KEY = 'refine_jwt_token';

export function useJwtToken(): JwtTokenHook {
  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [showTokenInput, setShowTokenInput] = useState<boolean>(false);

  // Load token from localStorage on mount
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem(JWT_TOKEN_KEY);
      if (savedToken) {
        setJwtToken(savedToken);
        // Sync with API client
        try {
          const apiClient = getApiClient();
          apiClient.setJwtToken(savedToken);
          console.log('[useJwtToken] JWT token synced with API client on mount');
        } catch (error) {
          console.error('[useJwtToken] Failed to sync JWT token with API client:', error);
        }
      } else {
        // Show token input if no token is saved
        setShowTokenInput(true);
      }
    } catch (error) {
      console.error('Failed to load JWT token from localStorage:', error);
    }
  }, []);

  const saveJwtToken = useCallback((token: string) => {
    try {
      const trimmedToken = token.trim();
      if (!trimmedToken) {
        throw new Error('Token cannot be empty');
      }

      localStorage.setItem(JWT_TOKEN_KEY, trimmedToken);
      setJwtToken(trimmedToken);
      setShowTokenInput(false);
      
      // Sync with API client
      try {
        const apiClient = getApiClient();
        apiClient.setJwtToken(trimmedToken);
        console.log('[useJwtToken] JWT token saved and synced with API client');
      } catch (error) {
        console.error('[useJwtToken] Failed to sync JWT token with API client:', error);
        throw new Error('Failed to sync token with API client');
      }
      
      console.log('JWT token saved successfully');
    } catch (error) {
      console.error('Failed to save JWT token:', error);
      throw error;
    }
  }, []);

  const clearJwtToken = useCallback(() => {
    try {
      localStorage.removeItem(JWT_TOKEN_KEY);
      setJwtToken(null);
      setShowTokenInput(true);
      
      // Clear from API client
      try {
        const apiClient = getApiClient();
        apiClient.setJwtToken(null);
        console.log('[useJwtToken] JWT token cleared and removed from API client');
      } catch (error) {
        console.error('[useJwtToken] Failed to clear JWT token from API client:', error);
      }
      
      console.log('JWT token cleared successfully');
    } catch (error) {
      console.error('Failed to clear JWT token:', error);
    }
  }, []);

  const hasJwtToken = Boolean(jwtToken);

  return {
    jwtToken,
    showTokenInput,
    setShowTokenInput,
    saveJwtToken,
    clearJwtToken,
    hasJwtToken
  };
}