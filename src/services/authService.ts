/**
 * Desktop Authentication Service
 * Handles the complete authentication flow for the desktop app
 */

import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-shell';
import { getSecureTokenStorage, TokenInfo } from './secureTokenStorage';
import { notificationService } from './notificationService';
import { getLoggingService } from './loggingService';
import { getEnvironmentConfig } from './environmentService';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  error: string | null;
}

export interface AuthCallbackData {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  user?: AuthUser;
}

class AuthService {
  private tokenStorage = getSecureTokenStorage();
  private authState: AuthState = {
    isAuthenticated: false,
    isLoading: false,
    user: null,
    error: null,
  };
  private listeners: Array<(state: AuthState) => void> = [];
  private deepLinkListener: (() => void) | null = null;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize the auth service
   */
  private async initialize(): Promise<void> {
    try {
      await this.tokenStorage.initialize();
      await this.checkExistingAuth();
      await this.setupDeepLinkListener();
    } catch (error) {
      getLoggingService().error('auth', 'Failed to initialize auth service', error as Error);
      this.updateAuthState({ error: 'Failed to initialize authentication' });
    }
  }

  /**
   * Check for existing authentication on startup
   */
  private async checkExistingAuth(): Promise<void> {
    try {
      const hasValidToken = await this.tokenStorage.hasValidAccessToken();
      if (hasValidToken) {
        const userInfo = await this.tokenStorage.getUserInfo();
        this.updateAuthState({
          isAuthenticated: true,
          user: userInfo as AuthUser | null,
          error: null,
        });
        getLoggingService().info('auth', 'Existing authentication found');
      }
    } catch (error) {
      getLoggingService().error('auth', 'Failed to check existing auth', error as Error);
    }
  }

  /**
   * Setup deep link listener for auth callbacks
   */
  private async setupDeepLinkListener(): Promise<void> {
    try {
      // Import Tauri event listener
      const { listen } = await import('@tauri-apps/api/event');
      
      // Listen for deep link events from Tauri
      this.deepLinkListener = await listen('deep-link-received', (event) => {
        const url = event.payload as string;
        getLoggingService().info('auth', 'Received deep link event', { url });
        this.handleDeepLinkCallback(url);
      });
      
      getLoggingService().info('auth', 'Deep link listener registered');
    } catch (error) {
      getLoggingService().error('auth', 'Failed to setup deep link listener', error as Error);
    }
  }

