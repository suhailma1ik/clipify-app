import { open } from '@tauri-apps/plugin-shell';
import { getEnvironmentConfig } from './environmentService';
import { OAuthConfig as EnvironmentOAuthConfig } from '../types/environment';

/**
 * OAuth configuration interface
 */
export interface OAuthConfig {
  baseUrl: string;
  clientId: string;
  redirectUri: string;
  scope: string;
}

/**
 * OAuth callback parameters
 */
export interface OAuthCallbackParams {
  code?: string;
  state?: string;
  error?: string;
  error_description?: string;
}

/**
 * OAuth authentication service for desktop application
 * Handles URL generation, state management, and browser-based authentication flow
 */
export class OAuthService {
  private config: OAuthConfig;
  private currentState: string | null = null;
  private stateTimestamp: number | null = null;
  private readonly STATE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

  constructor(config: OAuthConfig) {
    this.config = config;
  }

  /**
   * Generate cryptographically secure random state parameter
   * @returns Base64-encoded random state string
   */
  private generateSecureState(): string {
    // Generate 32 random bytes
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    
    // Convert to base64 and make URL-safe
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Generate PKCE code verifier and challenge
   * @returns Object with code verifier and challenge
   */
  private async generatePKCE(): Promise<{ verifier: string; challenge: string }> {
    // Generate code verifier (43-128 characters)
    const array = new Uint8Array(64);
    crypto.getRandomValues(array);
    const verifier = btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    // Generate code challenge (SHA256 hash of verifier)
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    return { verifier, challenge };
  }

  /**
   * Generate OAuth authorization URL with CSRF protection
   * @param includeSignup - Whether to include signup parameter
   * @returns Authorization URL
   */
  async generateAuthUrl(includeSignup: boolean = false): Promise<string> {
    // Generate new state parameter
    this.currentState = this.generateSecureState();
    this.stateTimestamp = Date.now();

    // Generate PKCE parameters for enhanced security
    const { verifier, challenge } = await this.generatePKCE();
    
    // Store code verifier for later use
    sessionStorage.setItem('oauth_code_verifier', verifier);

    // Build authorization URL
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scope,
      state: this.currentState,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      client_type: 'desktop', // Identify this as a desktop client
      // Add signup hint if requested
      ...(includeSignup && { prompt: 'consent select_account' })
    });

    const authUrl = `${this.config.baseUrl}?${params.toString()}`;
    console.log('Generated OAuth URL:', authUrl);
    
