/**
 * Secure Token Storage Service
 * 
 * This service provides secure token storage for the desktop application using Tauri's
 * secure storage capabilities. It handles access tokens, refresh tokens, and token metadata
 * with proper validation and error handling.
 */

import { Store, load } from '@tauri-apps/plugin-store';

/**
 * Token information interface
 */
export interface TokenInfo {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string;
  scope?: string;
  userId?: string;
}

/**
 * Token validation result interface
 */
export interface TokenValidationResult {
  isValid: boolean;
  isExpired: boolean;
  expiresIn?: number;
  errors: string[];
}

/**
 * Secure token storage configuration
 */
export interface SecureTokenStorageConfig {
  storeName: string;
  encryptionKey?: string;
  tokenExpiryBuffer: number; // Buffer time in seconds before considering token expired
}

/**
 * Default configuration for secure token storage
 */
const DEFAULT_CONFIG: SecureTokenStorageConfig = {
  storeName: 'secure-tokens.dat',
  tokenExpiryBuffer: 300 // 5 minutes buffer
};

/**
 * Storage keys for different token types
 */
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  TOKEN_METADATA: 'token_metadata',
  USER_INFO: 'user_info'
} as const;

/**
 * Secure Token Storage Service Class
 */
export class SecureTokenStorage {
  private store: Store | null = null;
  private config: SecureTokenStorageConfig;
  private isInitialized = false;

