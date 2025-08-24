import { Store } from '@tauri-apps/plugin-store';

/**
 * Interface for JWT token structure
 */
export interface JWTTokenData {
  token: string;
  expiresAt: number; // Unix timestamp
  refreshToken?: string;
  user: {
    id: string;
    email: string;
    name: string;
    picture?: string;
    plan: 'free' | 'pro' | 'enterprise';
  };
}

/**
 * Secure token storage service using Tauri's encrypted store
 * Provides cross-platform secure storage for authentication tokens
 */
export class TokenStorageService {
  private store: Store | null = null;
  private readonly STORE_FILE = 'auth.dat';
  private readonly TOKEN_KEY = 'auth_token';

  constructor() {
    this.initStore();
  }

  /**
   * Initialize the secure store
   */
  private async initStore(): Promise<void> {
    try {
      this.store = new Store(this.STORE_FILE);
    } catch (error) {
      console.error('Failed to initialize token storage:', error);
      throw new Error('Token storage initialization failed');
    }
  }

  /**
   * Store JWT token securely
   * @param tokenData - JWT token data to store
   */
  async storeToken(tokenData: JWTTokenData): Promise<void> {
    try {
      if (!this.store) {
        await this.initStore();
      }
      
      await this.store!.set(this.TOKEN_KEY, tokenData);
      await this.store!.save();
      
      console.log('Token stored securely');
    } catch (error) {
      console.error('Failed to store token:', error);
      throw new Error('Failed to store authentication token');
    }
  }

  /**
   * Retrieve JWT token from secure storage
   * @returns Token data or null if not found
   */
  async retrieveToken(): Promise<JWTTokenData | null> {
    try {
      if (!this.store) {
        await this.initStore();
      }

      const tokenData = await this.store!.get<JWTTokenData>(this.TOKEN_KEY);
      
      if (!tokenData) {
        return null;
      }

      // Check if token is expired
      if (this.isTokenExpired(tokenData)) {
        console.log('Stored token is expired, removing it');
        await this.removeToken();
        return null;
      }

      return tokenData;
    } catch (error) {
      console.error('Failed to retrieve token:', error);
      return null;
    }
  }

  /**
   * Remove JWT token from secure storage
   */
  async removeToken(): Promise<void> {
    try {
      if (!this.store) {
        await this.initStore();
      }

      await this.store!.delete(this.TOKEN_KEY);
      await this.store!.save();
      
      console.log('Token removed from storage');
    } catch (error) {
      console.error('Failed to remove token:', error);
      throw new Error('Failed to remove authentication token');
    }
  }

  /**
   * Check if a token is expired
   * @param tokenData - Token data to check
   * @returns True if token is expired
   */
  isTokenExpired(tokenData: JWTTokenData): boolean {
    const now = Date.now();
    const expiry = tokenData.expiresAt * 1000; // Convert to milliseconds
    
    // Add 5 minute buffer before actual expiry
    const buffer = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    return now >= (expiry - buffer);
  }

  /**
   * Check if a valid token exists
   * @returns True if valid token exists
   */
  async hasValidToken(): Promise<boolean> {
    const tokenData = await this.retrieveToken();
    return tokenData !== null && !this.isTokenExpired(tokenData);
  }

  /**
   * Get the current token string if valid
   * @returns Token string or null
   */
  async getValidTokenString(): Promise<string | null> {
    const tokenData = await this.retrieveToken();
    if (!tokenData || this.isTokenExpired(tokenData)) {
      return null;
    }
    return tokenData.token;
  }

  /**
   * Update user information in stored token
   * @param userUpdate - Partial user data to update
   */
  async updateUserInfo(userUpdate: Partial<JWTTokenData['user']>): Promise<void> {
    try {
      const tokenData = await this.retrieveToken();
      if (!tokenData) {
        throw new Error('No token found to update');
      }

      const updatedTokenData: JWTTokenData = {
        ...tokenData,
        user: {
          ...tokenData.user,
          ...userUpdate
        }
      };

      await this.storeToken(updatedTokenData);
    } catch (error) {
      console.error('Failed to update user info:', error);
      throw new Error('Failed to update user information');
    }
  }

  /**
   * Clear all authentication data
   */
  async clearAll(): Promise<void> {
    try {
      if (!this.store) {
        await this.initStore();
      }

      await this.store!.clear();
      await this.store!.save();
      
      console.log('All authentication data cleared');
    } catch (error) {
      console.error('Failed to clear authentication data:', error);
      throw new Error('Failed to clear authentication data');
    }
  }
}

// Export singleton instance
export const tokenStorage = new TokenStorageService();