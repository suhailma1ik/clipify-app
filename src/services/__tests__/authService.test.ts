/**
 * Unit tests for AuthService
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuthService, getAuthService } from '../authService';
import { getSecureTokenStorage } from '../secureTokenStorage';
import { notificationService } from '../notificationService';
import { getLoggingService } from '../loggingService';
import { getEnvironmentConfig } from '../environmentService';

// Mock dependencies
vi.mock('@tauri-apps/api/core');
vi.mock('@tauri-apps/plugin-shell');
// Mock Tauri event API for deep-link listener
const mockListen = vi.fn();
const mockUnlisten = vi.fn();
let capturedDeepLinkHandler: ((event: { payload: string }) => void) | null = null;
vi.mock('@tauri-apps/api/event', () => ({
  listen: (...args: any[]) => mockListen(...args),
}));
vi.mock('../secureTokenStorage');
vi.mock('../notificationService');
vi.mock('../loggingService');
vi.mock('../environmentService');

// Mock implementations
const mockTokenStorage = {
  initialize: vi.fn(),
  hasValidAccessToken: vi.fn(),
  getUserInfo: vi.fn(),
  storeTokenInfo: vi.fn(),
  storeUserInfo: vi.fn(),
  getAccessToken: vi.fn(),
  clearAllTokens: vi.fn(),
};

const mockNotificationService = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
};

const mockLoggingService = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
};

const mockEnvironmentConfig = {
  api: {
    baseUrl: 'http://localhost:8080',
  },
  frontend: {
    baseUrl: 'http://localhost:5173/',
  },
  oauth: {
    redirectUri: 'clipify://auth/callback',
  },
};

const mockInvoke = vi.fn();
const mockOpen = vi.fn();

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup mock implementations
    vi.mocked(getSecureTokenStorage).mockReturnValue(mockTokenStorage as any);
    Object.assign(notificationService, mockNotificationService);
    vi.mocked(getLoggingService).mockReturnValue(mockLoggingService as any);
    vi.mocked(getEnvironmentConfig).mockReturnValue(mockEnvironmentConfig as any);
    
    // Mock Tauri APIs
    const { invoke } = await import('@tauri-apps/api/core');
    const { open } = await import('@tauri-apps/plugin-shell');
    const { listen } = await import('@tauri-apps/api/event');
    vi.mocked(invoke).mockImplementation(mockInvoke);
    vi.mocked(open).mockImplementation(mockOpen);
    mockListen.mockReset();
    mockUnlisten.mockReset();
    capturedDeepLinkHandler = null;
    vi.mocked(listen as any).mockImplementation((_eventName: string, handler: any) => {
      capturedDeepLinkHandler = handler;
      return Promise.resolve(mockUnlisten);
    });
    
    // Setup default mock responses
    mockTokenStorage.initialize.mockResolvedValue(undefined);
    mockTokenStorage.hasValidAccessToken.mockResolvedValue(false);
    mockTokenStorage.getUserInfo.mockResolvedValue(null);
    mockInvoke.mockResolvedValue(undefined);
    mockOpen.mockResolvedValue(undefined);
    
    // Create new auth service instance
    authService = new AuthService();
    
    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 10));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize successfully', () => {
      expect(mockTokenStorage.initialize).toHaveBeenCalled();
      expect(mockLoggingService.info).toHaveBeenCalledWith('auth', 'Deep link listener registered');
    });

    it('should check for existing authentication', () => {
      expect(mockTokenStorage.hasValidAccessToken).toHaveBeenCalled();
    });

    it('should setup deep link listener', () => {
      expect(mockListen).toHaveBeenCalledWith('deep-link-received', expect.any(Function));
    });

    it('should handle initialization errors gracefully', async () => {
      mockTokenStorage.initialize.mockRejectedValue(new Error('Init failed'));
      
      new AuthService();
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockLoggingService.error).toHaveBeenCalledWith(
        'auth',
        'Failed to initialize auth service',
        expect.any(Error)
      );
    });
  });

  describe('existing authentication check', () => {
    it('should restore authentication state when valid token exists', async () => {
      const mockUser = { id: 'user123', email: 'user@example.com', name: 'Test User' };
      mockTokenStorage.hasValidAccessToken.mockResolvedValue(true);
      mockTokenStorage.getUserInfo.mockResolvedValue(mockUser);
      
      const newAuthService = new AuthService();
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const authState = newAuthService.getAuthState();
      expect(authState.isAuthenticated).toBe(true);
      expect(authState.user).toEqual(mockUser);
      expect(mockLoggingService.info).toHaveBeenCalledWith('auth', 'Existing authentication found');
    });

    it('should remain unauthenticated when no valid token exists', async () => {
      mockTokenStorage.hasValidAccessToken.mockResolvedValue(false);
      
      const newAuthService = new AuthService();
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const authState = newAuthService.getAuthState();
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.user).toBeNull();
    });
  });

  describe('login flow', () => {
    it('should start login flow successfully', async () => {
      await authService.login();
      
      expect(mockLoggingService.info).toHaveBeenCalledWith(
        'auth',
        'Starting authentication flow via website login page',
        { loginUrl: 'http://localhost:5173/login?redirect=clipify%3A%2F%2Fauth%2Fcallback' }
      );
      expect(mockNotificationService.info).toHaveBeenCalledWith(
        'Authentication',
        'Opening browser for authentication...'
      );
      expect(mockOpen).toHaveBeenCalledWith('http://localhost:5173/login?redirect=clipify%3A%2F%2Fauth%2Fcallback');
    });

    it('should handle login errors gracefully', async () => {
      mockOpen.mockRejectedValue(new Error('Failed to open browser'));
      
      await authService.login();
      
      expect(mockLoggingService.error).toHaveBeenCalledWith(
        'auth',
        'Failed to start authentication',
        expect.any(Error)
      );
      expect(mockNotificationService.error).toHaveBeenCalledWith(
        'Authentication Error',
        'Failed to open browser for authentication'
      );
      
      const authState = authService.getAuthState();
      expect(authState.isLoading).toBe(false);
      expect(authState.error).toBe('Failed to open browser for authentication');
    });

    it('should set loading state during login', async () => {
      const loginPromise = authService.login();
      
      // Check loading state immediately
      const authState = authService.getAuthState();
      expect(authState.isLoading).toBe(true);
      
      await loginPromise;
    });
  });

  describe('deep link callback handling', () => {
    it('should handle successful auth callback', async () => {
      const callbackUrl = 'clipify://auth/callback?token=test-token&refresh_token=refresh-token&user=%7B%22id%22%3A%22user123%22%2C%22email%22%3A%22user%40example.com%22%7D';
      
      // New instance to capture the deep-link listener
      new AuthService();
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Trigger deep link event via Tauri listener
      expect(capturedDeepLinkHandler).toBeTruthy();
      await capturedDeepLinkHandler!({ payload: callbackUrl });
      
      expect(mockTokenStorage.storeTokenInfo).toHaveBeenCalledWith({
        accessToken: 'test-token',
        refreshToken: 'refresh-token',
        tokenType: 'Bearer',
        scope: undefined,
        expiresAt: undefined,
      });
      
      expect(mockTokenStorage.storeUserInfo).toHaveBeenCalledWith({
        id: 'user123',
        email: 'user@example.com',
      });
      
      expect(mockNotificationService.success).toHaveBeenCalledWith(
        'Authentication Success',
        'Authentication successful!'
      );
    });

    it('should handle callback with error parameter', async () => {
      const callbackUrl = 'clipify://auth/callback?error=access_denied&error_description=User%20denied%20access';
      
      const svc = new AuthService();
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Trigger callback with error
      expect(capturedDeepLinkHandler).toBeTruthy();
      await capturedDeepLinkHandler!({ payload: callbackUrl });
      
      // Error message now includes specific reason
      expect(mockNotificationService.error).toHaveBeenCalledWith(
        'Authentication Failed',
        expect.stringContaining('Auth error: access_denied - User denied access')
      );
      
      const authState = svc.getAuthState();
      expect(authState.error).toContain('Auth error: access_denied - User denied access');
    });

    it('should handle malformed callback URLs', async () => {
      const callbackUrl = 'invalid-url';
      
      new AuthService();
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Trigger callback with invalid URL
      expect(capturedDeepLinkHandler).toBeTruthy();
      await capturedDeepLinkHandler!({ payload: callbackUrl });
      
      expect(mockLoggingService.error).toHaveBeenCalledWith(
        'auth',
        'Failed to handle auth callback',
        expect.any(Error)
      );
    });
  });

  describe('logout flow', () => {
    it('should logout successfully with API call', async () => {
      mockTokenStorage.hasValidAccessToken.mockResolvedValue(true);
      mockTokenStorage.getAccessToken.mockResolvedValue('test-token');
      
      // Mock successful fetch
      global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });

      await authService.logout();

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/auth/logout',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json',
          },
        }
      );

      expect(mockTokenStorage.clearAllTokens).toHaveBeenCalled();
      expect(mockNotificationService.success).toHaveBeenCalledWith(
        'Logout',
        'Logged out successfully'
      );
      
      const authState = authService.getAuthState();
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.user).toBeNull();
    });

    it('should logout locally when API call fails', async () => {
      mockTokenStorage.hasValidAccessToken.mockResolvedValue(true);
      mockTokenStorage.getAccessToken.mockResolvedValue('test-token');
      
      // Mock failed fetch
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      
      await authService.logout();
      
      expect(mockLoggingService.warn).toHaveBeenCalledWith(
        'auth',
        'Logout API call failed, continuing with local logout'
      );
      
      expect(mockTokenStorage.clearAllTokens).toHaveBeenCalled();
      expect(mockNotificationService.success).toHaveBeenCalledWith(
        'Logout',
        'Logged out successfully'
      );
    });

    it('should logout locally when no valid token exists', async () => {
      mockTokenStorage.hasValidAccessToken.mockResolvedValue(false);
      
      await authService.logout();
      
      expect(global.fetch).not.toHaveBeenCalled();
      expect(mockTokenStorage.clearAllTokens).toHaveBeenCalled();
    });
  });

  describe('state management', () => {
    it('should provide current auth state', () => {
      const authState = authService.getAuthState();
      
      expect(authState).toHaveProperty('isAuthenticated');
      expect(authState).toHaveProperty('isLoading');
      expect(authState).toHaveProperty('user');
      expect(authState).toHaveProperty('error');
    });

    it('should allow subscribing to state changes', () => {
      const listener = vi.fn();
      const unsubscribe = authService.subscribe(listener);
      
      expect(typeof unsubscribe).toBe('function');
      
      // Trigger a state change
      authService.login();
      
      expect(listener).toHaveBeenCalled();
      
      // Unsubscribe should work
      unsubscribe();
    });

    it('should handle listener errors gracefully', () => {
      const faultyListener = vi.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      
      authService.subscribe(faultyListener);
      
      // Trigger state change
      authService.login();
      
      expect(mockLoggingService.error).toHaveBeenCalledWith(
        'auth',
        'Error in auth state listener',
        expect.any(Error)
      );
    });
  });

  describe('utility methods', () => {
    it('should check authentication status', () => {
      const isAuth = authService.isAuthenticated();
      expect(typeof isAuth).toBe('boolean');
    });

    it('should get current user', () => {
      const user = authService.getCurrentUser();
      expect(user).toBeNull(); // Initially null
    });

    it('should get access token', async () => {
      mockTokenStorage.getAccessToken.mockResolvedValue('test-token');
      
      const token = await authService.getAccessToken();
      expect(token).toBe('test-token');
    });

    it('should check if access token is valid', async () => {
      mockTokenStorage.hasValidAccessToken.mockResolvedValue(true);
      
      const isValid = await authService.hasValidAccessToken();
      expect(isValid).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources properly', async () => {
      await authService.cleanup();
      // Verify the unlisten function returned by listen() was called
      expect(mockUnlisten).toHaveBeenCalled();
      expect(mockLoggingService.info).toHaveBeenCalledWith(
        'auth',
        'Auth service cleanup completed'
      );
    });

    it('should handle cleanup errors gracefully', async () => {
      mockInvoke.mockRejectedValue(new Error('Cleanup failed'));
      
      await authService.cleanup();
      
      expect(mockLoggingService.error).toHaveBeenCalledWith(
        'auth',
        'Failed to cleanup auth service',
        expect.any(Error)
      );
    });
  });

  describe('singleton pattern', () => {
    it('should return same instance from getAuthService', () => {
      const instance1 = getAuthService();
      const instance2 = getAuthService();
      
      expect(instance1).toBe(instance2);
    });
  });
});