  constructor(config: Partial<SecureTokenStorageConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the secure storage
   */
  async initialize(): Promise<void> {
    try {
      console.log('[SecureTokenStorage] Initializing secure token storage');
      this.store = await load(this.config.storeName);
      this.isInitialized = true;
      console.log('[SecureTokenStorage] Secure token storage initialized successfully');
    } catch (error) {
      console.error('[SecureTokenStorage] Failed to initialize secure storage:', error);
      throw new Error(`Failed to initialize secure token storage: ${error}`);
    }
  }

  /**
   * Ensure storage is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized || !this.store) {
      await this.initialize();
    }
    if (!this.store) {
      throw new Error('Failed to initialize store');
    }
  }

  /**
   * Validate token format and content
   */
  private validateToken(token: string): TokenValidationResult {
    const errors: string[] = [];
    
    if (!token || typeof token !== 'string') {
      errors.push('Token must be a non-empty string');
    }
    
    if (token && token.trim().length === 0) {
      errors.push('Token cannot be empty or whitespace only');
    }
    
    // Basic JWT format validation (if it looks like a JWT)
    if (token && token.includes('.')) {
      const parts = token.split('.');
      if (parts.length !== 3) {
        errors.push('Invalid JWT format: must have 3 parts separated by dots');
      }
    }
    
    return {
      isValid: errors.length === 0,
      isExpired: false, // Will be checked separately with metadata
      errors
    };
  }

  /**
   * Validate token expiration
   */
  private validateTokenExpiration(expiresAt?: number): { isExpired: boolean; expiresIn?: number } {
    if (!expiresAt) {
      return { isExpired: false };
    }
    
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = expiresAt - now;
    const isExpired = expiresIn <= this.config.tokenExpiryBuffer;
    
    return { isExpired, expiresIn };
  }

  /**
   * Store access token securely
   */
  async storeAccessToken(token: string, metadata?: Partial<TokenInfo>): Promise<void> {
    await this.ensureInitialized();
    
    console.log('[SecureTokenStorage] Storing access token');
    
    // Validate token
    const validation = this.validateToken(token);
    if (!validation.isValid) {
      const errorMessage = `Invalid token: ${validation.errors.join(', ')}`;
      console.error('[SecureTokenStorage]', errorMessage);
      throw new Error(errorMessage);
    }
    
    try {
      // Store the token
      await this.store!.set(STORAGE_KEYS.ACCESS_TOKEN, token);
      
      // Store metadata if provided
      if (metadata) {
        const tokenMetadata: TokenInfo = {
          accessToken: token,
          ...metadata,
          // Add timestamp for when token was stored
          ...(metadata.expiresAt ? {} : { expiresAt: Math.floor(Date.now() / 1000) + 86400 }) // Default 1 day if not provided
        };
        
        await this.store!.set(STORAGE_KEYS.TOKEN_METADATA, tokenMetadata);
        console.log('[SecureTokenStorage] Token metadata stored');
      }
      
      // Save changes to disk
      await this.store!.save();
      
      console.log('[SecureTokenStorage] Access token stored successfully');
    } catch (error) {
      console.error('[SecureTokenStorage] Failed to store access token:', error);
      throw new Error(`Failed to store access token: ${error}`);
    }
  }

  /**
   * Store refresh token securely
   */
  async storeRefreshToken(refreshToken: string): Promise<void> {
    await this.ensureInitialized();
    
    console.log('[SecureTokenStorage] Storing refresh token');
    
    // Validate token
    const validation = this.validateToken(refreshToken);
    if (!validation.isValid) {
      const errorMessage = `Invalid refresh token: ${validation.errors.join(', ')}`;
      console.error('[SecureTokenStorage]', errorMessage);
      throw new Error(errorMessage);
    }
    
    try {
      await this.store!.set(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      await this.store!.save();
      
      console.log('[SecureTokenStorage] Refresh token stored successfully');
    } catch (error) {
      console.error('[SecureTokenStorage] Failed to store refresh token:', error);
      throw new Error(`Failed to store refresh token: ${error}`);
    }
  }

  /**
   * Store complete token information
   */
  async storeTokenInfo(tokenInfo: TokenInfo): Promise<void> {
    await this.ensureInitialized();
    
    console.log('[SecureTokenStorage] Storing complete token information');
    
    // Validate access token
    const validation = this.validateToken(tokenInfo.accessToken);
    if (!validation.isValid) {
      const errorMessage = `Invalid access token: ${validation.errors.join(', ')}`;
      console.error('[SecureTokenStorage]', errorMessage);
      throw new Error(errorMessage);
    }
    
    // Validate refresh token if provided
    if (tokenInfo.refreshToken) {
      const refreshValidation = this.validateToken(tokenInfo.refreshToken);
      if (!refreshValidation.isValid) {
        const errorMessage = `Invalid refresh token: ${refreshValidation.errors.join(', ')}`;
        console.error('[SecureTokenStorage]', errorMessage);
        throw new Error(errorMessage);
      }
    }
    
    try {
      // Store all token information
      await this.store!.set(STORAGE_KEYS.ACCESS_TOKEN, tokenInfo.accessToken);
      
      if (tokenInfo.refreshToken) {
        await this.store!.set(STORAGE_KEYS.REFRESH_TOKEN, tokenInfo.refreshToken);
      }
      
      await this.store!.set(STORAGE_KEYS.TOKEN_METADATA, tokenInfo);
      await this.store!.save();
      
      console.log('[SecureTokenStorage] Complete token information stored successfully');
    } catch (error) {
      console.error('[SecureTokenStorage] Failed to store token information:', error);
      throw new Error(`Failed to store token information: ${error}`);
    }
  }

  /**
   * Retrieve access token
   */
  async getAccessToken(): Promise<string | null> {
    await this.ensureInitialized();
    
    try {
      const token = await this.store!.get<string>(STORAGE_KEYS.ACCESS_TOKEN);
      
      if (!token) {
        console.log('[SecureTokenStorage] No access token found');
        return null;
      }
      
      // Validate token expiration
      const metadata = await this.getTokenMetadata();
      if (metadata?.expiresAt) {
        const { isExpired } = this.validateTokenExpiration(metadata.expiresAt);
        if (isExpired) {
          console.log('[SecureTokenStorage] Access token is expired');
          return null;
        }
      }
      
      console.log('[SecureTokenStorage] Access token retrieved successfully');
      return token;
    } catch (error) {
      console.error('[SecureTokenStorage] Failed to retrieve access token:', error);
      return null;
    }
  }

  /**
   * Retrieve refresh token
   */
  async getRefreshToken(): Promise<string | null> {
    await this.ensureInitialized();
    
    try {
      const refreshToken = await this.store!.get<string>(STORAGE_KEYS.REFRESH_TOKEN);
      
      if (!refreshToken) {
        console.log('[SecureTokenStorage] No refresh token found');
        return null;
      }
      
      console.log('[SecureTokenStorage] Refresh token retrieved successfully');
      return refreshToken;
    } catch (error) {
      console.error('[SecureTokenStorage] Failed to retrieve refresh token:', error);
      return null;
    }
  }

  /**
   * Retrieve token metadata
   */
  async getTokenMetadata(): Promise<TokenInfo | null> {
    await this.ensureInitialized();
    
    try {
      const metadata = await this.store!.get<TokenInfo>(STORAGE_KEYS.TOKEN_METADATA);
      
      if (!metadata) {
        console.log('[SecureTokenStorage] No token metadata found');
        return null;
      }
      
      console.log('[SecureTokenStorage] Token metadata retrieved successfully');
      return metadata;
    } catch (error) {
      console.error('[SecureTokenStorage] Failed to retrieve token metadata:', error);
      return null;
    }
  }

  /**
   * Check if access token exists and is valid
   */
  async hasValidAccessToken(): Promise<boolean> {
    const token = await this.getAccessToken();
    return token !== null;
  }

  /**
   * Check if refresh token exists
   */
  async hasRefreshToken(): Promise<boolean> {
    const refreshToken = await this.getRefreshToken();
    return refreshToken !== null;
  }

  /**
   * Get token validation status
   */
  async getTokenValidationStatus(): Promise<TokenValidationResult> {
    const token = await this.store!.get<string>(STORAGE_KEYS.ACCESS_TOKEN);
    const metadata = await this.getTokenMetadata();
    
    if (!token) {
      return {
        isValid: false,
        isExpired: false,
        errors: ['No access token found']
      };
    }
    
    const validation = this.validateToken(token);
    const expiration = this.validateTokenExpiration(metadata?.expiresAt);
    
    return {
      isValid: validation.isValid && !expiration.isExpired,
      isExpired: expiration.isExpired,
      expiresIn: expiration.expiresIn,
      errors: validation.errors
    };
  }

  /**
   * Clear access token
   */
  async clearAccessToken(): Promise<void> {
    await this.ensureInitialized();
    
    try {
      await this.store!.delete(STORAGE_KEYS.ACCESS_TOKEN);
      await this.store!.save();
      
      console.log('[SecureTokenStorage] Access token cleared successfully');
    } catch (error) {
      console.error('[SecureTokenStorage] Failed to clear access token:', error);
      throw new Error(`Failed to clear access token: ${error}`);
    }
  }

  /**
   * Clear refresh token
   */
  async clearRefreshToken(): Promise<void> {
    await this.ensureInitialized();
    
    try {
      await this.store!.delete(STORAGE_KEYS.REFRESH_TOKEN);
      await this.store!.save();
      
      console.log('[SecureTokenStorage] Refresh token cleared successfully');
    } catch (error) {
      console.error('[SecureTokenStorage] Failed to clear refresh token:', error);
      throw new Error(`Failed to clear refresh token: ${error}`);
    }
  }

  /**
   * Clear all tokens and metadata
   */
  async clearAllTokens(): Promise<void> {
    await this.ensureInitialized();
    
    try {
      await this.store!.delete(STORAGE_KEYS.ACCESS_TOKEN);
      await this.store!.delete(STORAGE_KEYS.REFRESH_TOKEN);
      await this.store!.delete(STORAGE_KEYS.TOKEN_METADATA);
      await this.store!.delete(STORAGE_KEYS.USER_INFO);
      await this.store!.save();
      
      console.log('[SecureTokenStorage] All tokens cleared successfully');
    } catch (error) {
      console.error('[SecureTokenStorage] Failed to clear all tokens:', error);
      throw new Error(`Failed to clear all tokens: ${error}`);
    }
  }

  /**
   * Store user information
   */
  async storeUserInfo(userInfo: Record<string, any>): Promise<void> {
    await this.ensureInitialized();
    
    try {
      await this.store!.set(STORAGE_KEYS.USER_INFO, userInfo);
      await this.store!.save();
      
      console.log('[SecureTokenStorage] User info stored successfully');
    } catch (error) {
      console.error('[SecureTokenStorage] Failed to store user info:', error);
      throw new Error(`Failed to store user info: ${error}`);
    }
  }

  /**
   * Retrieve user information
   */
  async getUserInfo(): Promise<Record<string, any> | null> {
    await this.ensureInitialized();
    
    try {
      const userInfo = await this.store!.get<Record<string, any>>(STORAGE_KEYS.USER_INFO);
      
      if (!userInfo) {
        console.log('[SecureTokenStorage] No user info found');
        return null;
      }
      
      console.log('[SecureTokenStorage] User info retrieved successfully');
      return userInfo;
    } catch (error) {
      console.error('[SecureTokenStorage] Failed to retrieve user info:', error);
      return null;
    }
  }
}

// Export singleton instance
let secureTokenStorage: SecureTokenStorage | null = null;

/**
 * Get or create secure token storage instance
 */
export const getSecureTokenStorage = (config?: Partial<SecureTokenStorageConfig>): SecureTokenStorage => {
  if (!secureTokenStorage) {
    secureTokenStorage = new SecureTokenStorage(config);
  }
  return secureTokenStorage;
};

/**
 * Initialize secure token storage
 */
export const initializeSecureTokenStorage = async (config?: Partial<SecureTokenStorageConfig>): Promise<SecureTokenStorage> => {
  const storage = getSecureTokenStorage(config);
  await storage.initialize();
  return storage;
};