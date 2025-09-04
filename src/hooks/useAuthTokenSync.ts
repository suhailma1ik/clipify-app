/**
 * Hook to synchronize JWT tokens from auth service to API client
 * This ensures the API client always has the latest JWT token for authenticated requests
 */

import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { getApiClient } from '../services/apiClient';

export const useAuthTokenSync = () => {
  const { isAuthenticated, getAccessToken } = useAuth();

  useEffect(() => {
    const syncToken = async () => {
      try {
        const apiClient = getApiClient();
        
        if (isAuthenticated) {
          // Get the current access token from auth service
          const accessToken = await getAccessToken();
          if (accessToken) {
            // Sync it with the API client
            apiClient.setJwtToken(accessToken);
            console.log('[useAuthTokenSync] JWT token synced with API client');
          } else {
            console.warn('[useAuthTokenSync] No access token available despite being authenticated');
            apiClient.setJwtToken(null);
          }
        } else {
          // Clear token from API client when not authenticated
          apiClient.setJwtToken(null);
          console.log('[useAuthTokenSync] JWT token cleared from API client');
        }
      } catch (error) {
        console.error('[useAuthTokenSync] Failed to sync JWT token:', error);
      }
    };

    syncToken();
  }, [isAuthenticated, getAccessToken]);
};