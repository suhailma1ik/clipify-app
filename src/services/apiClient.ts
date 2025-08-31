import { ApiConfig } from '../types/environment';
import { fetch } from '@tauri-apps/plugin-http';

/**
 * HTTP method types
 */
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/**
 * Request options interface
 */
interface RequestOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: any;
}

/**
 * API response interface
 */
interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
}

/**
 * API client service for making HTTP requests using native fetch
 */
export class ApiClientService {
  private config: ApiConfig;
  private readonly defaultHeaders: Record<string, string>;
  private jwtToken: string | null = null;

  constructor(config: ApiConfig) {
    this.config = config;
    this.defaultHeaders = {
      'Content-Type': 'application/json'
    };
    console.log('[ApiClientService] Initialized with config:', config);
  }

  /**
   * Set JWT token for authenticated requests
   * @param token - JWT token
   */
  setJwtToken(token: string | null): void {
    this.jwtToken = token;
    console.log('[ApiClientService] JWT token updated:', token ? 'Token set' : 'Token cleared');
  }

  /**
   * Get current JWT token
   * @returns Current JWT token or null
   */
  getJwtToken(): string | null {
    return this.jwtToken;
  }

  /**
   * Make an HTTP request using native fetch
   * @param endpoint - API endpoint (relative to base URL)
   * @param options - Request options
   * @returns Promise resolving to API response
   */
  async request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body
    } = options;

    console.log(`[ApiClientService] Making ${method} request to:`, endpoint);
    console.log('[ApiClientService] Request options:', { method, hasBody: !!body });

    try {
      // Build headers
      const requestHeaders = {
        ...this.defaultHeaders,
        ...headers
      };

      // Add JWT token for protected endpoints
      if (this.jwtToken && (endpoint.includes('/protected/') || headers['Authorization'])) {
        requestHeaders['Authorization'] = `Bearer ${this.jwtToken}`;
        console.log('[ApiClientService] JWT token added to request headers');
      }

      // Build request URL
      const url = `${this.config.baseUrl}${endpoint}`;
      console.log('[ApiClientService] Request URL:', url);

      // Prepare request body
      let requestBody: string | undefined;
      if (body && method !== 'GET') {
        if (typeof body === 'string') {
          requestBody = body;
        } else {
          requestBody = JSON.stringify(body);
        }
        console.log('[ApiClientService] Request body prepared');
      }

      // Make the request using Tauri's HTTP client
      console.log('[ApiClientService] Making request with Tauri HTTP client:', {
        url,
        method,
        headers: requestHeaders,
        hasBody: !!requestBody
      });
      
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: requestBody
      });

      console.log('[ApiClientService] Response status:', response.status, response.statusText);

      // Get response data
      let data: T;
      try {
        data = await response.json();
      } catch (jsonError) {
        // If JSON parsing fails, try to get text
        try {
          data = await response.text() as any;
        } catch (textError) {
          console.error('[ApiClientService] Failed to parse response:', jsonError, textError);
          data = null as any;
        }
      }

      // Handle non-2xx responses
      if (!response.ok) {
        console.error('[ApiClientService] Request failed:', response.status, data);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log('[ApiClientService] Request successful');
      return {
        data,
        status: response.status,
        statusText: response.statusText || 'OK'
      };
    } catch (error) {
      console.error('[ApiClientService] Request error:', error);
      throw error;
    }
  }

  /**
   * Make a GET request
   * @param endpoint - API endpoint
   * @returns Promise resolving to API response
   */
  async get<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  /**
   * Make a POST request
   * @param endpoint - API endpoint
   * @param body - Request body
   * @returns Promise resolving to API response
   */
  async post<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'POST', body });
  }

  /**
   * Make a PUT request
   * @param endpoint - API endpoint
   * @param body - Request body
   * @returns Promise resolving to API response
   */
  async put<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PUT', body });
  }

  /**
   * Make a DELETE request
   * @param endpoint - API endpoint
   * @returns Promise resolving to API response
   */
  async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  /**
   * Make a PATCH request
   * @param endpoint - API endpoint
   * @param body - Request body
   * @returns Promise resolving to API response
   */
  async patch<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PATCH', body });
  }

  /**
   * Test API connectivity
   * @returns Promise resolving to true if API is reachable
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('[ApiClientService] Testing API connectivity');
      await this.get('/health');
      console.log('[ApiClientService] API connectivity test successful');
      return true;
    } catch (error) {
      console.error('[ApiClientService] API connectivity test failed:', error);
      return false;
    }
  }

  /**
   * Process text with AI provider
   * @param text - Text to process
   * @param provider - AI provider to use (optional)
   * @returns Promise resolving to processed text
   */
  async processText(text: string, provider?: string): Promise<ApiResponse<any>> {
    const body = { text, ...(provider && { provider }) };
    return this.post('/api/v1/process', body);
  }

  /**
   * Rephrase text with style options
   * @param text - Text to rephrase
   * @param style - Rephrasing style (optional)
   * @param context - Context for rephrasing (optional)
   * @param target_audience - Target audience (optional)
   * @param preserve_length - Whether to preserve length (optional)
   * @returns Promise resolving to rephrased text
   */
  async rephraseText(
    text: string,
    style?: string,
    context?: string,
    target_audience?: string,
    preserve_length?: boolean
  ): Promise<ApiResponse<any>> {
    if (!this.jwtToken) {
      throw new Error('JWT token is required for rephrasing');
    }

    const body = {
      text,
      ...(style && { style }),
      ...(context && { context }),
      ...(target_audience && { target_audience }),
      ...(preserve_length !== undefined && { preserve_length })
    };
    return this.post('/api/v1/protected/rephrase', body);
  }

  /**
   * Get available rephrasing styles
   * @returns Promise resolving to available styles
   */
  async getRephraseStyles(): Promise<ApiResponse<any>> {
    return this.get('/api/v1/rephrase/styles');
  }

  /**
   * Get rephrasing service status
   * @returns Promise resolving to service status
   */
  async getRephraseStatus(): Promise<ApiResponse<any>> {
    return this.get('/api/v1/rephrase/status');
  }
}

// Create and export singleton instance
// Will be initialized when environment service is ready
let apiClient: ApiClientService | null = null;

/**
 * Initialize API client with configuration
 * @param config - API configuration
 */
export const initializeApiClient = (config: ApiConfig): void => {
  apiClient = new ApiClientService(config);
  console.log('[ApiClientService] Singleton instance initialized');
};

/**
 * Get the API client instance
 * @returns API client instance
 * @throws Error if not initialized
 */
export const getApiClient = (): ApiClientService => {
  if (!apiClient) {
    throw new Error('API client not initialized. Call initializeApiClient() first.');
  }
  return apiClient;
};

// ApiClientService is already exported as a class declaration above