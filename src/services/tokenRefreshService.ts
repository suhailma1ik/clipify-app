/**
 * Token Refresh Service
 * Centralized token refresh logic that can be used by different API clients
 */

import { getSecureTokenStorage, TokenInfo } from './secureTokenStorage';
import { getEnvironmentConfig } from './environmentService';
import { fetch } from '@tauri-apps/plugin-http';

export interface TokenRefreshResponse {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  user?: any;
}

export class TokenRefreshService {
  private tokenStorage = getSecureTokenStorage();

  /**
   * Attempt to refresh the access token using refresh token
   * @returns Promise resolving to true if refresh was successful
   */
  async refreshToken(): Promise<boolean> {
    try {
      // Check if we have a refresh token
      const hasRefreshToken = await this.tokenStorage.hasRefreshToken();
      if (!hasRefreshToken) {
        console.warn('[TokenRefreshService] No refresh token available for token refresh');
        return false;
      }

      const refreshToken = await this.tokenStorage.getRefreshToken();
      if (!refreshToken) {
        console.warn('[TokenRefreshService] Refresh token is null');
        return false;
      }

      console.log('[TokenRefreshService] Attempting to refresh access token');

      // Call the refresh endpoint
      const config = getEnvironmentConfig();
      const refreshUrl = `${config.api.baseUrl}/api/v1/auth/refresh`;

      const response = await fetch(refreshUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${refreshToken}`,
        },
        body: JSON.stringify({
          refresh_token: refreshToken,
        }),
      });

      if (!response.ok) {
        console.warn('[TokenRefreshService] Token refresh request failed', { 
          status: response.status, 
          statusText: response.statusText 
        });
        
        // If refresh token is invalid/expired (401/403), clear all tokens
        if (response.status === 401 || response.status === 403) {
          console.warn('[TokenRefreshService] Refresh token is invalid/expired, clearing all tokens');
          await this.tokenStorage.clearAllTokens();
        }
        
        return false;
      }

      const refreshData: TokenRefreshResponse = await response.json();
      
      // Validate the response has required fields
      if (!refreshData.access_token) {
        console.error('[TokenRefreshService] Token refresh response missing access_token');
        return false;
      }

      // Store the new tokens
      const tokenInfo: TokenInfo = {
        accessToken: refreshData.access_token,
        refreshToken: refreshData.refresh_token || refreshToken, // Use new refresh token if provided, otherwise keep existing
        tokenType: refreshData.token_type || 'Bearer',
        scope: refreshData.scope,
        expiresAt: refreshData.expires_in 
          ? Math.floor(Date.now() / 1000) + refreshData.expires_in
          : undefined,
      };

      await this.tokenStorage.storeTokenInfo(tokenInfo);

      // Update user info if provided
      if (refreshData.user) {
        await this.tokenStorage.storeUserInfo(refreshData.user);
      }

      console.log('[TokenRefreshService] Token refresh completed successfully');
      return true;

    } catch (error) {
      console.error('[TokenRefreshService] Token refresh failed with error:', error);
      return false;
    }
  }

  /**
   * Get the current access token after refresh
   * @returns Promise resolving to the current access token
   */
  async getCurrentAccessToken(): Promise<string | null> {
    return await this.tokenStorage.getAccessToken();
  }
}

// Export singleton instance
let tokenRefreshServiceInstance: TokenRefreshService | null = null;

export const getTokenRefreshService = (): TokenRefreshService => {
  if (!tokenRefreshServiceInstance) {
    tokenRefreshServiceInstance = new TokenRefreshService();
  }
  return tokenRefreshServiceInstance;
};