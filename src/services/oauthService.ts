import { OAuthConfig } from '../types/environment';
import { open } from '@tauri-apps/plugin-shell';

/**
 * OAuth callback parameters interface
 */
interface OAuthCallbackParams {
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
    console.log('[OAuthService] Initialized with config:', config);
  }

  /**
   * Generate cryptographically secure random state parameter
   * @returns Base64-encoded random state string
   */
  private generateSecureState(): string {
    console.log('[OAuthService] Generating secure state parameter');
    // Generate 32 random bytes
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    
    // Convert to base64 and make URL-safe
    const state = btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    console.log('[OAuthService] Generated state parameter:', state.substring(0, 10) + '...');
    return state;
  }

  /**
   * Generate PKCE code verifier and challenge
   * @returns Object with code verifier and challenge
   */
  private async generatePKCE(): Promise<{ verifier: string; challenge: string }> {
    console.log('[OAuthService] Generating PKCE parameters');
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

    console.log('[OAuthService] Generated PKCE verifier:', verifier.substring(0, 10) + '...');
    console.log('[OAuthService] Generated PKCE challenge:', challenge.substring(0, 10) + '...');
    return { verifier, challenge };
  }

  /**
   * Generate OAuth authorization URL with CSRF protection
   * @param includeSignup - Whether to include signup parameter
   * @returns Authorization URL
   */
  async generateAuthUrl(includeSignup: boolean = false): Promise<string> {
    console.log('[OAuthService] Generating authorization URL, includeSignup:', includeSignup);
    // Generate new state parameter
    this.currentState = this.generateSecureState();
    this.stateTimestamp = Date.now();
    console.log('[OAuthService] State timestamp set to:', this.stateTimestamp);

    // Generate PKCE parameters for enhanced security
    const { verifier, challenge } = await this.generatePKCE();
    
    // Store code verifier for later use
    sessionStorage.setItem('oauth_code_verifier', verifier);
    console.log('[OAuthService] Stored code verifier in sessionStorage');

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
    console.log('[OAuthService] Generated OAuth URL:', authUrl);
    
    return authUrl;
  }

  /**
   * Validate state parameter to prevent CSRF attacks
   * @param receivedState - State parameter received from OAuth callback
   * @returns True if state is valid
   */
  validateState(receivedState: string): boolean {
    console.log('[OAuthService] Validating state parameter');
    console.log('[OAuthService] Current state:', this.currentState ? this.currentState.substring(0, 10) + '...' : 'null');
    console.log('[OAuthService] Received state:', receivedState ? receivedState.substring(0, 10) + '...' : 'null');
    console.log('[OAuthService] State timestamp:', this.stateTimestamp);
    
    if (!this.currentState || !this.stateTimestamp) {
      console.error('[OAuthService] No state parameter stored for validation');
      return false;
    }

    // Check if state has expired
    const now = Date.now();
    const timeDiff = now - this.stateTimestamp;
    console.log('[OAuthService] Time since state generation (ms):', timeDiff);
    
    if (timeDiff > this.STATE_EXPIRY_MS) {
      console.error('[OAuthService] State parameter has expired');
      this.clearState();
      return false;
    }

    // Check if state matches
    const isValid = receivedState === this.currentState;
    console.log('[OAuthService] State validation result:', isValid);
    
    if (!isValid) {
      console.error('[OAuthService] State parameter mismatch');
      this.clearState();
      return false;
    }

    // State is valid, clear it (one-time use)
    console.log('[OAuthService] State validation successful, clearing state');
    this.clearState();
    return true;
  }

  /**
   * Clear stored state parameter
   */
  private clearState(): void {
    console.log('[OAuthService] Clearing stored state');
    this.currentState = null;
    this.stateTimestamp = null;
  }

  /**
   * Launch browser with OAuth URL
   * @param includeSignup - Whether to include signup flow
   */
  async launchOAuthFlow(includeSignup: boolean = false): Promise<void> {
    console.log('[OAuthService] Launching OAuth flow, includeSignup:', includeSignup);
    try {
      const authUrl = await this.generateAuthUrl(includeSignup);
      
      console.log('[OAuthService] Launching browser for OAuth authentication...');
      await open(authUrl);
      
      console.log('[OAuthService] Browser launched successfully. Waiting for OAuth callback...');
    } catch (error) {
      console.error('[OAuthService] Failed to launch OAuth flow:', error);
      throw new Error('Failed to open browser for authentication');
    }
  }

  /**
   * Parse OAuth callback URL and extract parameters
   * @param callbackUrl - The callback URL received from OAuth provider
   * @returns Parsed callback parameters
   */
  parseCallbackUrl(callbackUrl: string): OAuthCallbackParams {
    console.log('[OAuthService] Parsing callback URL:', callbackUrl);
    try {
      const url = new URL(callbackUrl);
      const params: OAuthCallbackParams = {};

      // Extract relevant parameters
      if (url.searchParams.has('code')) {
        params.code = url.searchParams.get('code')!;
        console.log('[OAuthService] Extracted code parameter');
      }

      if (url.searchParams.has('state')) {
        params.state = url.searchParams.get('state')!;
        console.log('[OAuthService] Extracted state parameter');
      }

      if (url.searchParams.has('error')) {
        params.error = url.searchParams.get('error')!;
        console.log('[OAuthService] Extracted error parameter:', params.error);
      }

      if (url.searchParams.has('error_description')) {
        params.error_description = url.searchParams.get('error_description')!;
        console.log('[OAuthService] Extracted error_description parameter');
      }

      console.log('[OAuthService] Parsed callback parameters:', params);
      return params;
    } catch (error) {
      console.error('[OAuthService] Failed to parse callback URL:', error);
      throw new Error('Invalid OAuth callback URL');
    }
  }

  /**
   * Handle OAuth callback with full validation
   * @param callbackUrl - The callback URL received
   * @returns Authorization code if successful
   */
  handleCallback(callbackUrl: string): string {
    console.log('[OAuthService] Handling OAuth callback:', callbackUrl);
    const params = this.parseCallbackUrl(callbackUrl);

    // Check for OAuth errors
    if (params.error) {
      const errorMsg = params.error_description || params.error;
      console.error('[OAuthService] OAuth error:', errorMsg);
      throw new Error(`Authentication failed: ${errorMsg}`);
    }

    // Validate state parameter for CSRF protection
    if (!params.state) {
      console.error('[OAuthService] Missing state parameter in OAuth callback');
      throw new Error('Missing state parameter in OAuth callback');
    }

    if (!this.validateState(params.state)) {
      console.error('[OAuthService] Invalid state parameter - possible CSRF attack');
      throw new Error('Invalid state parameter - possible CSRF attack');
    }

    // Validate authorization code
    if (!params.code) {
      console.error('[OAuthService] Missing authorization code in OAuth callback');
      throw new Error('Missing authorization code in OAuth callback');
    }

    console.log('[OAuthService] OAuth callback validated successfully');
    console.log('[OAuthService] Returning authorization code:', params.code.substring(0, 10) + '...');
    return params.code;
  }

  /**
   * Get stored PKCE code verifier
   * @returns Code verifier or null if not found
   */
  getCodeVerifier(): string | null {
    const verifier = sessionStorage.getItem('oauth_code_verifier');
    console.log('[OAuthService] Retrieved code verifier from sessionStorage:', verifier ? verifier.substring(0, 10) + '...' : 'null');
    return verifier;
  }

  /**
   * Clear stored PKCE code verifier
   */
  clearCodeVerifier(): void {
    console.log('[OAuthService] Clearing code verifier from sessionStorage');
    sessionStorage.removeItem('oauth_code_verifier');
  }

  /**
   * Update OAuth configuration
   * @param newConfig - New OAuth configuration
   */
  updateConfig(newConfig: Partial<OAuthConfig>): void {
    console.log('[OAuthService] Updating configuration:', newConfig);
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current OAuth configuration
   * @returns Current OAuth configuration
   */
  getConfig(): OAuthConfig {
    console.log('[OAuthService] Returning current configuration');
    return { ...this.config };
  }
}

// Create and export a singleton instance of OAuthService
import { environmentConfig } from './environmentService';

const oauthService = new OAuthService(environmentConfig.oauth);

export { oauthService };
