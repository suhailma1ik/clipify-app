import { Store } from '@tauri-apps/plugin-store';

/**
 * JWT token data structure
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
 * Check if running in Tauri environment
 */
const isTauriEnvironment = (): boolean => {
  return typeof window !== 'undefined' && (window as any).__TAURI__ !== undefined;
};

/**
 * Secure token storage service using Tauri's encrypted store
 * Provides cross-platform secure storage for authentication tokens
 * Falls back to localStorage in web environment for development
 */
export class TokenStorageService {
  private store: Store | null = null;
  private readonly STORE_FILE = 'auth.dat';
  private readonly TOKEN_KEY = 'auth_token';
  private readonly isTauri: boolean;

  constructor() {
    this.isTauri = isTauriEnvironment();
    this.initStore();
  }

  /**
   * Initialize the secure store
   */
  private async initStore(): Promise<void> {
    try {
      if (this.isTauri) {
        this.store = await Store.load(this.STORE_FILE);
        console.log('Tauri store initialized successfully');
      } else {
        console.log('Running in web environment, using localStorage fallback');
        // In web environment, we don't need to initialize anything
        this.store = null;
      }
    } catch (error) {
      console.error('Failed to initialize token storage:', error);
      if (this.isTauri) {
        throw new Error('Token storage initialization failed');
      }
      // In web environment, continue without throwing
      console.warn('Continuing with localStorage fallback');
    }
  }

  /**
   * Store JWT token securely
   * @param tokenData - JWT token data to store
   */
  async storeToken(tokenData: JWTTokenData): Promise<void> {
    try {
      if (this.isTauri) {
        if (!this.store) {
          await this.initStore();
        }
        
        await this.store!.set(this.TOKEN_KEY, tokenData);
        await this.store!.save();
      } else {
        // Web environment fallback
        localStorage.setItem(this.TOKEN_KEY, JSON.stringify(tokenData));
      }
      
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
      let tokenData: JWTTokenData | null = null;
      
      if (this.isTauri) {
         if (!this.store) {
           await this.initStore();
         }
         tokenData = await this.store!.get<JWTTokenData>(this.TOKEN_KEY) || null;
      } else {
        // Web environment fallback
        const storedData = localStorage.getItem(this.TOKEN_KEY);
        if (storedData) {
          tokenData = JSON.parse(storedData);
        }
      }
      
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
      if (this.isTauri) {
        if (!this.store) {
          await this.initStore();
        }

        await this.store!.delete(this.TOKEN_KEY);
        await this.store!.save();
      } else {
        // Web environment fallback
        localStorage.removeItem(this.TOKEN_KEY);
      }
      
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
      if (this.isTauri) {
        if (!this.store) {
          await this.initStore();
        }

        await this.store!.clear();
        await this.store!.save();
      } else {
        // Web environment fallback - only clear our token
        localStorage.removeItem(this.TOKEN_KEY);
      }
      
      console.log('All authentication data cleared');
    } catch (error) {
      console.error('Failed to clear authentication data:', error);
      throw new Error('Failed to clear authentication data');
    }
  }
}

// Export singleton instance
export const tokenStorage = new TokenStorageService();