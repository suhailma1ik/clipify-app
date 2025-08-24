import { fetch } from '@tauri-apps/plugin-http';
import { JWTTokenData } from './tokenStorage';
import { oauthService } from './oauthService';
import { getEnvironmentConfig } from './environmentService';
import { ApiConfig as EnvironmentApiConfig } from '../types/environment';

/**
 * Interface for desktop auth exchange request
 */
export interface DesktopAuthRequest {
  authCode: string;
  state: string;
  codeVerifier?: string;
}

/**
 * Interface for desktop auth exchange response
 */
export interface DesktopAuthResponse {
  success: boolean;
  token: string;
  refreshToken?: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    name: string;
    picture?: string;
    plan: 'free' | 'pro' | 'enterprise';
  };
}

/**
 * Interface for token refresh request
 */
export interface TokenRefreshRequest {
  refreshToken: string;
}

/**
 * Interface for token validation request
 */
export interface TokenValidationRequest {
  token: string;
}

/**
 * Interface for API configuration
 */
export interface ApiConfig {
  baseUrl: string;
  timeout: number;
}

/**
 * Token exchange service for desktop OAuth flow
 * Handles communication with backend API for authentication
 */
export class TokenExchangeService {
  private config: ApiConfig;

  constructor(config: ApiConfig) {
    this.config = config;
  }

  /**
   * Exchange authorization code for JWT token
   * @param authCode - Authorization code from OAuth callback
   * @param state - State parameter for CSRF protection
   * @returns JWT token data
   */
  async exchangeCodeForToken(authCode: string, state: string): Promise<JWTTokenData> {
    console.log('Exchanging authorization code for JWT token...');

    try {
      // Get PKCE code verifier if available
      const codeVerifier = oauthService.getCodeVerifier();
      
      const requestBody: DesktopAuthRequest = {
        authCode,
        state,
        ...(codeVerifier && { codeVerifier })
      };

      console.log('Making token exchange request to:', `${this.config.baseUrl}/api/v1/auth/desktop/exchange`);

      const response = await fetch(`${this.config.baseUrl}/api/v1/auth/desktop/exchange`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Clipify Desktop/1.0'
        },
        body: JSON.stringify(requestBody),
        connectTimeout: this.config.timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Token exchange failed:', response.status, errorText);
        
        // Parse error response if possible
        let errorMessage = 'Token exchange failed';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          errorMessage = `HTTP ${response.status}: ${errorText || 'Unknown error'}`;
        }
        
        throw new Error(errorMessage);
      }

      const authResponse: DesktopAuthResponse = await response.json();
      
      if (!authResponse.success) {
        throw new Error('Authentication failed - invalid response');
      }

      console.log('Token exchange successful');
      
      // Clear PKCE code verifier after successful exchange
      oauthService.clearCodeVerifier();

      // Calculate token expiry timestamp
      const expiresAt = Math.floor(Date.now() / 1000) + authResponse.expiresIn;

      const tokenData: JWTTokenData = {
        token: authResponse.token,
        expiresAt,
        refreshToken: authResponse.refreshToken,
        user: authResponse.user
      };

