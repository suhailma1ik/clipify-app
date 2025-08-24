/**
 * Token exchange service for desktop OAuth flow
 * Handles communication with backend API for authentication
 */
export class TokenExchangeService {
  private config: ApiConfig;

  constructor(config: ApiConfig) {
    this.config = config;
    console.log('[TokenExchangeService] Initialized with config:', config);
  }

  /**
   * Exchange authorization code for JWT token
   * @param authCode - Authorization code from OAuth callback
   * @param state - State parameter for CSRF protection
   * @returns JWT token data
   */
  async exchangeCodeForToken(authCode: string, state: string): Promise<JWTTokenData> {
    console.log('[TokenExchangeService] Exchanging authorization code for JWT token');
    console.log('[TokenExchangeService] Auth code:', authCode.substring(0, 10) + '...');
    console.log('[TokenExchangeService] State:', state.substring(0, 10) + '...');

    try {
      // Get PKCE code verifier if available
      const codeVerifier = oauthService.getCodeVerifier();
      console.log('[TokenExchangeService] Code verifier:', codeVerifier ? codeVerifier.substring(0, 10) + '...' : 'null');
      
      const requestBody: DesktopAuthRequest = {
        authCode,
        state,
        ...(codeVerifier && { codeVerifier })
      };

      console.log('[TokenExchangeService] Making token exchange request to:', `${this.config.baseUrl}/api/v1/auth/desktop/exchange`);
      console.log('[TokenExchangeService] Request body:', {
        ...requestBody,
        authCode: requestBody.authCode.substring(0, 10) + '...',
        ...(requestBody.codeVerifier && { codeVerifier: requestBody.codeVerifier.substring(0, 10) + '...' })
      });

      const response = await fetch(`${this.config.baseUrl}/api/v1/auth/desktop/exchange`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Clipify Desktop/1.0'
        },
        body: JSON.stringify(requestBody),
        connectTimeout: this.config.timeout
      });

      console.log('[TokenExchangeService] Token exchange response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[TokenExchangeService] Token exchange failed:', response.status, errorText);
        