  /**
   * Handle deep link callback from browser
   */
  private async handleDeepLinkCallback(url: string): Promise<void> {
    try {
      getLoggingService().info('auth', 'Received deep link callback', { url });
      
      // Parse the callback URL (this may involve async token exchange)
      // This will now throw an error instead of returning null if parsing fails
      const callbackData = await this.parseAuthCallback(url);

      getLoggingService().info('auth', 'Successfully parsed callback data', { 
        hasAccessToken: !!callbackData.access_token,
        hasUser: !!callbackData.user,
        tokenType: callbackData.token_type 
      });

      // Store the tokens
      await this.storeAuthTokens(callbackData);
      getLoggingService().info('auth', 'Successfully stored authentication tokens');

      // Update auth state
      this.updateAuthState({
        isAuthenticated: true,
        isLoading: false,
        user: callbackData.user || null,
        error: null,
      });

      // Show success notification
      await notificationService.success('Authentication Success', 'Authentication successful!');
      getLoggingService().info('auth', 'Authentication completed successfully');
      
      // Show the main window after successful authentication
      try {
        await invoke('show_main_window');
      } catch (windowError) {
        getLoggingService().warn('auth', 'Failed to show main window after auth', windowError as Error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown authentication error';
      getLoggingService().error('auth', 'Failed to handle auth callback', error as Error, { url });
      
      this.updateAuthState({
        isLoading: false,
        error: `Authentication failed: ${errorMessage}`,
      });
      
      await notificationService.error('Authentication Failed', `Authentication failed: ${errorMessage}`);
    }
  }

  /**
   * Parse authentication callback URL
   */
  private async parseAuthCallback(url: string): Promise<AuthCallbackData> {
    try {
      getLoggingService().info('auth', 'Parsing auth callback URL', { url });
      
      const urlObj = new URL(url);
      const params = new URLSearchParams(urlObj.search);
      
      // Log all URL parameters for debugging
      const allParams: Record<string, string> = {};
      params.forEach((value, key) => {
        allParams[key] = key === 'auth_code' || key === 'token' ? '[REDACTED]' : value;
      });
      getLoggingService().info('auth', 'URL parameters found', { 
        scheme: urlObj.protocol.replace(':', ''),
        pathname: urlObj.pathname,
        params: allParams 
      });
      
      // Check for error in callback
      const error = params.get('error');
      if (error) {
        const errorDescription = params.get('error_description') || 'No description provided';
        throw new Error(`Auth error: ${error} - ${errorDescription}`);
      }

      // Handle both formats:
      // 1. Direct token format: clipify://auth/callback?token=...&user_id=...&email=...
      // 2. Auth code format: clipify://auth/callback?auth_code=...&state=...
      
      const token = params.get('token');
      const authCode = params.get('auth_code');
      
      if (token) {
        getLoggingService().info('auth', 'Using direct token format');
        // Direct token format
        const userId = params.get('user_id');
        const email = params.get('email');
        
        const callbackData: AuthCallbackData = {
          access_token: token,
          token_type: 'Bearer',
          expires_in: 3600, // 1 hour as set by server
        };

        // Create user object from URL parameters
        if (userId && email) {
          callbackData.user = {
            id: userId,
            email: email,
            name: email.split('@')[0], // Use email prefix as fallback name
          };
        }

        return callbackData;
      } else if (authCode) {
        getLoggingService().info('auth', 'Using auth code format, will exchange for token');
        // Auth code format - need to exchange for token
        return await this.exchangeAuthCodeForToken(authCode, params.get('state'));
      } else {
        throw new Error('No access token or auth code found in callback URL');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown parsing error';
      getLoggingService().error('auth', 'Failed to parse auth callback', error as Error, { url, errorMessage });
      
      // Instead of returning null, let's throw the error so we get better debugging info
      throw new Error(`Callback parsing failed: ${errorMessage}`);
    }
  }

  /**
   * Exchange authorization code for access token
   */
  private async exchangeAuthCodeForToken(authCode: string, state: string | null): Promise<AuthCallbackData> {
    try {
      const config = getEnvironmentConfig();
      const tokenEndpoint = `${config.api.baseUrl}/api/v1/auth/token`;
      
      const requestBody = {
        code: authCode,
        client_id: config.oauth.clientId,
        grant_type: 'authorization_code',
        redirect_uri: config.oauth.redirectUri,
        state: state,
      };
      
      getLoggingService().info('auth', 'Exchanging auth code for token', { 
        tokenEndpoint, 
        clientId: config.oauth.clientId,
        redirectUri: config.oauth.redirectUri,
        hasAuthCode: !!authCode,
        hasState: !!state 
      });
      
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const errorMessage = `Token exchange failed: ${response.status} ${response.statusText} - ${errorText}`;
        getLoggingService().error('auth', errorMessage, new Error(errorMessage), { 
          status: response.status,
          statusText: response.statusText,
          errorText,
          requestBody 
        });
        throw new Error(errorMessage);
      }

      const tokenData = await response.json();
      
      getLoggingService().info('auth', 'Successfully exchanged auth code for token', {
        hasAccessToken: !!tokenData.access_token,
        hasRefreshToken: !!tokenData.refresh_token,
        tokenType: tokenData.token_type,
        expiresIn: tokenData.expires_in
      });
      
      return {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_type: tokenData.token_type || 'Bearer',
        expires_in: tokenData.expires_in,
        scope: tokenData.scope,
        user: tokenData.user,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown token exchange error';
      getLoggingService().error('auth', 'Failed to exchange auth code for token', error as Error, { authCode, state, errorMessage });
      
      // Throw the error instead of returning null for better error propagation
      throw new Error(`Token exchange failed: ${errorMessage}`);
    }
  }

  /**
   * Store authentication tokens
   */
  private async storeAuthTokens(callbackData: AuthCallbackData): Promise<void> {
    const tokenInfo: TokenInfo = {
      accessToken: callbackData.access_token,
      refreshToken: callbackData.refresh_token,
      tokenType: callbackData.token_type || 'Bearer',
      scope: callbackData.scope,
      expiresAt: callbackData.expires_in 
        ? Math.floor(Date.now() / 1000) + callbackData.expires_in
        : undefined,
    };

    await this.tokenStorage.storeTokenInfo(tokenInfo);

    if (callbackData.user) {
      await this.tokenStorage.storeUserInfo(callbackData.user);
    }
  }

  /**
   * Start the authentication flow
   */
  public async login(): Promise<void> {
    try {
      this.updateAuthState({ isLoading: true, error: null });
      
      // Get the API endpoint
      const config = getEnvironmentConfig();
      // Ensure we hit the Go server route mounted under /api/v1
      const authUrl = `${config.api.baseUrl}/api/v1/auth/desktop-login`;
      
      getLoggingService().info('auth', 'Starting authentication flow', { authUrl });
      await notificationService.info('Authentication', 'Opening browser for authentication...');
      
      // Open browser to auth URL
      await open(authUrl);
      
      getLoggingService().info('auth', 'Browser opened for authentication');
    } catch (error) {
      getLoggingService().error('auth', 'Failed to start authentication', error as Error);
      this.updateAuthState({
        isLoading: false,
        error: 'Failed to open browser for authentication',
      });
      await notificationService.error('Authentication Error', 'Failed to open browser for authentication');
    }
  }

  /**
   * Logout the user
   */
  public async logout(): Promise<void> {
    try {
      this.updateAuthState({ isLoading: true, error: null });
      
      // Try to call logout endpoint if we have a valid token
      const hasValidToken = await this.tokenStorage.hasValidAccessToken();
      if (hasValidToken) {
        try {
          const config = getEnvironmentConfig();
          // Server route is mounted under /api/v1/auth/logout
          const logoutUrl = `${config.api.baseUrl}/api/v1/auth/logout`;
          
          const accessToken = await this.tokenStorage.getAccessToken();
          await fetch(logoutUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          });
          
          getLoggingService().info('auth', 'Logout API call successful');
        } catch (error) {
          getLoggingService().warn('auth', 'Logout API call failed, continuing with local logout');
        }
      }

      // Clear stored tokens
      await this.tokenStorage.clearAllTokens();
      
      // Update auth state
      this.updateAuthState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
      });

      await notificationService.success('Logout', 'Logged out successfully');
      getLoggingService().info('auth', 'Logout completed successfully');
    } catch (error) {
      getLoggingService().error('auth', 'Failed to logout', error as Error);
      this.updateAuthState({
        isLoading: false,
        error: 'Failed to logout completely',
      });
      await notificationService.error('Logout Error', 'Failed to logout completely');
    }
  }

