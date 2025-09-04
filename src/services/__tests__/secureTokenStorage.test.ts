/**
 * Unit tests for SecureTokenStorage service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SecureTokenStorage, TokenInfo, getSecureTokenStorage } from '../secureTokenStorage';

// Mock the Tauri store plugin
const mockStore = {
  set: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
  save: vi.fn(),
};

vi.mock('@tauri-apps/plugin-store', () => ({
  Store: vi.fn(() => mockStore),
}));

describe('SecureTokenStorage', () => {
  let storage: SecureTokenStorage;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create new storage instance
    storage = new SecureTokenStorage();
    await storage.initialize();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      const newStorage = new SecureTokenStorage();
      await expect(newStorage.initialize()).resolves.not.toThrow();
    });

    it('should use default configuration', () => {
      const newStorage = new SecureTokenStorage();
      expect(newStorage).toBeDefined();
    });

    it('should accept custom configuration', () => {
      const config = {
        storeName: 'custom-store.dat',
        tokenExpiryBuffer: 600
      };
      const newStorage = new SecureTokenStorage(config);
      expect(newStorage).toBeDefined();
    });
  });

  describe('token validation', () => {
    it('should reject empty tokens', async () => {
      await expect(storage.storeAccessToken('')).rejects.toThrow('Invalid token');
    });

    it('should reject null tokens', async () => {
      await expect(storage.storeAccessToken(null as any)).rejects.toThrow('Invalid token');
    });

    it('should reject whitespace-only tokens', async () => {
      await expect(storage.storeAccessToken('   ')).rejects.toThrow('Invalid token');
    });

    it('should accept valid token strings', async () => {
      mockStore.set.mockResolvedValue(undefined);
      mockStore.save.mockResolvedValue(undefined);
      
      await expect(storage.storeAccessToken('valid-token')).resolves.not.toThrow();
      expect(mockStore.set).toHaveBeenCalledWith('access_token', 'valid-token');
      expect(mockStore.save).toHaveBeenCalled();
    });

    it('should validate JWT format', async () => {
      mockStore.set.mockResolvedValue(undefined);
      mockStore.save.mockResolvedValue(undefined);
      
      // Valid JWT format (3 parts)
      await expect(storage.storeAccessToken('header.payload.signature')).resolves.not.toThrow();
      
      // Invalid JWT format (2 parts)
      await expect(storage.storeAccessToken('header.payload')).rejects.toThrow('Invalid JWT format');
    });
  });

  describe('access token operations', () => {
    it('should store access token successfully', async () => {
      mockStore.set.mockResolvedValue(undefined);
      mockStore.save.mockResolvedValue(undefined);
      
      const token = 'test-access-token';
      await storage.storeAccessToken(token);
      
      expect(mockStore.set).toHaveBeenCalledWith('access_token', token);
      expect(mockStore.save).toHaveBeenCalled();
    });

    it('should store access token with metadata', async () => {
      mockStore.set.mockResolvedValue(undefined);
      mockStore.save.mockResolvedValue(undefined);
      
      const token = 'test-access-token';
      const metadata = {
        tokenType: 'Bearer',
        scope: 'read write',
        userId: 'user123',
        expiresAt: Math.floor(Date.now() / 1000) + 3600
      };
      
      await storage.storeAccessToken(token, metadata);
      
      expect(mockStore.set).toHaveBeenCalledWith('access_token', token);
      expect(mockStore.set).toHaveBeenCalledWith('token_metadata', expect.objectContaining({
        accessToken: token,
        ...metadata
      }));
      expect(mockStore.save).toHaveBeenCalled();
    });

    it('should retrieve access token successfully', async () => {
      const token = 'test-access-token';
      mockStore.get.mockResolvedValue(token);
      
      const result = await storage.getAccessToken();
      
      expect(result).toBe(token);
      expect(mockStore.get).toHaveBeenCalledWith('access_token');
    });

    it('should return null when no access token exists', async () => {
      mockStore.get.mockResolvedValue(null);
      
      const result = await storage.getAccessToken();
      
      expect(result).toBeNull();
    });

    it('should return null for expired access token', async () => {
      const token = 'expired-token';
      const expiredMetadata = {
        accessToken: token,
        expiresAt: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
      };
      
      mockStore.get.mockImplementation((key) => {
        if (key === 'access_token') return Promise.resolve(token);
        if (key === 'token_metadata') return Promise.resolve(expiredMetadata);
        return Promise.resolve(null);
      });
      
      const result = await storage.getAccessToken();
      
      expect(result).toBeNull();
    });

    it('should clear access token successfully', async () => {
      mockStore.delete.mockResolvedValue(undefined);
      mockStore.save.mockResolvedValue(undefined);
      
      await storage.clearAccessToken();
      
      expect(mockStore.delete).toHaveBeenCalledWith('access_token');
      expect(mockStore.save).toHaveBeenCalled();
    });
  });

  describe('refresh token operations', () => {
    it('should store refresh token successfully', async () => {
      mockStore.set.mockResolvedValue(undefined);
      mockStore.save.mockResolvedValue(undefined);
      
      const refreshToken = 'test-refresh-token';
      await storage.storeRefreshToken(refreshToken);
      
      expect(mockStore.set).toHaveBeenCalledWith('refresh_token', refreshToken);
      expect(mockStore.save).toHaveBeenCalled();
    });

    it('should retrieve refresh token successfully', async () => {
      const refreshToken = 'test-refresh-token';
      mockStore.get.mockResolvedValue(refreshToken);
      
      const result = await storage.getRefreshToken();
      
      expect(result).toBe(refreshToken);
      expect(mockStore.get).toHaveBeenCalledWith('refresh_token');
    });

    it('should return null when no refresh token exists', async () => {
      mockStore.get.mockResolvedValue(null);
      
      const result = await storage.getRefreshToken();
      
      expect(result).toBeNull();
    });

    it('should clear refresh token successfully', async () => {
      mockStore.delete.mockResolvedValue(undefined);
      mockStore.save.mockResolvedValue(undefined);
      
      await storage.clearRefreshToken();
      
      expect(mockStore.delete).toHaveBeenCalledWith('refresh_token');
      expect(mockStore.save).toHaveBeenCalled();
    });
  });

  describe('complete token information operations', () => {
    it('should store complete token information', async () => {
      mockStore.set.mockResolvedValue(undefined);
      mockStore.save.mockResolvedValue(undefined);
      
      const tokenInfo: TokenInfo = {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        tokenType: 'Bearer',
        scope: 'read write',
        userId: 'user123',
        expiresAt: Math.floor(Date.now() / 1000) + 3600
      };
      
      await storage.storeTokenInfo(tokenInfo);
      
      expect(mockStore.set).toHaveBeenCalledWith('access_token', tokenInfo.accessToken);
      expect(mockStore.set).toHaveBeenCalledWith('refresh_token', tokenInfo.refreshToken);
      expect(mockStore.set).toHaveBeenCalledWith('token_metadata', tokenInfo);
      expect(mockStore.save).toHaveBeenCalled();
    });

    it('should retrieve token metadata successfully', async () => {
      const metadata: TokenInfo = {
        accessToken: 'test-access-token',
        tokenType: 'Bearer',
        scope: 'read write',
        userId: 'user123',
        expiresAt: Math.floor(Date.now() / 1000) + 3600
      };
      
      mockStore.get.mockResolvedValue(metadata);
      
      const result = await storage.getTokenMetadata();
      
      expect(result).toEqual(metadata);
      expect(mockStore.get).toHaveBeenCalledWith('token_metadata');
    });
  });

  describe('token validation status', () => {
    it('should return valid status for valid token', async () => {
      const token = 'valid-token';
      const metadata = {
        accessToken: token,
        expiresAt: Math.floor(Date.now() / 1000) + 3600 // Expires in 1 hour
      };
      
      mockStore.get.mockImplementation((key) => {
        if (key === 'access_token') return Promise.resolve(token);
        if (key === 'token_metadata') return Promise.resolve(metadata);
        return Promise.resolve(null);
      });
      
      const result = await storage.getTokenValidationStatus();
      
      expect(result.isValid).toBe(true);
      expect(result.isExpired).toBe(false);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid status for expired token', async () => {
      const token = 'expired-token';
      const metadata = {
        accessToken: token,
        expiresAt: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
      };
      
      mockStore.get.mockImplementation((key) => {
        if (key === 'access_token') return Promise.resolve(token);
        if (key === 'token_metadata') return Promise.resolve(metadata);
        return Promise.resolve(null);
      });
      
      const result = await storage.getTokenValidationStatus();
      
      expect(result.isValid).toBe(false);
      expect(result.isExpired).toBe(true);
    });

    it('should return invalid status when no token exists', async () => {
      mockStore.get.mockResolvedValue(null);
      
      const result = await storage.getTokenValidationStatus();
      
      expect(result.isValid).toBe(false);
      expect(result.isExpired).toBe(false);
      expect(result.errors).toContain('No access token found');
    });
  });

  describe('token existence checks', () => {
    it('should correctly check for valid access token', async () => {
      const token = 'valid-token';
      const metadata = {
        accessToken: token,
        expiresAt: Math.floor(Date.now() / 1000) + 3600
      };
      
      mockStore.get.mockImplementation((key) => {
        if (key === 'access_token') return Promise.resolve(token);
        if (key === 'token_metadata') return Promise.resolve(metadata);
        return Promise.resolve(null);
      });
      
      const result = await storage.hasValidAccessToken();
      
      expect(result).toBe(true);
    });

    it('should correctly check for refresh token', async () => {
      mockStore.get.mockResolvedValue('refresh-token');
      
      const result = await storage.hasRefreshToken();
      
      expect(result).toBe(true);
    });

    it('should return false when tokens do not exist', async () => {
      mockStore.get.mockResolvedValue(null);
      
      const hasAccess = await storage.hasValidAccessToken();
      const hasRefresh = await storage.hasRefreshToken();
      
      expect(hasAccess).toBe(false);
      expect(hasRefresh).toBe(false);
    });
  });

  describe('user information operations', () => {
    it('should store user information successfully', async () => {
      mockStore.set.mockResolvedValue(undefined);
      mockStore.save.mockResolvedValue(undefined);
      
      const userInfo = {
        id: 'user123',
        email: 'user@example.com',
        name: 'Test User'
      };
      
      await storage.storeUserInfo(userInfo);
      
      expect(mockStore.set).toHaveBeenCalledWith('user_info', userInfo);
      expect(mockStore.save).toHaveBeenCalled();
    });

    it('should retrieve user information successfully', async () => {
      const userInfo = {
        id: 'user123',
        email: 'user@example.com',
        name: 'Test User'
      };
      
      mockStore.get.mockResolvedValue(userInfo);
      
      const result = await storage.getUserInfo();
      
      expect(result).toEqual(userInfo);
      expect(mockStore.get).toHaveBeenCalledWith('user_info');
    });
  });

  describe('clear all tokens', () => {
    it('should clear all tokens and metadata', async () => {
      mockStore.delete.mockResolvedValue(undefined);
      mockStore.save.mockResolvedValue(undefined);
      
      await storage.clearAllTokens();
      
      expect(mockStore.delete).toHaveBeenCalledWith('access_token');
      expect(mockStore.delete).toHaveBeenCalledWith('refresh_token');
      expect(mockStore.delete).toHaveBeenCalledWith('token_metadata');
      expect(mockStore.delete).toHaveBeenCalledWith('user_info');
      expect(mockStore.save).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle storage errors gracefully', async () => {
      mockStore.set.mockRejectedValue(new Error('Storage error'));
      
      await expect(storage.storeAccessToken('token')).rejects.toThrow('Failed to store access token');
    });

    it('should handle retrieval errors gracefully', async () => {
      mockStore.get.mockRejectedValue(new Error('Retrieval error'));
      
      const result = await storage.getAccessToken();
      
      expect(result).toBeNull();
    });

    it('should handle clear errors gracefully', async () => {
      mockStore.delete.mockRejectedValue(new Error('Delete error'));
      
      await expect(storage.clearAccessToken()).rejects.toThrow('Failed to clear access token');
    });
  });

  describe('singleton pattern', () => {
    it('should return same instance from getSecureTokenStorage', () => {
      const instance1 = getSecureTokenStorage();
      const instance2 = getSecureTokenStorage();
      
      expect(instance1).toBe(instance2);
    });
  });
});