        // Parse error response if possible
        let errorMessage = 'Token exchange failed';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.message || errorMessage;
          console.error('[TokenExchangeService] Parsed error data:', errorData);
        } catch {
          errorMessage = `HTTP ${response.status}: ${errorText || 'Unknown error'}`;
        }
        
        throw new Error(errorMessage);
      }

      const authResponse: DesktopAuthResponse = await response.json();
      console.log('[TokenExchangeService] Token exchange response:', {
        success: authResponse.success,
        token: authResponse.token ? authResponse.token.substring(0, 10) + '...' : null,
        refreshToken: authResponse.refreshToken ? authResponse.refreshToken.substring(0, 10) + '...' : null,
        expiresIn: authResponse.expiresIn,
        user: authResponse.user ? { ...authResponse.user, email: '[REDACTED]' } : null
      });
      
      if (!authResponse.success) {
        console.error('[TokenExchangeService] Authentication failed - invalid response');
        throw new Error('Authentication failed - invalid response');
      }

      console.log('[TokenExchangeService] Token exchange successful');
      
      // Clear PKCE code verifier after successful exchange
      oauthService.clearCodeVerifier();

      // Calculate token expiry timestamp
      const expiresAt = Math.floor(Date.now() / 1000) + authResponse.expiresIn;
      console.log('[TokenExchangeService] Token expires at:', new Date(expiresAt * 1000).toISOString());

      const tokenData: JWTTokenData = {
        token: authResponse.token,
        expiresAt,
        refreshToken: authResponse.refreshToken,
        user: authResponse.user
      };

      console.log('[TokenExchangeService] Returning token data');
      return tokenData;
    } catch (error) {
      console.error('[TokenExchangeService] Token exchange error:', error);
      
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
    console.log('[TokenExchangeService] Refreshing JWT token');
    console.log('[TokenExchangeService] Refresh token:', refreshToken.substring(0, 10) + '...');

    try {
      const requestBody: TokenRefreshRequest = {
        refreshToken
      };

      console.log('[TokenExchangeService] Making token refresh request to:', `${this.config.baseUrl}/api/v1/auth/refresh`);
      
      const response = await fetch(`${this.config.baseUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Clipify Desktop/1.0'
        },
        body: JSON.stringify(requestBody),
        connectTimeout: this.config.timeout
      });

      console.log('[TokenExchangeService] Token refresh response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[TokenExchangeService] Token refresh failed:', response.status, errorText);
        throw new Error(`Token refresh failed: HTTP ${response.status} - ${errorText}`);
      }

      const authResponse: DesktopAuthResponse = await response.json();
      console.log('[TokenExchangeService] Token refresh response:', {
        success: authResponse.success,
        token: authResponse.token ? authResponse.token.substring(0, 10) + '...' : null,
        refreshToken: authResponse.refreshToken ? authResponse.refreshToken.substring(0, 10) + '...' : null,
        expiresIn: authResponse.expiresIn,
        user: authResponse.user ? { ...authResponse.user, email: '[REDACTED]' } : null
      });
      
      if (!authResponse.success) {
        console.error('[TokenExchangeService] Token refresh failed - invalid response');
        throw new Error('Token refresh failed - invalid response');
      }

      console.log('[TokenExchangeService] Token refresh successful');

      // Calculate token expiry timestamp
      const expiresAt = Math.floor(Date.now() / 1000) + authResponse.expiresIn;
      console.log('[TokenExchangeService] New token expires at:', new Date(expiresAt * 1000).toISOString());

      const tokenData: JWTTokenData = {
        token: authResponse.token,
        expiresAt,
        refreshToken: authResponse.refreshToken || refreshToken,
        user: authResponse.user
      };

      console.log('[TokenExchangeService] Returning refreshed token data');
      return tokenData;
    } catch (error) {
      console.error('[TokenExchangeService] Token refresh error:', error);
      
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
    console.log('[TokenExchangeService] Validating token');
    console.log('[TokenExchangeService] Token:', token.substring(0, 10) + '...');

    try {
      const requestBody: TokenValidationRequest = {
        token
      };

      console.log('[TokenExchangeService] Making token validation request to:', `${this.config.baseUrl}/api/v1/auth/validate`);
      
      const response = await fetch(`${this.config.baseUrl}/api/v1/auth/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'Clipify Desktop/1.0'
        },
        body: JSON.stringify(requestBody),
        connectTimeout: this.config.timeout
      });

      console.log('[TokenExchangeService] Token validation response status:', response.status);
      
      const isValid = response.ok;
      console.log('[TokenExchangeService] Token validation result:', isValid);
      
      return isValid;
    } catch (error) {
      console.error('[TokenExchangeService] Token validation error:', error);
      return false;
    }
  }

  /**
   * Get user profile information
   * @param token - JWT token for authentication
   * @returns User profile data
   */
  async getUserProfile(token: string): Promise<{ id: string; email: string; name: string; picture?: string; plan: string } | null> {
    console.log('[TokenExchangeService] Fetching user profile');
    
    try {
      console.log('[TokenExchangeService] Making user profile request to:', `${this.config.baseUrl}/api/v1/users/profile`);
      
      const response = await fetch(`${this.config.baseUrl}/api/v1/users/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'Clipify Desktop/1.0'
        },
        connectTimeout: this.config.timeout
      });

      console.log('[TokenExchangeService] User profile response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[TokenExchangeService] User profile fetch failed:', response.status, errorText);
        return null;
      }

      const userData = await response.json();
      console.log('[TokenExchangeService] User profile response:', { ...userData, email: '[REDACTED]' });
      
      return userData;
    } catch (error) {
      console.error('[TokenExchangeService] User profile fetch error:', error);
      return null;
    }
  }

  /**
   * Test connection to the authentication server
   * @returns True if connection is successful
   */
  async testConnection(): Promise<boolean> {
    console.log('[TokenExchangeService] Testing connection to auth server');
    console.log('[TokenExchangeService] Testing connection to:', `${this.config.baseUrl}/api/v1/health`);
    
    try {
      const response = await fetch(`${this.config.baseUrl}/api/v1/health`, {
        method: 'GET',
        connectTimeout: 5000 // Short timeout for health check
      });
      
      const isConnected = response.ok;
      console.log('[TokenExchangeService] Connection test result:', isConnected);
      return isConnected;
    } catch (error) {
      console.error('[TokenExchangeService] Connection test failed:', error);
      return false;
    }
  }
}