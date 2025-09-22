import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SecureTokenStorage } from '../secureTokenStorage';

// Mock the Tauri Store plugin
vi.mock('@tauri-apps/plugin-store', () => {
  const mockSet = vi.fn();
  const mockGet = vi.fn();
  const mockDelete = vi.fn();
  const mockClear = vi.fn();
  const mockSave = vi.fn();
  const mockLoad = vi.fn();

  const mockStoreInstance = {
    set: mockSet,
    get: mockGet,
    delete: mockDelete,
    clear: mockClear,
    save: mockSave,
  };

  const mockStoreConstructor = vi.fn(() => mockStoreInstance);

  mockLoad.mockResolvedValue(mockStoreInstance);

  return {
    Store: mockStoreConstructor,
    load: mockLoad,
    __mockStoreInstance: mockStoreInstance,
    __mockSet: mockSet,
    __mockGet: mockGet,
    __mockDelete: mockDelete,
    __mockClear: mockClear,
    __mockSave: mockSave,
    __mockLoad: mockLoad,
  };
});

describe('SecureTokenStorage', () => {
  let storage: SecureTokenStorage;
  let mockSet: any;
  let mockGet: any;
  let mockDelete: any;
  let mockSave: any;
  let mockLoad: any;

  beforeEach(async () => {
    // Get mock functions from the mocked module
    const mockModule = await import('@tauri-apps/plugin-store');
    mockSet = (mockModule as any).__mockSet;
    mockGet = (mockModule as any).__mockGet;
    mockDelete = (mockModule as any).__mockDelete;
    mockSave = (mockModule as any).__mockSave;
    mockLoad = (mockModule as any).__mockLoad;

    // Clear all mocks
    vi.clearAllMocks();

    // Create storage instance
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
      expect(mockLoad).toHaveBeenCalledWith('secure-tokens.dat');
    });

    it('should create separate instances', () => {
      const storage1 = new SecureTokenStorage();
      const storage2 = new SecureTokenStorage();
      expect(storage1).not.toBe(storage2);
    });
  });

  describe('token storage', () => {
    it('should store access token successfully', async () => {
      const token = 'test-access-token';
      mockSet.mockResolvedValue(undefined);
      mockSave.mockResolvedValue(undefined);

      await storage.storeAccessToken(token);

      expect(mockSet).toHaveBeenCalledWith('access_token', token);
      expect(mockSave).toHaveBeenCalled();
    });

    it('should store token info successfully', async () => {
      const tokenInfo = {
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        tokenType: 'Bearer',
      };
      mockSet.mockResolvedValue(undefined);
      mockSave.mockResolvedValue(undefined);

      await storage.storeTokenInfo(tokenInfo);

      expect(mockSet).toHaveBeenCalledWith('access_token', tokenInfo.accessToken);
      expect(mockSet).toHaveBeenCalledWith('refresh_token', tokenInfo.refreshToken);
      expect(mockSet).toHaveBeenCalledWith('token_metadata', {
        accessToken: tokenInfo.accessToken,
        refreshToken: tokenInfo.refreshToken,
        expiresAt: tokenInfo.expiresAt,
        tokenType: tokenInfo.tokenType,
      });
      expect(mockSave).toHaveBeenCalled();
    });

    it('should retrieve access token', async () => {
      const token = 'stored-token';
      mockGet.mockResolvedValue(token);

      const result = await storage.getAccessToken();

      expect(result).toBe(token);
      expect(mockGet).toHaveBeenCalledWith('access_token');
    });

    it('should return null for missing token', async () => {
      mockGet.mockResolvedValue(null);

      const result = await storage.getAccessToken();

      expect(result).toBeNull();
    });

    it('should clear access token', async () => {
      mockDelete.mockResolvedValue(undefined);
      mockSave.mockResolvedValue(undefined);

      await storage.clearAccessToken();

      expect(mockDelete).toHaveBeenCalledWith('access_token');
      expect(mockSave).toHaveBeenCalled();
    });

    it('should check if token is valid', async () => {
      const validToken = 'valid-token';
      const validMetadata = {
        accessToken: 'valid-token',
        expiresAt: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        tokenType: 'Bearer',
      };

      mockGet.mockImplementation((key: string) => {
        if (key === 'access_token') return Promise.resolve(validToken);
        if (key === 'token_metadata') return Promise.resolve(validMetadata);
        return Promise.resolve(null);
      });

      const isValid = await storage.hasValidAccessToken();
      expect(isValid).toBe(true);
    });

    it('should detect expired token', async () => {
      const expiredToken = 'expired-token';
      const expiredMetadata = {
        accessToken: 'expired-token',
        expiresAt: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
        tokenType: 'Bearer',
      };

      mockGet.mockImplementation((key: string) => {
        if (key === 'access_token') return Promise.resolve(expiredToken);
        if (key === 'token_metadata') return Promise.resolve(expiredMetadata);
        return Promise.resolve(null);
      });

      const isValid = await storage.hasValidAccessToken();
      expect(isValid).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle storage errors gracefully', async () => {
      mockSet.mockRejectedValueOnce(new Error('Storage error'));

      await expect(storage.storeAccessToken('test-token')).rejects.toThrow();
    });

    it('should handle retrieval errors gracefully', async () => {
      mockGet.mockRejectedValueOnce(new Error('Retrieval error'));

      const result = await storage.getAccessToken();
      expect(result).toBeNull();
    });

    it('should handle clear errors gracefully', async () => {
      mockDelete.mockRejectedValueOnce(new Error('Clear error'));

      await expect(storage.clearAccessToken()).rejects.toThrow();
    });
  });

  describe('token validation edge cases', () => {
    it('should handle missing token gracefully', async () => {
      mockGet.mockResolvedValueOnce(null);

      const isValid = await storage.hasValidAccessToken();
      expect(isValid).toBe(false);
    });

    it('should handle malformed token data', async () => {
      mockGet.mockImplementation((key: string) => {
        if (key === 'access_token') return Promise.resolve('invalid-token');
        if (key === 'token_metadata') return Promise.resolve({ invalid: 'data' });
        return Promise.resolve(null);
      });

      const isValid = await storage.hasValidAccessToken();
      expect(isValid).toBe(true); // hasValidAccessToken only checks if token exists, not format
    });

    it('should handle token without expiration', async () => {
      const tokenWithoutExpiry = 'test-token';
      const metadataWithoutExpiry = {
        accessToken: 'test-token',
        tokenType: 'Bearer',
      };
      mockGet.mockImplementation((key: string) => {
        if (key === 'access_token') return Promise.resolve(tokenWithoutExpiry);
        if (key === 'token_metadata') return Promise.resolve(metadataWithoutExpiry);
        return Promise.resolve(null);
      });

      const isValid = await storage.hasValidAccessToken();
      expect(isValid).toBe(true); // Should be valid if no expiration is set
    });
  });

  describe('configuration options', () => {
    it('should use custom store name', async () => {
      const customConfig = { storeName: 'custom-tokens.dat' };
      const customStorage = new SecureTokenStorage(customConfig);
      
      await customStorage.initialize();
      expect(mockLoad).toHaveBeenCalledWith('custom-tokens.dat');
    });

    it('should use custom expiry buffer', async () => {
      const customConfig = { tokenExpiryBuffer: 120 }; // 2 minutes
      const customStorage = new SecureTokenStorage(customConfig);
      await customStorage.initialize();

      const tokenExpiringSoon = 'test-token';
      const metadataExpiringSoon = {
        accessToken: 'test-token',
        expiresAt: Math.floor(Date.now() / 1000) + 90, // 1.5 minutes from now
        tokenType: 'Bearer',
      };
      mockGet.mockImplementation((key: string) => {
        if (key === 'access_token') return Promise.resolve(tokenExpiringSoon);
        if (key === 'token_metadata') return Promise.resolve(metadataExpiringSoon);
        return Promise.resolve(null);
      });

      const isValid = await customStorage.hasValidAccessToken();
      expect(isValid).toBe(false); // Should be invalid due to custom buffer
    });
  });
});