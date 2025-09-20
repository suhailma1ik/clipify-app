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
      // Process any deep links that might have arrived before the listener was attached
      await this.processPendingDeepLinks();
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
   * Process any deep link events that may have been received before the frontend listener attached.
   * This avoids race conditions on startup and is especially useful on Windows.
   */
  private async processPendingDeepLinks(): Promise<void> {
    try {
      // Ask backend for any unprocessed deep link events
      const pending: Array<{ id: string; url: string; processed: boolean }>
        = await invoke('get_pending_deep_link_events');

      if (!pending || pending.length === 0) {
        getLoggingService().info('auth', 'No pending deep link events found');
        return;
      }

      getLoggingService().info('auth', 'Processing pending deep link events', { count: pending.length });

      for (const evt of pending) {
        try {
          await this.handleDeepLinkCallback(evt.url);
          // Mark as processed if handler succeeded
          await invoke('mark_deep_link_event_processed', { eventId: evt.id });
        } catch (e) {
          // Mark with error for diagnostics
          const message = e instanceof Error ? e.message : String(e);
          await invoke('mark_deep_link_event_error', { eventId: evt.id, error: message });
        }
      }
    } catch (error) {
      getLoggingService().warn('auth', 'Failed to process pending deep link events', error as Error);
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
        allParams[key] = key === 'auth_code' || key === 'token' || key === 'refresh_token' ? '[REDACTED]' : value;
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

      // Supported formats:
      // - Direct token format from server: clipify://auth/callback?token=...&user_id=...&email=...&name=...&plan=...
      // - Website redirect format: clipify://auth/callback?token=...&refresh_token=...&user={...}
      
      const token = params.get('token');
      const refreshToken = params.get('refresh_token');
      
      if (token) {
        getLoggingService().info('auth', 'Using direct token format');
        // Build base callback data
        const callbackData: AuthCallbackData = {
          access_token: token,
          refresh_token: refreshToken ?? undefined,
          token_type: 'Bearer',
          expires_in: 86400, // 1 day default; server may vary
        };

        // Prefer aggregated user JSON if present
        const userJsonParam = params.get('user');
        if (userJsonParam) {
          try {
            const parsed = JSON.parse(decodeURIComponent(userJsonParam));
            callbackData.user = {
              id: parsed.id,
              email: parsed.email,
              name: parsed.name,
              avatar: parsed.picture,
            };
          } catch (e) {
            getLoggingService().warn('auth', 'Failed to parse user JSON param, falling back to discrete params', e as Error);
          }
        }

        // Fallback to discrete params if needed
        if (!callbackData.user) {
          const userId = params.get('user_id');
          const email = params.get('email');
          const name = params.get('name');
          if (userId && email) {
            callbackData.user = {
              id: userId,
              email: email,
              name: name || email.split('@')[0],
            };
          }
        }

        return callbackData;
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

  // Removed obsolete authorization code exchange flow. Desktop app no longer talks to Google directly.

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
      
      // Open the website login page with redirect back to the desktop app
      const config = getEnvironmentConfig();
      const websiteBase = (config.frontend.baseUrl || '').replace(/\/$/, '');
      const redirectUri = config.oauth.redirectUri; // e.g., clipify://auth/callback
      const loginUrl = `${websiteBase}/login?redirect=${encodeURIComponent(redirectUri)}`;

      getLoggingService().info('auth', 'Starting authentication flow via website login page', { loginUrl });
      await notificationService.info('Authentication', 'Opening website for authentication...');

      // Open browser to website login URL
      await open(loginUrl);

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