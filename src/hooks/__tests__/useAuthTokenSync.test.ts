import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAuthTokenSync } from '../useAuthTokenSync';
import { useAuth } from '../useAuth';
import { getApiClient } from '../../services/apiClient';

// Mock dependencies
vi.mock('../useAuth');
vi.mock('../../services/apiClient');

const mockUseAuth = vi.mocked(useAuth);
const mockGetApiClient = vi.mocked(getApiClient);

describe('useAuthTokenSync', () => {
  const mockApiClient = {
    setJwtToken: vi.fn(),
  } as any;

  const mockGetAccessToken = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockGetApiClient.mockReturnValue(mockApiClient);
    mockGetAccessToken.mockResolvedValue('test-token');
    
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
      getAccessToken: mockGetAccessToken,
      hasValidAccessToken: vi.fn(),
      clearError: vi.fn(),
    });

    // Mock console methods to avoid noise in tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('when user is not authenticated', () => {
    it('should clear JWT token from API client', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        getAccessToken: mockGetAccessToken,
        hasValidAccessToken: vi.fn(),
        clearError: vi.fn(),
      });

      renderHook(() => useAuthTokenSync());

      expect(mockApiClient.setJwtToken).toHaveBeenCalledWith(null);
      expect(console.log).toHaveBeenCalledWith('[useAuthTokenSync] JWT token cleared from API client');
    });

    it('should not call getAccessToken when not authenticated', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        getAccessToken: mockGetAccessToken,
        hasValidAccessToken: vi.fn(),
        clearError: vi.fn(),
      });

      renderHook(() => useAuthTokenSync());

      expect(mockGetAccessToken).not.toHaveBeenCalled();
    });
  });

  describe('when user is authenticated', () => {
    it('should sync JWT token with API client when token is available', async () => {
      const testToken = 'test-access-token';
      mockGetAccessToken.mockResolvedValue(testToken);
      
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { id: 'user123', email: 'user@example.com' },
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        getAccessToken: mockGetAccessToken,
        hasValidAccessToken: vi.fn(),
        clearError: vi.fn(),
      });

      renderHook(() => useAuthTokenSync());

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockGetAccessToken).toHaveBeenCalled();
      expect(mockApiClient.setJwtToken).toHaveBeenCalledWith(testToken);
      expect(console.log).toHaveBeenCalledWith('[useAuthTokenSync] JWT token synced with API client');
    });

    it('should clear token when authenticated but no access token available', async () => {
      mockGetAccessToken.mockResolvedValue(null);
      
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { id: 'user123', email: 'user@example.com' },
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        getAccessToken: mockGetAccessToken,
        hasValidAccessToken: vi.fn(),
        clearError: vi.fn(),
      });

      renderHook(() => useAuthTokenSync());

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockGetAccessToken).toHaveBeenCalled();
      expect(mockApiClient.setJwtToken).toHaveBeenCalledWith(null);
      expect(console.warn).toHaveBeenCalledWith('[useAuthTokenSync] No access token available despite being authenticated');
    });

    it('should handle empty string token', async () => {
      mockGetAccessToken.mockResolvedValue('');
      
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { id: 'user123', email: 'user@example.com' },
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        getAccessToken: mockGetAccessToken,
        hasValidAccessToken: vi.fn(),
        clearError: vi.fn(),
      });

      renderHook(() => useAuthTokenSync());

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockGetAccessToken).toHaveBeenCalled();
      expect(mockApiClient.setJwtToken).toHaveBeenCalledWith(null);
      expect(console.warn).toHaveBeenCalledWith('[useAuthTokenSync] No access token available despite being authenticated');
    });
  });

  describe('authentication state changes', () => {
    it('should sync token when authentication state changes from false to true', async () => {
      const testToken = 'new-access-token';
      mockGetAccessToken.mockResolvedValue(testToken);

      // Start with unauthenticated state
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        getAccessToken: mockGetAccessToken,
        hasValidAccessToken: vi.fn(),
        clearError: vi.fn(),
      });

      const { rerender } = renderHook(() => useAuthTokenSync());

      expect(mockApiClient.setJwtToken).toHaveBeenCalledWith(null);

      // Change to authenticated state
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { id: 'user123', email: 'user@example.com' },
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        getAccessToken: mockGetAccessToken,
        hasValidAccessToken: vi.fn(),
        clearError: vi.fn(),
      });

      rerender();

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockGetAccessToken).toHaveBeenCalled();
      expect(mockApiClient.setJwtToken).toHaveBeenCalledWith(testToken);
    });

    it('should clear token when authentication state changes from true to false', async () => {
      const testToken = 'existing-token';
      mockGetAccessToken.mockResolvedValue(testToken);

      // Start with authenticated state
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { id: 'user123', email: 'user@example.com' },
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        getAccessToken: mockGetAccessToken,
        hasValidAccessToken: vi.fn(),
        clearError: vi.fn(),
      });

      const { rerender } = renderHook(() => useAuthTokenSync());

      // Wait for initial sync
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockApiClient.setJwtToken).toHaveBeenCalledWith(testToken);

      // Change to unauthenticated state
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        getAccessToken: mockGetAccessToken,
        hasValidAccessToken: vi.fn(),
        clearError: vi.fn(),
      });

      rerender();

      expect(mockApiClient.setJwtToken).toHaveBeenCalledWith(null);
    });
  });

  describe('getAccessToken function changes', () => {
    it('should re-sync when getAccessToken function reference changes', async () => {
      const testToken1 = 'token-1';
      const testToken2 = 'token-2';
      
      const mockGetAccessToken1 = vi.fn().mockResolvedValue(testToken1);
      const mockGetAccessToken2 = vi.fn().mockResolvedValue(testToken2);

      // Start with first getAccessToken function
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { id: 'user123', email: 'user@example.com' },
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        getAccessToken: mockGetAccessToken1,
        hasValidAccessToken: vi.fn(),
        clearError: vi.fn(),
      });

      const { rerender } = renderHook(() => useAuthTokenSync());

      // Wait for initial sync
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockGetAccessToken1).toHaveBeenCalled();
      expect(mockApiClient.setJwtToken).toHaveBeenCalledWith(testToken1);

      // Change getAccessToken function
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { id: 'user123', email: 'user@example.com' },
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        getAccessToken: mockGetAccessToken2,
        hasValidAccessToken: vi.fn(),
        clearError: vi.fn(),
      });

      rerender();

      // Wait for re-sync
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockGetAccessToken2).toHaveBeenCalled();
      expect(mockApiClient.setJwtToken).toHaveBeenCalledWith(testToken2);
    });
  });

  describe('error handling', () => {
    it('should handle getAccessToken errors gracefully', async () => {
      const tokenError = new Error('Failed to get access token');
      mockGetAccessToken.mockRejectedValue(tokenError);
      
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { id: 'user123', email: 'user@example.com' },
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        getAccessToken: mockGetAccessToken,
        hasValidAccessToken: vi.fn(),
        clearError: vi.fn(),
      });

      renderHook(() => useAuthTokenSync());

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(console.error).toHaveBeenCalledWith('[useAuthTokenSync] Failed to sync JWT token:', tokenError);
      expect(mockApiClient.setJwtToken).not.toHaveBeenCalled();
    });

    it('should handle API client setJwtToken errors gracefully', async () => {
      const testToken = 'test-token';
      const apiError = new Error('API client error');
      
      mockGetAccessToken.mockResolvedValue(testToken);
      mockApiClient.setJwtToken.mockImplementation(() => {
        throw apiError;
      });
      
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { id: 'user123', email: 'user@example.com' },
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        getAccessToken: mockGetAccessToken,
        hasValidAccessToken: vi.fn(),
        clearError: vi.fn(),
      });

      renderHook(() => useAuthTokenSync());

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(console.error).toHaveBeenCalledWith('[useAuthTokenSync] Failed to sync JWT token:', apiError);
    });

    it('should handle getApiClient errors gracefully', async () => {
      const apiClientError = new Error('Failed to get API client');
      mockGetApiClient.mockImplementation(() => {
        throw apiClientError;
      });
      
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { id: 'user123', email: 'user@example.com' },
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        getAccessToken: mockGetAccessToken,
        hasValidAccessToken: vi.fn(),
        clearError: vi.fn(),
      });

      renderHook(() => useAuthTokenSync());

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(console.error).toHaveBeenCalledWith('[useAuthTokenSync] Failed to sync JWT token:', apiClientError);
    });
  });

  describe('edge cases', () => {
    it('should handle multiple rapid authentication state changes', async () => {
      const testToken = 'test-token';
      mockGetAccessToken.mockResolvedValue(testToken);

      // Start unauthenticated
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        getAccessToken: mockGetAccessToken,
        hasValidAccessToken: vi.fn(),
        clearError: vi.fn(),
      });

      const { rerender } = renderHook(() => useAuthTokenSync());

      // Rapid state changes
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { id: 'user123', email: 'user@example.com' },
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        getAccessToken: mockGetAccessToken,
        hasValidAccessToken: vi.fn(),
        clearError: vi.fn(),
      });
      rerender();

      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        getAccessToken: mockGetAccessToken,
        hasValidAccessToken: vi.fn(),
        clearError: vi.fn(),
      });
      rerender();

      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { id: 'user123', email: 'user@example.com' },
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        getAccessToken: mockGetAccessToken,
        hasValidAccessToken: vi.fn(),
        clearError: vi.fn(),
      });
      rerender();

      // Wait for all async operations
      await new Promise(resolve => setTimeout(resolve, 10));

      // Should handle all state changes without crashing
      expect(mockApiClient.setJwtToken).toHaveBeenCalled();
    });

    it('should not crash when useAuth returns undefined values', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: undefined as any,
        isLoading: false,
        user: null,
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        getAccessToken: undefined as any,
        hasValidAccessToken: vi.fn(),
        clearError: vi.fn(),
      });

      expect(() => {
        renderHook(() => useAuthTokenSync());
      }).not.toThrow();
    });
  });

  describe('cleanup', () => {
    it('should not cause memory leaks on unmount', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { id: 'user123', email: 'user@example.com' },
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        getAccessToken: mockGetAccessToken,
        hasValidAccessToken: vi.fn(),
        clearError: vi.fn(),
      });

      const { unmount } = renderHook(() => useAuthTokenSync());

      // Wait for initial sync
      await new Promise(resolve => setTimeout(resolve, 0));

      // Should not throw on unmount
      expect(() => {
        unmount();
      }).not.toThrow();
    });
  });
});