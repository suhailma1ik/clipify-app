import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthService, getAuthService } from '../authService';
import { getSecureTokenStorage } from '../secureTokenStorage';
import { notificationService } from '../notificationService';
import { getLoggingService } from '../loggingService';
import { getEnvironmentConfig } from '../environmentService';

// Mock dependencies
vi.mock('../secureTokenStorage');
vi.mock('../notificationService');
vi.mock('../loggingService');
vi.mock('../environmentService');
vi.mock('@tauri-apps/api/core');
vi.mock('@tauri-apps/plugin-shell');

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('AuthService - Logout Flow', () => {
  let authService: AuthService;
  let mockTokenStorage: any;
  let mockLogger: any;
  let mockNotificationService: any;
  let mockEnvironmentConfig: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock token storage
    mockTokenStorage = {
      hasValidAccessToken: vi.fn(),
      getAccessToken: vi.fn(),
      clearAllTokens: vi.fn(),
      storeTokenInfo: vi.fn(),
      getTokenInfo: vi.fn(),
      getUserInfo: vi.fn(),
      storeUserInfo: vi.fn(),
      clearUserInfo: vi.fn(),
    };
    vi.mocked(getSecureTokenStorage).mockReturnValue(mockTokenStorage);

    // Mock logger
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };
    vi.mocked(getLoggingService).mockReturnValue(mockLogger);

    // Mock notification service
    mockNotificationService = {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
    };
    Object.assign(notificationService, mockNotificationService);

    // Mock environment config
    mockEnvironmentConfig = {
      api: {
        baseUrl: 'https://api.example.com',
      },
    };
    vi.mocked(getEnvironmentConfig).mockReturnValue(mockEnvironmentConfig);

    // Reset fetch mock
    mockFetch.mockReset();

    authService = getAuthService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('logout', () => {
    it('should successfully logout with valid token and API call', async () => {
      // Arrange
      mockTokenStorage.hasValidAccessToken.mockResolvedValue(true);
      mockTokenStorage.getAccessToken.mockResolvedValue('valid-access-token');
      mockTokenStorage.clearAllTokens.mockResolvedValue(undefined);
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
      });

      // Act
      await authService.logout();

      // Assert
      expect(mockTokenStorage.hasValidAccessToken).toHaveBeenCalled();
      expect(mockTokenStorage.getAccessToken).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/auth/logout',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer valid-access-token',
            'Content-Type': 'application/json',
          },
        }
      );
      expect(mockTokenStorage.clearAllTokens).toHaveBeenCalled();
      expect(mockNotificationService.success).toHaveBeenCalledWith(
        'Logout',
        'Logged out successfully'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'auth',
        'Logout API call successful'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'auth',
        'Logout completed successfully'
      );

      // Check auth state is updated
      const authState = authService.getAuthState();
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.isLoading).toBe(false);
      expect(authState.user).toBe(null);
      expect(authState.error).toBe(null);
    });

    it('should logout successfully even when API call fails', async () => {
      // Arrange
      mockTokenStorage.hasValidAccessToken.mockResolvedValue(true);
      mockTokenStorage.getAccessToken.mockResolvedValue('valid-access-token');
      mockTokenStorage.clearAllTokens.mockResolvedValue(undefined);
      mockFetch.mockRejectedValue(new Error('Network error'));

      // Act
      await authService.logout();

      // Assert
      expect(mockFetch).toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'auth',
        'Logout API call failed, continuing with local logout'
      );
      expect(mockTokenStorage.clearAllTokens).toHaveBeenCalled();
      expect(mockNotificationService.success).toHaveBeenCalledWith(
        'Logout',
        'Logged out successfully'
      );

      // Check auth state is updated
      const authState = authService.getAuthState();
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.isLoading).toBe(false);
      expect(authState.user).toBe(null);
      expect(authState.error).toBe(null);
    });

    it('should logout successfully when no valid token exists', async () => {
      // Arrange
      mockTokenStorage.hasValidAccessToken.mockResolvedValue(false);
      mockTokenStorage.clearAllTokens.mockResolvedValue(undefined);

      // Act
      await authService.logout();

      // Assert
      expect(mockTokenStorage.hasValidAccessToken).toHaveBeenCalled();
      expect(mockTokenStorage.getAccessToken).not.toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockTokenStorage.clearAllTokens).toHaveBeenCalled();
      expect(mockNotificationService.success).toHaveBeenCalledWith(
        'Logout',
        'Logged out successfully'
      );

      // Check auth state is updated
      const authState = authService.getAuthState();
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.isLoading).toBe(false);
      expect(authState.user).toBe(null);
      expect(authState.error).toBe(null);
    });

    it('should handle token storage errors gracefully', async () => {
      // Arrange
      mockTokenStorage.hasValidAccessToken.mockRejectedValue(
        new Error('Token storage error')
      );

      // Act
      await authService.logout();

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        'auth',
        'Failed to logout',
        expect.any(Error)
      );
      expect(mockNotificationService.error).toHaveBeenCalledWith(
        'Logout Error',
        'Failed to logout completely'
      );

      // Check auth state shows error
      const authState = authService.getAuthState();
      expect(authState.isLoading).toBe(false);
      expect(authState.error).toBe('Failed to logout completely');
    });

    it('should handle clearAllTokens failure gracefully', async () => {
      // Arrange
      mockTokenStorage.hasValidAccessToken.mockResolvedValue(false);
      mockTokenStorage.clearAllTokens.mockRejectedValue(
        new Error('Clear tokens failed')
      );

      // Act
      await authService.logout();

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        'auth',
        'Failed to logout',
        expect.any(Error)
      );
      expect(mockNotificationService.error).toHaveBeenCalledWith(
        'Logout Error',
        'Failed to logout completely'
      );

      // Check auth state shows error
      const authState = authService.getAuthState();
      expect(authState.isLoading).toBe(false);
      expect(authState.error).toBe('Failed to logout completely');
    });

    it('should set loading state during logout process', async () => {
      // Arrange
      mockTokenStorage.hasValidAccessToken.mockResolvedValue(false);
      mockTokenStorage.clearAllTokens.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      // Act
      const logoutPromise = authService.logout();

      // Assert loading state is set
      const loadingState = authService.getAuthState();
      expect(loadingState.isLoading).toBe(true);
      expect(loadingState.error).toBe(null);

      // Wait for completion
      await logoutPromise;

      // Assert final state
      const finalState = authService.getAuthState();
      expect(finalState.isLoading).toBe(false);
      expect(finalState.isAuthenticated).toBe(false);
    });

    it('should call logout endpoint with correct headers and method', async () => {
      // Arrange
      const testToken = 'test-access-token-123';
      mockTokenStorage.hasValidAccessToken.mockResolvedValue(true);
      mockTokenStorage.getAccessToken.mockResolvedValue(testToken);
      mockTokenStorage.clearAllTokens.mockResolvedValue(undefined);
      mockFetch.mockResolvedValue({ ok: true, status: 200 });

      // Act
      await authService.logout();

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/auth/logout',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${testToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
    });

    it('should notify state listeners about logout', async () => {
      // Arrange
      const mockListener = vi.fn();
      const unsubscribe = authService.subscribe(mockListener);
      
      mockTokenStorage.hasValidAccessToken.mockResolvedValue(false);
      mockTokenStorage.clearAllTokens.mockResolvedValue(undefined);

      // Act
      await authService.logout();

      // Assert
      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          error: null,
        })
      );

      // Cleanup
      unsubscribe();
    });
  });
});