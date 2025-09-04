/**
 * Authenticated API Client for Desktop App
 * Handles API requests with automatic token attachment and error handling
 */

import { getSecureTokenStorage } from './secureTokenStorage';
import { getLoggingService } from './loggingService';
import { notificationService } from './notificationService';
import { getEnvironmentConfig } from './environmentService';
import { getAuthService } from './authService';
import { getTokenRefreshService } from './tokenRefreshService';

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

export interface ApiError {
  message: string;
  status: number;
  statusText: string;
  data?: any;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  requiresAuth?: boolean;
}

export class AuthenticatedApiClient {
  private baseUrl: string;
  private defaultTimeout: number = 30000;
  private tokenStorage = getSecureTokenStorage();
  private logger: any = null;
  private authService: any = null;
  private tokenRefreshService = getTokenRefreshService();

  constructor() {
    const config = getEnvironmentConfig();
    this.baseUrl = config.api.baseUrl;
    // Defer initialization of services that depend on logging
    this.initializeServices();
  }

  private initializeServices(): void {
    try {
      this.logger = getLoggingService();
      this.authService = getAuthService();
      this.logger.info('api', 'Authenticated API client initialized', { baseUrl: this.baseUrl });
    } catch (error) {
      // If logging service is not initialized yet, we'll try again later
      console.warn('[AuthenticatedApiClient] Services not ready, will initialize on first use');
    }
  }

  private ensureServicesInitialized(): void {
    if (!this.logger || !this.authService) {
      this.initializeServices();
    }
  }

