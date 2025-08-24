import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OAuthService, OAuthConfig } from '../services/oauthService';

// Mock Tauri shell plugin
vi.mock('@tauri-apps/plugin-shell', () => ({
  open: vi.fn().mockResolvedValue(undefined)
}));

describe('OAuthService', () => {
  let oauthService: OAuthService;
  const mockConfig: OAuthConfig = {
    baseUrl: 'https://clipify.space/api/v1/auth/google/login',
    clientId: 'test-client-id',
    redirectUri: 'clipify://auth/callback',
    scope: 'openid email profile'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    oauthService = new OAuthService(mockConfig);
    
    // Mock crypto.getRandomValues
    Object.defineProperty(global, 'crypto', {
      value: {
        getRandomValues: vi.fn((arr: Uint8Array) => {
          // Fill with predictable values for testing
          for (let i = 0; i < arr.length; i++) {
            arr[i] = i % 256;
          }
          return arr;
        }),
        subtle: {
          digest: vi.fn().mockResolvedValue(new ArrayBuffer(32))
        }
      }
    });

    // Mock btoa function
    global.btoa = vi.fn((str: string) => 'mocked-base64-' + str.length);
    
    // Clear any existing session storage
    global.sessionStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn()
    } as any;
  });

  describe('generateAuthUrl', () => {
    it('should generate a valid OAuth URL with all required parameters', async () => {
      const url = await oauthService.generateAuthUrl(false);
      
      expect(url).toContain(mockConfig.baseUrl);
      expect(url).toContain('response_type=code');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('redirect_uri=clipify%3A%2F%2Fauth%2Fcallback');
      expect(url).toContain('scope=openid%20email%20profile');
      expect(url).toContain('state=');
      expect(url).toContain('code_challenge=');
      expect(url).toContain('code_challenge_method=S256');
      expect(url).toContain('client_type=desktop');
    });

    it('should include signup prompt when requested', async () => {
      const url = await oauthService.generateAuthUrl(true);
      
      expect(url).toContain('prompt=consent%20select_account');
    });

    it('should generate unique state parameters for each call', async () => {
      const url1 = await oauthService.generateAuthUrl(false);
      const url2 = await oauthService.generateAuthUrl(false);
      
      // Extract state parameters
      const state1 = new URL(url1).searchParams.get('state');
      const state2 = new URL(url2).searchParams.get('state');
      
      expect(state1).toBeTruthy();
      expect(state2).toBeTruthy();
      expect(state1).not.toBe(state2);
    });

    it('should store PKCE code verifier in session storage', async () => {
      await oauthService.generateAuthUrl(false);
      
      expect(sessionStorage.setItem).toHaveBeenCalledWith(
        'oauth_code_verifier', 
        expect.any(String)
      );
    });
  });

  describe('validateState', () => {
    it('should return true for valid state', async () => {
      // Generate a URL to set up state
      await oauthService.generateAuthUrl(false);
      
      // Get the current state
      const currentState = (oauthService as any).currentState;
      
      const isValid = oauthService.validateState(currentState);
      
      expect(isValid).toBe(true);
    });

    it('should return false for invalid state', () => {
      const isValid = oauthService.validateState('invalid-state');
      
      expect(isValid).toBe(false);
    });

    it('should return false when no state is stored', () => {
      const isValid = oauthService.validateState('any-state');
      
      expect(isValid).toBe(false);
    });

    it('should clear state after successful validation (one-time use)', async () => {
      await oauthService.generateAuthUrl(false);
      const currentState = (oauthService as any).currentState;
      
      // First validation should succeed
      expect(oauthService.validateState(currentState)).toBe(true);
      
      // Second validation should fail (state cleared)
      expect(oauthService.validateState(currentState)).toBe(false);
    });

    it('should return false for expired state', async () => {
      await oauthService.generateAuthUrl(false);
      const currentState = (oauthService as any).currentState;
      
      // Simulate expired state by setting old timestamp
      (oauthService as any).stateTimestamp = Date.now() - (11 * 60 * 1000); // 11 minutes ago
      
      const isValid = oauthService.validateState(currentState);
      
      expect(isValid).toBe(false);
    });
  });

  describe('launchOAuthFlow', () => {
    it('should launch browser with generated OAuth URL', async () => {
      const { open } = await import('@tauri-apps/plugin-shell');
      
      await oauthService.launchOAuthFlow(false);
      
      expect(open).toHaveBeenCalledWith(expect.stringContaining(mockConfig.baseUrl));
    });

    it('should handle browser launch errors', async () => {
      const { open } = await import('@tauri-apps/plugin-shell');
      (open as any).mockRejectedValue(new Error('Browser launch failed'));
      
      await expect(oauthService.launchOAuthFlow(false))
        .rejects.toThrow('Failed to open browser for authentication');
    });
  });

  describe('parseCallbackUrl', () => {
    it('should parse valid callback URL with authorization code', () => {
      const callbackUrl = 'clipify://auth/callback?code=auth123&state=state456';
      
      const params = oauthService.parseCallbackUrl(callbackUrl);
      
      expect(params.code).toBe('auth123');
      expect(params.state).toBe('state456');
    });

    it('should parse callback URL with error', () => {
      const callbackUrl = 'clipify://auth/callback?error=access_denied&error_description=User%20denied%20access';
      
      const params = oauthService.parseCallbackUrl(callbackUrl);
      
      expect(params.error).toBe('access_denied');
      expect(params.error_description).toBe('User denied access');
    });

    it('should handle invalid URLs gracefully', () => {
      expect(() => {
        oauthService.parseCallbackUrl('invalid-url');
      }).toThrow('Invalid OAuth callback URL');
    });
  });

  describe('handleCallback', () => {
    beforeEach(async () => {
      // Set up valid state
      await oauthService.generateAuthUrl(false);
    });

    it('should successfully handle valid callback with authorization code', () => {
      const currentState = (oauthService as any).currentState;
      const callbackUrl = `clipify://auth/callback?code=auth123&state=${currentState}`;
      
      const authCode = oauthService.handleCallback(callbackUrl);
      
      expect(authCode).toBe('auth123');
    });

    it('should throw error for OAuth errors in callback', () => {
      const currentState = (oauthService as any).currentState;
      const callbackUrl = `clipify://auth/callback?error=access_denied&state=${currentState}`;
      
      expect(() => {
        oauthService.handleCallback(callbackUrl);
      }).toThrow('Authentication failed: access_denied');
    });

    it('should throw error for missing state parameter', () => {
      const callbackUrl = 'clipify://auth/callback?code=auth123';
      
      expect(() => {
        oauthService.handleCallback(callbackUrl);
      }).toThrow('Missing state parameter in OAuth callback');
    });

    it('should throw error for invalid state parameter', () => {
      const callbackUrl = 'clipify://auth/callback?code=auth123&state=invalid-state';
      
      expect(() => {
        oauthService.handleCallback(callbackUrl);
      }).toThrow('Invalid state parameter - possible CSRF attack');
    });

    it('should throw error for missing authorization code', () => {
      const currentState = (oauthService as any).currentState;
      const callbackUrl = `clipify://auth/callback?state=${currentState}`;
      
      expect(() => {
        oauthService.handleCallback(callbackUrl);
      }).toThrow('Missing authorization code in OAuth callback');
    });
  });

  describe('PKCE code management', () => {
    it('should store and retrieve code verifier', async () => {
      await oauthService.generateAuthUrl(false);
      
      const codeVerifier = oauthService.getCodeVerifier();
      
      expect(codeVerifier).toBeTruthy();
      expect(sessionStorage.getItem).toHaveBeenCalledWith('oauth_code_verifier');
    });

    it('should clear code verifier', () => {
      oauthService.clearCodeVerifier();
      
      expect(sessionStorage.removeItem).toHaveBeenCalledWith('oauth_code_verifier');
    });
  });

  describe('configuration management', () => {
    it('should update configuration', () => {
      const newConfig = {
        baseUrl: 'https://new-url.example.com'
      };
      
      oauthService.updateConfig(newConfig);
      
      const updatedConfig = oauthService.getConfig();
      expect(updatedConfig.baseUrl).toBe(newConfig.baseUrl);
      expect(updatedConfig.clientId).toBe(mockConfig.clientId); // Should preserve other values
    });

    it('should return current configuration', () => {
      const config = oauthService.getConfig();
      
      expect(config).toEqual(mockConfig);
    });
  });
});