      return tokenData;
    } catch (error) {
      console.error('Token exchange error:', error);
      
      // Clean up PKCE verifier on error
      oauthService.clearCodeVerifier();
      
      if (error instanceof Error) {
        throw error;
      }
      
      throw new Error('Failed to exchange authorization code for token');
    }
  }

  /**
   * Refresh an expired JWT token
   * @param refreshToken - Refresh token to use
   * @returns New JWT token data
   */
  async refreshToken(refreshToken: string): Promise<JWTTokenData> {
    console.log('Refreshing JWT token...');

    try {
      const requestBody: TokenRefreshRequest = {
        refreshToken
      };

      const response = await fetch(`${this.config.baseUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Clipify Desktop/1.0'
        },
        body: JSON.stringify(requestBody),
        connectTimeout: this.config.timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Token refresh failed:', response.status, errorText);
        throw new Error(`Token refresh failed: HTTP ${response.status}`);
      }

      const authResponse: DesktopAuthResponse = await response.json();
      
      if (!authResponse.success) {
        throw new Error('Token refresh failed - invalid response');
      }

      console.log('Token refresh successful');

      // Calculate token expiry timestamp
      const expiresAt = Math.floor(Date.now() / 1000) + authResponse.expiresIn;

      const tokenData: JWTTokenData = {
        token: authResponse.token,
        expiresAt,
        refreshToken: authResponse.refreshToken || refreshToken,
        user: authResponse.user
      };

      return tokenData;
    } catch (error) {
      console.error('Token refresh error:', error);
      
      if (error instanceof Error) {
        throw error;
      }
      
      throw new Error('Failed to refresh token');
    }
  }

  /**
   * Validate a JWT token with the backend
   * @param token - JWT token to validate
   * @returns True if token is valid
   */
  async validateToken(token: string): Promise<boolean> {
    try {
      console.log('Validating JWT token with backend...');

      const response = await fetch(`${this.config.baseUrl}/api/v1/auth/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'Clipify Desktop/1.0'
        },
        body: JSON.stringify({ token }),
        connectTimeout: this.config.timeout
      });

      if (response.ok) {
        console.log('Token validation successful');
        return true;
      } else {
        console.log('Token validation failed:', response.status);
        return false;
      }
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }

  /**
   * Get user profile information using JWT token
   * @param token - Valid JWT token
   * @returns User profile data
   */
  async getUserProfile(token: string): Promise<JWTTokenData['user']> {
    try {
      console.log('Fetching user profile...');

      const response = await fetch(`${this.config.baseUrl}/api/v1/protected/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'Clipify Desktop/1.0'
        },
        connectTimeout: this.config.timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch user profile: HTTP ${response.status}`);
      }

      const userProfile = await response.json();
      console.log('User profile fetched successfully');
      
      return userProfile;
    } catch (error) {
      console.error('User profile fetch error:', error);
      
      if (error instanceof Error) {
        throw error;
      }
      
      throw new Error('Failed to fetch user profile');
    }
  }

  /**
   * Test API connectivity
   * @returns True if API is reachable
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('Testing API connectivity...');

      const response = await fetch(`${this.config.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'User-Agent': 'Clipify Desktop/1.0'
        },
        connectTimeout: this.config.timeout
      });

      const isConnected = response.ok;
      console.log('API connectivity test result:', isConnected);
      
      return isConnected;
    } catch (error) {
      console.error('API connectivity test failed:', error);
      return false;
    }
  }

  /**
   * Update API configuration
   * @param newConfig - New API configuration
   */
  updateConfig(newConfig: Partial<ApiConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('API configuration updated:', this.config);
  }

  /**
   * Get current API configuration
   * @returns Current API configuration
   */
  getConfig(): ApiConfig {
    return { ...this.config };
  }
}

/**
 * Get API configuration based on current environment
 */
export const getEnvironmentApiConfig = (): ApiConfig => {
  const envConfig = getEnvironmentConfig();
  
  return {
    baseUrl: envConfig.api.baseUrl,
    timeout: envConfig.api.timeout
  };
};

/**
 * Default API configuration for production
 * @deprecated Use getEnvironmentApiConfig() instead
 */
export const getDefaultApiConfig = (): ApiConfig => ({
  baseUrl: 'https://clipify.space',
  timeout: 30000 // 30 seconds
});

/**
 * Development API configuration
 * @deprecated Use getEnvironmentApiConfig() instead
 */
export const getDevApiConfig = (): ApiConfig => ({
  baseUrl: 'http://localhost:8080',
  timeout: 10000 // 10 seconds
});

// Export singleton instance with environment-based config
export const tokenExchangeService = new TokenExchangeService(getEnvironmentApiConfig());