  /**
   * Make an authenticated API request
   */
  async request<T = any>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    this.ensureServicesInitialized();
    
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = this.defaultTimeout,
      requiresAuth = true,
    } = options;

    const url = this.buildUrl(endpoint);
    const requestHeaders = await this.buildHeaders(headers, requiresAuth);

    this.logger?.info('api', 'Making API request', {
        method,
        url,
        requiresAuth,
        hasBody: !!body,
      });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      let response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle authentication errors with retry logic
      if (response.status === 401 && requiresAuth) {
        // Try to refresh token and retry the request once
        const refreshSuccessful = await this.attemptTokenRefresh();
        
        if (refreshSuccessful) {
          // Retry the request with the new token
          this.logger?.info('api', 'Retrying request after token refresh');
          
          // Rebuild headers with new token
          const retryHeaders = await this.buildHeaders(headers, requiresAuth);
          
          const retryResponse = await fetch(url, {
            method,
            headers: retryHeaders,
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal,
          });

          // If retry also fails with 401, proceed with logout
          if (retryResponse.status === 401) {
            await this.handleAuthenticationError();
            throw new Error('Authentication required');
          }

          // If retry succeeds, use the retry response
          if (retryResponse.ok) {
            const retryData = await this.parseResponse<T>(retryResponse);
            const retryResponseHeaders = this.extractHeaders(retryResponse);

            this.logger?.info('api', 'Request retry after token refresh successful', {
              method,
              url,
              status: retryResponse.status,
            });

            return {
              data: retryData,
              status: retryResponse.status,
              statusText: retryResponse.statusText,
              headers: retryResponseHeaders,
            };
          }

          // If retry fails with non-401 error, handle it normally
          response = retryResponse;
        } else {
          // Token refresh failed, proceed with logout
          await this.handleAuthenticationError();
          throw new Error('Authentication required');
        }
      }

      // Handle other HTTP errors
      if (!response.ok) {
        await this.handleHttpError(response, endpoint);
      }

      const responseData = await this.parseResponse<T>(response);
      const responseHeaders = this.extractHeaders(response);

      this.logger?.info('api', 'API request successful', {
        method,
        url,
        status: response.status,
      });

      return {
        data: responseData,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        this.logger?.error('api', 'API request timeout', { method, url, timeout });
        throw new Error(`Request timeout after ${timeout}ms`);
      }

      this.logger?.error('api', 'API request failed', error instanceof Error ? error : new Error(String(error)), { method, url });
      throw error;
    }
  }

  /**
   * GET request
   */
  async get<T = any>(
    endpoint: string,
    options: Omit<RequestOptions, 'method'> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T = any>(
    endpoint: string,
    body?: any,
    options: Omit<RequestOptions, 'method' | 'body'> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  /**
   * PUT request
   */
  async put<T = any>(
    endpoint: string,
    body?: any,
    options: Omit<RequestOptions, 'method' | 'body'> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(
    endpoint: string,
    options: Omit<RequestOptions, 'method'> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * PATCH request
   */
  async patch<T = any>(
    endpoint: string,
    body?: any,
    options: Omit<RequestOptions, 'method' | 'body'> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body });
  }

  /**
   * Build full URL from endpoint
   */
  private buildUrl(endpoint: string): string {
    // Remove leading slash if present
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return `${this.baseUrl}/${cleanEndpoint}`;
  }

  /**
   * Build request headers with authentication
   */
  private async buildHeaders(
    customHeaders: Record<string, string>,
    requiresAuth: boolean
  ): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    if (requiresAuth) {
      try {
        const hasValidToken = await this.tokenStorage.hasValidAccessToken();
        if (hasValidToken) {
          const accessToken = await this.tokenStorage.getAccessToken();
          if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
          }
        } else {
          this.logger?.warn('api', 'No valid access token available for authenticated request');
          throw new Error('No valid access token available');
        }
      } catch (error) {
        this.logger?.error('api', 'Failed to get access token', error instanceof Error ? error : new Error(String(error)));
        throw new Error('Failed to get access token');
      }
    }

    return headers;
  }

  /**
   * Parse response based on content type
   */
  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      return response.json();
    }
    
    if (contentType?.includes('text/')) {
      return response.text() as unknown as T;
    }
    
    // For other content types, return as blob
    return response.blob() as unknown as T;
  }

  /**
   * Extract headers from response
   */
  private extractHeaders(response: Response): Record<string, string> {
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    return headers;
  }

  /**
   * Handle authentication errors (401) with token refresh attempt
   */
  private async handleAuthenticationError(): Promise<void> {
    this.ensureServicesInitialized();
    this.logger?.warn('api', 'Authentication error - attempting token refresh');
    
    try {
      // Try to refresh the token first
      const refreshSuccessful = await this.attemptTokenRefresh();
      
      if (refreshSuccessful) {
        this.logger?.info('api', 'Token refresh successful');
        return; // Don't logout, token was refreshed
      }
      
      // If refresh failed, proceed with logout
      this.logger?.warn('api', 'Token refresh failed - clearing tokens and logging out user');
      
      // Clear stored tokens
      await this.tokenStorage.clearAllTokens();
      
      // Update auth service state
      await this.authService.logout();
      
      // Notify user
      notificationService.error(
        'Authentication Error',
        'Your session has expired. Please log in again.'
      );
    } catch (error) {
      this.logger?.error('api', 'Failed to handle authentication error', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Attempt to refresh the access token using refresh token
   */
  private async attemptTokenRefresh(): Promise<boolean> {
    try {
      this.logger?.info('api', 'Attempting to refresh access token');
      return await this.tokenRefreshService.refreshToken();
    } catch (error) {
      this.logger?.error('api', 'Token refresh failed with error', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  /**
   * Handle HTTP errors
   */
  private async handleHttpError(response: Response, endpoint: string): Promise<void> {
    let errorData: any;
    
    try {
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        errorData = await response.json();
      } else {
        errorData = await response.text();
      }
    } catch {
      errorData = 'Unknown error';
    }

    const apiError: ApiError = {
      message: errorData?.message || `HTTP ${response.status}: ${response.statusText}`,
      status: response.status,
      statusText: response.statusText,
      data: errorData,
    };

    this.logger?.error('api', 'HTTP error response', new Error(apiError.message), { endpoint, status: apiError.status, statusText: apiError.statusText });

    // Show user-friendly error notifications for common errors
    if (response.status >= 500) {
      notificationService.error(
        'Server Error',
        'A server error occurred. Please try again later.'
      );
    } else if (response.status === 403) {
      notificationService.error(
        'Access Denied',
        'You do not have permission to perform this action.'
      );
    } else if (response.status === 404) {
      notificationService.error(
        'Not Found',
        'The requested resource was not found.'
      );
    } else if (response.status >= 400 && response.status < 500) {
      notificationService.error(
        'Request Error',
        apiError.message || 'There was an error with your request.'
      );
    }

    throw apiError;
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    this.ensureServicesInitialized();
    try {
      return await this.tokenStorage.hasValidAccessToken();
    } catch (error) {
      this.logger?.error('api', 'Failed to check authentication status', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  /**
   * Get current access token
   */
  async getAccessToken(): Promise<string | null> {
    this.ensureServicesInitialized();
    try {
      return await this.tokenStorage.getAccessToken();
    } catch (error) {
      this.logger?.error('api', 'Failed to get access token', error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  /**
   * Update base URL (useful for environment changes)
   */
  updateBaseUrl(baseUrl: string): void {
    this.ensureServicesInitialized();
    this.baseUrl = baseUrl;
    this.logger?.info('api', 'Base URL updated', { baseUrl });
  }

  /**
   * Set default timeout for requests
   */
  setDefaultTimeout(timeout: number): void {
    this.ensureServicesInitialized();
    this.defaultTimeout = timeout;
    this.logger?.info('api', 'Default timeout updated', { timeout });
  }
}

// Export singleton instance
let apiClientInstance: AuthenticatedApiClient | null = null;

/**
 * Get the singleton authenticated API client instance
 */
export function getAuthenticatedApiClient(): AuthenticatedApiClient {
  if (!apiClientInstance) {
    apiClientInstance = new AuthenticatedApiClient();
  }
  return apiClientInstance;
}

// Note: Don't create the instance immediately to avoid initialization order issues
// Use getAuthenticatedApiClient() instead of a direct export