    return authUrl;
  }

  /**
   * Validate state parameter to prevent CSRF attacks
   * @param receivedState - State parameter received from OAuth callback
   * @returns True if state is valid
   */
  validateState(receivedState: string): boolean {
    if (!this.currentState || !this.stateTimestamp) {
      console.error('No state parameter stored for validation');
      return false;
    }

    // Check if state has expired
    const now = Date.now();
    if (now - this.stateTimestamp > this.STATE_EXPIRY_MS) {
      console.error('State parameter has expired');
      this.clearState();
      return false;
    }

    // Check if state matches
    if (receivedState !== this.currentState) {
      console.error('State parameter mismatch');
      this.clearState();
      return false;
    }

    // State is valid, clear it (one-time use)
    this.clearState();
    return true;
  }

  /**
   * Clear stored state parameter
   */
  private clearState(): void {
    this.currentState = null;
    this.stateTimestamp = null;
  }

  /**
   * Launch browser with OAuth URL
   * @param includeSignup - Whether to include signup flow
   */
  async launchOAuthFlow(includeSignup: boolean = false): Promise<void> {
    try {
      const authUrl = await this.generateAuthUrl(includeSignup);
      
      console.log('Launching browser for OAuth authentication...');
      await open(authUrl);
      
      console.log('Browser launched successfully. Waiting for OAuth callback...');
    } catch (error) {
      console.error('Failed to launch OAuth flow:', error);
      throw new Error('Failed to open browser for authentication');
    }
  }

  /**
   * Parse OAuth callback URL and extract parameters
   * @param callbackUrl - The callback URL received from OAuth provider
   * @returns Parsed callback parameters
   */
  parseCallbackUrl(callbackUrl: string): OAuthCallbackParams {
    try {
      const url = new URL(callbackUrl);
      const params: OAuthCallbackParams = {};

      // Extract relevant parameters
      if (url.searchParams.has('code')) {
        params.code = url.searchParams.get('code')!;
      }

      if (url.searchParams.has('state')) {
        params.state = url.searchParams.get('state')!;
      }

      if (url.searchParams.has('error')) {
        params.error = url.searchParams.get('error')!;
      }

      if (url.searchParams.has('error_description')) {
        params.error_description = url.searchParams.get('error_description')!;
      }

      return params;
    } catch (error) {
      console.error('Failed to parse callback URL:', error);
      throw new Error('Invalid OAuth callback URL');
    }
  }

  /**
   * Handle OAuth callback with full validation
   * @param callbackUrl - The callback URL received
   * @returns Authorization code if successful
   */
  handleCallback(callbackUrl: string): string {
    const params = this.parseCallbackUrl(callbackUrl);

    // Check for OAuth errors
    if (params.error) {
      const errorMsg = params.error_description || params.error;
      console.error('OAuth error:', errorMsg);
      throw new Error(`Authentication failed: ${errorMsg}`);
    }

    // Validate state parameter for CSRF protection
    if (!params.state) {
      throw new Error('Missing state parameter in OAuth callback');
    }

    if (!this.validateState(params.state)) {
      throw new Error('Invalid state parameter - possible CSRF attack');
    }

    // Validate authorization code
    if (!params.code) {
      throw new Error('Missing authorization code in OAuth callback');
    }

    console.log('OAuth callback validated successfully');
    return params.code;
  }

  /**
   * Get stored PKCE code verifier
   * @returns Code verifier or null if not found
   */
  getCodeVerifier(): string | null {
    return sessionStorage.getItem('oauth_code_verifier');
  }

  /**
   * Clear stored PKCE code verifier
   */
  clearCodeVerifier(): void {
    sessionStorage.removeItem('oauth_code_verifier');
  }

  /**
   * Update OAuth configuration
   * @param newConfig - New OAuth configuration
   */
  updateConfig(newConfig: Partial<OAuthConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current OAuth configuration
   * @returns Current OAuth configuration
   */
  getConfig(): OAuthConfig {
    return { ...this.config };
  }
}

/**
 * Get OAuth configuration based on current environment
 */
export const getEnvironmentOAuthConfig = (): OAuthConfig => {
  const envConfig = getEnvironmentConfig();
  
  return {
    baseUrl: envConfig.oauth.baseUrl,
    clientId: envConfig.oauth.clientId,
    redirectUri: envConfig.oauth.redirectUri,
    scope: envConfig.oauth.scope
  };
};

/**
 * Default OAuth configuration for Clipify
 * @deprecated Use getEnvironmentOAuthConfig() instead
 */
export const getDefaultOAuthConfig = (): OAuthConfig => ({
  baseUrl: 'https://clipify.space/api/v1/auth/google/login',
  clientId: 'clipify-desktop',
  redirectUri: 'clipify://auth/callback',
  scope: 'openid email profile'
});

/**
 * Development OAuth configuration
 * @deprecated Use getEnvironmentOAuthConfig() instead
 */
export const getDevOAuthConfig = (): OAuthConfig => ({
  baseUrl: 'http://localhost:8080/api/v1/auth/google/login',
  clientId: 'clipify-desktop',
  redirectUri: 'clipify://auth/callback',
  scope: 'openid email profile'
});

// Export singleton instance with environment-based config
export const oauthService = new OAuthService(getEnvironmentOAuthConfig());