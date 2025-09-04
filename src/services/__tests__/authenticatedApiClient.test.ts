/**
 * Unit tests for AuthenticatedApiClient
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuthenticatedApiClient, getAuthenticatedApiClient } from '../authenticatedApiClient';
import { getSecureTokenStorage } from '../secureTokenStorage';
import { getLoggingService } from '../loggingService';
import { notificationService } from '../notificationService';
import { getEnvironmentConfig } from '../environmentService';
import { getAuthService } from '../authService';

// Mock dependencies
vi.mock('../secureTokenStorage');
vi.mock('../loggingService');
vi.mock('../notificationService');
vi.mock('../environmentService');
vi.mock('../authService');

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock implementations
const mockTokenStorage = {
  hasValidAccessToken: vi.fn(),
  getAccessToken: vi.fn(),
  clearAllTokens: vi.fn(),
};

const mockLoggingService = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
};

const mockNotificationService = {
  error: vi.fn(),
  success: vi.fn(),
  info: vi.fn(),
};

const mockEnvironmentConfig = {
  api: {
    baseUrl: 'https://api.example.com',
  },
};

const mockAuthService = {
  logout: vi.fn(),
};

describe('AuthenticatedApiClient', () => {
  let apiClient: AuthenticatedApiClient;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mock implementations
    vi.mocked(getSecureTokenStorage).mockReturnValue(mockTokenStorage as any);
    vi.mocked(getLoggingService).mockReturnValue(mockLoggingService as any);
    Object.assign(notificationService, mockNotificationService);
    vi.mocked(getEnvironmentConfig).mockReturnValue(mockEnvironmentConfig as any);
    vi.mocked(getAuthService).mockReturnValue(mockAuthService as any);
    
    // Default mock responses
    mockTokenStorage.hasValidAccessToken.mockResolvedValue(true);
    mockTokenStorage.getAccessToken.mockResolvedValue('test-access-token');
    mockTokenStorage.clearAllTokens.mockResolvedValue(undefined);
    mockAuthService.logout.mockResolvedValue(undefined);
    
    // Create new API client instance
    apiClient = new AuthenticatedApiClient();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with base URL from environment config', () => {
      expect(mockLoggingService.info).toHaveBeenCalledWith(
        'api',
        'Authenticated API client initialized',
        { baseUrl: 'https://api.example.com' }
      );
    });
  });

  describe('request method', () => {
    it('should make successful authenticated GET request', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        json: vi.fn().mockResolvedValue({ data: 'test' }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await apiClient.request('/test-endpoint');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/test-endpoint',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-access-token',
          },
          body: undefined,
          signal: expect.any(AbortSignal),
        }
      );

      expect(result).toEqual({
        data: { data: 'test' },
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
      });
    });

    it('should make successful unauthenticated request', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        json: vi.fn().mockResolvedValue({ data: 'test' }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await apiClient.request('/public-endpoint', { requiresAuth: false });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/public-endpoint',
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            // No Authorization header
          },
        })
      );

      expect(result.data).toEqual({ data: 'test' });
    });

    it('should handle POST request with body', async () => {
      const mockResponse = {
        ok: true,
        status: 201,
        statusText: 'Created',
        headers: new Map([['content-type', 'application/json']]),
        json: vi.fn().mockResolvedValue({ id: 1 }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const requestBody = { name: 'test' };
      const result = await apiClient.request('/create', {
        method: 'POST',
        body: requestBody,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/create',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestBody),
        })
      );

      expect(result.data).toEqual({ id: 1 });
    });

    it('should handle custom headers', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map(),
        json: vi.fn().mockResolvedValue({}),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await apiClient.request('/test', {
        headers: {
          'X-Custom-Header': 'custom-value',
          'Content-Type': 'application/xml', // Should override default
        },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/xml',
            'X-Custom-Header': 'custom-value',
            'Authorization': 'Bearer test-access-token',
          },
        })
      );
    });
  });

  describe('authentication handling', () => {
    it('should handle 401 authentication error', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Map(),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await expect(apiClient.request('/protected')).rejects.toThrow('Authentication required');

      expect(mockTokenStorage.clearAllTokens).toHaveBeenCalled();
      expect(mockAuthService.logout).toHaveBeenCalled();
      expect(mockNotificationService.error).toHaveBeenCalledWith(
        'Authentication Error',
        'Your session has expired. Please log in again.'
      );
    });

    it('should throw error when no valid token for authenticated request', async () => {
      mockTokenStorage.hasValidAccessToken.mockResolvedValue(false);

      await expect(apiClient.request('/protected')).rejects.toThrow('No valid access token available');

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should throw error when token retrieval fails', async () => {
      mockTokenStorage.hasValidAccessToken.mockResolvedValue(true);
      mockTokenStorage.getAccessToken.mockRejectedValue(new Error('Token retrieval failed'));

      await expect(apiClient.request('/protected')).rejects.toThrow('Failed to get access token');

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('HTTP error handling', () => {
    it('should handle 404 error', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Map([['content-type', 'application/json']]),
        json: vi.fn().mockResolvedValue({ message: 'Resource not found' }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await expect(apiClient.request('/nonexistent')).rejects.toMatchObject({
        status: 404,
        statusText: 'Not Found',
        message: 'Resource not found',
      });

      expect(mockNotificationService.error).toHaveBeenCalledWith(
        'Not Found',
        'The requested resource was not found.'
      );
    });

    it('should handle 500 server error', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Map([['content-type', 'application/json']]),
        json: vi.fn().mockResolvedValue({ message: 'Server error' }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await expect(apiClient.request('/error')).rejects.toMatchObject({
        status: 500,
        message: 'Server error',
      });

      expect(mockNotificationService.error).toHaveBeenCalledWith(
        'Server Error',
        'A server error occurred. Please try again later.'
      );
    });

    it('should handle 403 forbidden error', async () => {
      const mockResponse = {
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        headers: new Map(),
        text: vi.fn().mockResolvedValue('Access denied'),
      };
      mockResponse.headers.get = vi.fn().mockReturnValue('text/plain');
      mockFetch.mockResolvedValue(mockResponse);

      await expect(apiClient.request('/forbidden')).rejects.toMatchObject({
        status: 403,
        message: 'HTTP 403: Forbidden',
      });

      expect(mockNotificationService.error).toHaveBeenCalledWith(
        'Access Denied',
        'You do not have permission to perform this action.'
      );
    });
  });

  describe('response parsing', () => {
    it('should parse JSON response', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        json: vi.fn().mockResolvedValue({ data: 'json' }),
      };
      mockResponse.headers.get = vi.fn().mockReturnValue('application/json');
      mockFetch.mockResolvedValue(mockResponse);

      const result = await apiClient.request('/json');
      expect(result.data).toEqual({ data: 'json' });
    });

    it('should parse text response', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'text/plain']]),
        text: vi.fn().mockResolvedValue('plain text'),
      };
      mockResponse.headers.get = vi.fn().mockReturnValue('text/plain');
      mockFetch.mockResolvedValue(mockResponse);

      const result = await apiClient.request('/text');
      expect(result.data).toBe('plain text');
    });

    it('should parse blob response for other content types', async () => {
      const mockBlob = new Blob(['binary data']);
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/octet-stream']]),
        blob: vi.fn().mockResolvedValue(mockBlob),
      };
      mockResponse.headers.get = vi.fn().mockReturnValue('application/octet-stream');
      mockFetch.mockResolvedValue(mockResponse);

      const result = await apiClient.request('/binary');
      expect(result.data).toBe(mockBlob);
    });
  });

  describe('timeout handling', () => {
    it('should handle request timeout', async () => {
      // Mock fetch to never resolve
      mockFetch.mockImplementation(() => new Promise(() => {}));

      await expect(
        apiClient.request('/slow', { timeout: 100 })
      ).rejects.toThrow('Request timeout after 100ms');
    });
  });

  describe('convenience methods', () => {
    beforeEach(() => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map(),
        json: vi.fn().mockResolvedValue({ success: true }),
      };
      mockFetch.mockResolvedValue(mockResponse);
    });

    it('should make GET request', async () => {
      await apiClient.get('/test');
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should make POST request', async () => {
      const body = { data: 'test' };
      await apiClient.post('/test', body);
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(body),
        })
      );
    });

    it('should make PUT request', async () => {
      const body = { data: 'test' };
      await apiClient.put('/test', body);
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(body),
        })
      );
    });

    it('should make DELETE request', async () => {
      await apiClient.delete('/test');
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should make PATCH request', async () => {
      const body = { data: 'test' };
      await apiClient.patch('/test', body);
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(body),
        })
      );
    });
  });

  describe('utility methods', () => {
    it('should check authentication status', async () => {
      mockTokenStorage.hasValidAccessToken.mockResolvedValue(true);
      
      const isAuth = await apiClient.isAuthenticated();
      expect(isAuth).toBe(true);
    });

    it('should handle authentication check errors', async () => {
      mockTokenStorage.hasValidAccessToken.mockRejectedValue(new Error('Check failed'));
      
      const isAuth = await apiClient.isAuthenticated();
      expect(isAuth).toBe(false);
      expect(mockLoggingService.error).toHaveBeenCalled();
    });

    it('should get access token', async () => {
      mockTokenStorage.getAccessToken.mockResolvedValue('test-token');
      
      const token = await apiClient.getAccessToken();
      expect(token).toBe('test-token');
    });

    it('should handle get access token errors', async () => {
      mockTokenStorage.getAccessToken.mockRejectedValue(new Error('Get failed'));
      
      const token = await apiClient.getAccessToken();
      expect(token).toBeNull();
      expect(mockLoggingService.error).toHaveBeenCalled();
    });

    it('should update base URL', () => {
      const newBaseUrl = 'https://new-api.example.com';
      apiClient.updateBaseUrl(newBaseUrl);
      
      expect(mockLoggingService.info).toHaveBeenCalledWith(
        'api',
        'Base URL updated',
        { baseUrl: newBaseUrl }
      );
    });

    it('should set default timeout', () => {
      const newTimeout = 5000;
      apiClient.setDefaultTimeout(newTimeout);
      
      expect(mockLoggingService.info).toHaveBeenCalledWith(
        'api',
        'Default timeout updated',
        { timeout: newTimeout }
      );
    });
  });

  describe('URL building', () => {
    it('should build URL correctly with leading slash', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map(),
        json: vi.fn().mockResolvedValue({}),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await apiClient.request('/api/test');
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/test',
        expect.any(Object)
      );
    });

    it('should build URL correctly without leading slash', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map(),
        json: vi.fn().mockResolvedValue({}),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await apiClient.request('api/test');
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/test',
        expect.any(Object)
      );
    });
  });

  describe('singleton pattern', () => {
    it('should return same instance from getAuthenticatedApiClient', () => {
      const instance1 = getAuthenticatedApiClient();
      const instance2 = getAuthenticatedApiClient();
      
      expect(instance1).toBe(instance2);
    });
  });
});