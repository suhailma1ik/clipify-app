/**
 * Unit tests for useAuth hook
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../useAuth';
import { getAuthService } from '../../services/authService';

// Mock the auth service
vi.mock('../../services/authService');

const mockAuthService = {
  getAuthState: vi.fn(),
  subscribe: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  getAccessToken: vi.fn(),
  hasValidAccessToken: vi.fn(),
  isAuthenticated: vi.fn(),
  getCurrentUser: vi.fn(),
};

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthService).mockReturnValue(mockAuthService as any);
    
    // Default mock implementations
    mockAuthService.getAuthState.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      error: null,
    });
    
    mockAuthService.subscribe.mockReturnValue(() => {});
    mockAuthService.login.mockResolvedValue(undefined);
    mockAuthService.logout.mockResolvedValue(undefined);
    mockAuthService.getAccessToken.mockResolvedValue(null);
    mockAuthService.hasValidAccessToken.mockResolvedValue(false);
    mockAuthService.isAuthenticated.mockReturnValue(false);
    mockAuthService.getCurrentUser.mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with auth service state', () => {
      const { result } = renderHook(() => useAuth());
      
      expect(mockAuthService.getAuthState).toHaveBeenCalled();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should subscribe to auth service state changes', () => {
      renderHook(() => useAuth());
      
      expect(mockAuthService.subscribe).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should unsubscribe on unmount', () => {
      const unsubscribe = vi.fn();
      mockAuthService.subscribe.mockReturnValue(unsubscribe);
      
      const { unmount } = renderHook(() => useAuth());
      
      unmount();
      
      expect(unsubscribe).toHaveBeenCalled();
    });
  });

  describe('authentication state', () => {
    it('should reflect authenticated state', () => {
      const mockUser = { id: 'user123', email: 'user@example.com', name: 'Test User' };
      mockAuthService.getAuthState.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: mockUser,
        error: null,
      });
      
      const { result } = renderHook(() => useAuth());
      
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
    });

    it('should reflect loading state', () => {
      mockAuthService.getAuthState.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        user: null,
        error: null,
      });
      
      const { result } = renderHook(() => useAuth());
      
      expect(result.current.isLoading).toBe(true);
    });

    it('should reflect error state', () => {
      const errorMessage = 'Authentication failed';
      mockAuthService.getAuthState.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: errorMessage,
      });
      
      const { result } = renderHook(() => useAuth());
      
      expect(result.current.error).toBe(errorMessage);
    });
  });

  describe('state updates', () => {
    it('should update state when auth service notifies changes', () => {
      let stateChangeCallback: () => void;
      mockAuthService.subscribe.mockImplementation((callback) => {
        stateChangeCallback = callback;
        return () => {};
      });
      
      // Initial state
      mockAuthService.getAuthState.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
      });
      
      const { result } = renderHook(() => useAuth());
      
      expect(result.current.isAuthenticated).toBe(false);
      
      // Simulate state change
      const mockUser = { id: 'user123', email: 'user@example.com', name: 'Test User' };
      mockAuthService.getAuthState.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: mockUser,
        error: null,
      });
      
      act(() => {
        stateChangeCallback();
      });
      
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
    });
  });

  describe('login method', () => {
    it('should call auth service login', async () => {
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        await result.current.login();
      });
      
      expect(mockAuthService.login).toHaveBeenCalled();
    });

    it('should handle login errors', async () => {
      const loginError = new Error('Login failed');
      mockAuthService.login.mockRejectedValue(loginError);
      
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        await expect(result.current.login()).rejects.toThrow('Login failed');
      });
    });
  });

  describe('logout method', () => {
    it('should call auth service logout', async () => {
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        await result.current.logout();
      });
      
      expect(mockAuthService.logout).toHaveBeenCalled();
    });

    it('should handle logout errors', async () => {
      const logoutError = new Error('Logout failed');
      mockAuthService.logout.mockRejectedValue(logoutError);
      
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        await expect(result.current.logout()).rejects.toThrow('Logout failed');
      });
    });
  });

  describe('getAccessToken method', () => {
    it('should return access token from auth service', async () => {
      const mockToken = 'test-access-token';
      mockAuthService.getAccessToken.mockResolvedValue(mockToken);
      
      const { result } = renderHook(() => useAuth());
      
      const token = await result.current.getAccessToken();
      
      expect(token).toBe(mockToken);
      expect(mockAuthService.getAccessToken).toHaveBeenCalled();
    });

    it('should return null when no token available', async () => {
      mockAuthService.getAccessToken.mockResolvedValue(null);
      
      const { result } = renderHook(() => useAuth());
      
      const token = await result.current.getAccessToken();
      
      expect(token).toBeNull();
    });
  });

  describe('hasValidAccessToken method', () => {
    it('should return true when valid token exists', async () => {
      mockAuthService.hasValidAccessToken.mockResolvedValue(true);
      
      const { result } = renderHook(() => useAuth());
      
      const hasValid = await result.current.hasValidAccessToken();
      
      expect(hasValid).toBe(true);
      expect(mockAuthService.hasValidAccessToken).toHaveBeenCalled();
    });

    it('should return false when no valid token exists', async () => {
      mockAuthService.hasValidAccessToken.mockResolvedValue(false);
      
      const { result } = renderHook(() => useAuth());
      
      const hasValid = await result.current.hasValidAccessToken();
      
      expect(hasValid).toBe(false);
    });
  });

  describe('multiple hook instances', () => {
    it('should share the same auth service instance', () => {
      const { result: result1 } = renderHook(() => useAuth());
      const { result: result2 } = renderHook(() => useAuth());
      
      // Both hooks should call the same auth service
      expect(mockAuthService.getAuthState).toHaveBeenCalledTimes(2);
      expect(mockAuthService.subscribe).toHaveBeenCalledTimes(2);
      
      // State should be consistent
      expect(result1.current.isAuthenticated).toBe(result2.current.isAuthenticated);
    });
  });

  describe('error handling', () => {
    it('should handle auth service initialization errors', () => {
      mockAuthService.getAuthState.mockImplementation(() => {
        throw new Error('Auth service error');
      });
      
      // Should not throw, but handle gracefully
      expect(() => {
        renderHook(() => useAuth());
      }).not.toThrow();
    });

    it('should handle subscription errors', () => {
      mockAuthService.subscribe.mockImplementation(() => {
        throw new Error('Subscription error');
      });
      
      // Should not throw, but handle gracefully
      expect(() => {
        renderHook(() => useAuth());
      }).not.toThrow();
    });
  });

  describe('cleanup', () => {
    it('should handle unsubscribe errors gracefully', () => {
      const unsubscribe = vi.fn().mockImplementation(() => {
        throw new Error('Unsubscribe error');
      });
      mockAuthService.subscribe.mockReturnValue(unsubscribe);
      
      const { unmount } = renderHook(() => useAuth());
      
      // Should not throw when unmounting
      expect(() => {
        unmount();
      }).not.toThrow();
    });
  });
});