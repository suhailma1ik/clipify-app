import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TokenStorageService, JWTTokenData } from '../services/tokenStorage';

// Mock Tauri store
vi.mock('@tauri-apps/plugin-store', () => ({
  Store: vi.fn().mockImplementation(() => ({
    set: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(undefined),
    save: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined)
  }))
}));

describe('TokenStorageService', () => {
  let tokenStorage: TokenStorageService;
  let mockStore: any;

  const mockTokenData: JWTTokenData = {
    token: 'test-jwt-token',
    expiresAt: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    refreshToken: 'test-refresh-token',
    user: {
      id: 'user123',
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://example.com/avatar.jpg',
      plan: 'free'
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    tokenStorage = new TokenStorageService();
    // Access the mocked store
    mockStore = (tokenStorage as any).store;
  });

  describe('storeToken', () => {
    it('should store token data securely', async () => {
      await tokenStorage.storeToken(mockTokenData);
      
      expect(mockStore.set).toHaveBeenCalledWith('auth_token', mockTokenData);
      expect(mockStore.save).toHaveBeenCalled();
    });

    it('should handle storage errors gracefully', async () => {
      mockStore.set.mockRejectedValue(new Error('Storage error'));
      
      await expect(tokenStorage.storeToken(mockTokenData))
        .rejects.toThrow('Failed to store authentication token');
    });
  });

  describe('retrieveToken', () => {
    it('should retrieve valid token data', async () => {
      mockStore.get.mockResolvedValue(mockTokenData);
      
      const result = await tokenStorage.retrieveToken();
      
      expect(result).toEqual(mockTokenData);
      expect(mockStore.get).toHaveBeenCalledWith('auth_token');
    });

    it('should return null when no token exists', async () => {
      mockStore.get.mockResolvedValue(null);
      
      const result = await tokenStorage.retrieveToken();
      
      expect(result).toBeNull();
    });

    it('should remove expired tokens automatically', async () => {
      const expiredTokenData = {
        ...mockTokenData,
        expiresAt: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
      };
      mockStore.get.mockResolvedValue(expiredTokenData);
      
      const result = await tokenStorage.retrieveToken();
      
      expect(result).toBeNull();
      expect(mockStore.delete).toHaveBeenCalledWith('auth_token');
    });

    it('should handle retrieval errors gracefully', async () => {
      mockStore.get.mockRejectedValue(new Error('Retrieval error'));
      
      const result = await tokenStorage.retrieveToken();
      
      expect(result).toBeNull();
    });
  });

  describe('removeToken', () => {
    it('should remove token from storage', async () => {
      await tokenStorage.removeToken();
      
      expect(mockStore.delete).toHaveBeenCalledWith('auth_token');
      expect(mockStore.save).toHaveBeenCalled();
    });

    it('should handle removal errors gracefully', async () => {
      mockStore.delete.mockRejectedValue(new Error('Removal error'));
      
      await expect(tokenStorage.removeToken())
        .rejects.toThrow('Failed to remove authentication token');
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for valid tokens', () => {
      const validToken = {
        ...mockTokenData,
        expiresAt: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      };
      
      const result = tokenStorage.isTokenExpired(validToken);
      
      expect(result).toBe(false);
    });

    it('should return true for expired tokens', () => {
      const expiredToken = {
        ...mockTokenData,
        expiresAt: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
      };
      
      const result = tokenStorage.isTokenExpired(expiredToken);
      
      expect(result).toBe(true);
    });

    it('should return true for tokens expiring soon (within 5 minutes)', () => {
      const soonToExpireToken = {
        ...mockTokenData,
        expiresAt: Math.floor(Date.now() / 1000) + 240 // 4 minutes from now
      };
      
      const result = tokenStorage.isTokenExpired(soonToExpireToken);
      
      expect(result).toBe(true);
    });
  });

  describe('hasValidToken', () => {
    it('should return true when valid token exists', async () => {
      mockStore.get.mockResolvedValue(mockTokenData);
      
      const result = await tokenStorage.hasValidToken();
      
      expect(result).toBe(true);
    });

    it('should return false when no token exists', async () => {
      mockStore.get.mockResolvedValue(null);
      
      const result = await tokenStorage.hasValidToken();
      
      expect(result).toBe(false);
    });

    it('should return false when token is expired', async () => {
      const expiredToken = {
        ...mockTokenData,
        expiresAt: Math.floor(Date.now() / 1000) - 3600
      };
      mockStore.get.mockResolvedValue(expiredToken);
      
      const result = await tokenStorage.hasValidToken();
      
      expect(result).toBe(false);
    });
  });

  describe('getValidTokenString', () => {
    it('should return token string for valid token', async () => {
      mockStore.get.mockResolvedValue(mockTokenData);
      
      const result = await tokenStorage.getValidTokenString();
      
      expect(result).toBe(mockTokenData.token);
    });

    it('should return null for expired token', async () => {
      const expiredToken = {
        ...mockTokenData,
        expiresAt: Math.floor(Date.now() / 1000) - 3600
      };
      mockStore.get.mockResolvedValue(expiredToken);
      
      const result = await tokenStorage.getValidTokenString();
      
      expect(result).toBeNull();
    });
  });

  describe('updateUserInfo', () => {
    it('should update user information in stored token', async () => {
      mockStore.get.mockResolvedValue(mockTokenData);
      
      const userUpdate = {
        name: 'Updated Name',
        plan: 'pro' as const
      };
      
      await tokenStorage.updateUserInfo(userUpdate);
      
      expect(mockStore.set).toHaveBeenCalledWith('auth_token', {
        ...mockTokenData,
        user: {
          ...mockTokenData.user,
          ...userUpdate
        }
      });
    });

    it('should throw error when no token exists to update', async () => {
      mockStore.get.mockResolvedValue(null);
      
      await expect(tokenStorage.updateUserInfo({ name: 'New Name' }))
        .rejects.toThrow('No token found to update');
    });
  });

  describe('clearAll', () => {
    it('should clear all authentication data', async () => {
      await tokenStorage.clearAll();
      
      expect(mockStore.clear).toHaveBeenCalled();
      expect(mockStore.save).toHaveBeenCalled();
    });

    it('should handle clear errors gracefully', async () => {
      mockStore.clear.mockRejectedValue(new Error('Clear error'));
      
      await expect(tokenStorage.clearAll())
        .rejects.toThrow('Failed to clear authentication data');
    });
  });
});