  /**
   * Get current authentication state
   */
  public getAuthState(): AuthState {
    return { ...this.authState };
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    return this.authState.isAuthenticated;
  }

  /**
   * Get current user
   */
  public getCurrentUser(): AuthUser | null {
    return this.authState.user;
  }

  /**
   * Get access token
   */
  public async getAccessToken(): Promise<string | null> {
    return await this.tokenStorage.getAccessToken();
  }

  /**
   * Check if access token is valid
   */
  public async hasValidAccessToken(): Promise<boolean> {
    return await this.tokenStorage.hasValidAccessToken();
  }

  /**
   * Subscribe to auth state changes
   */
  public subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Update auth state and notify listeners
   */
  private updateAuthState(updates: Partial<AuthState>): void {
    this.authState = { ...this.authState, ...updates };
    this.listeners.forEach(listener => {
      try {
        listener(this.getAuthState());
      } catch (error) {
        getLoggingService().error('auth', 'Error in auth state listener', error as Error);
      }
    });
  }

  /**
   * Cleanup resources
   */
  public async cleanup(): Promise<void> {
    try {
      if (this.deepLinkListener) {
        this.deepLinkListener();
        this.deepLinkListener = null;
      }
      this.listeners = [];
      getLoggingService().info('auth', 'Auth service cleanup completed');
    } catch (error) {
      getLoggingService().error('auth', 'Failed to cleanup auth service', error as Error);
    }
  }
}

// Export singleton instance
let authServiceInstance: AuthService | null = null;

export const getAuthService = (): AuthService => {
  if (!authServiceInstance) {
    authServiceInstance = new AuthService();
  }
  return authServiceInstance;
};

export { AuthService };