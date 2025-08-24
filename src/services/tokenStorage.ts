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
    console.log('[TokenStorageService] Initialized, isTauri:', this.isTauri);
    this.initStore();
  }

  /**
   * Initialize the secure store
   */
  private async initStore(): Promise<void> {
    console.log('[TokenStorageService] Initializing store');
    try {
      if (this.isTauri) {
        console.log('[TokenStorageService] Loading Tauri store:', this.STORE_FILE);
        this.store = await Store.load(this.STORE_FILE);
        console.log('[TokenStorageService] Tauri store initialized successfully');
      } else {
        console.log('[TokenStorageService] Running in web environment, using localStorage fallback');
        // In web environment, we don't need to initialize anything
        this.store = null;
      }
    } catch (error) {
      console.error('[TokenStorageService] Failed to initialize token storage:', error);
      if (this.isTauri) {
        throw new Error('Token storage initialization failed');
      }
      // In web environment, continue without throwing
      console.warn('[TokenStorageService] Continuing with localStorage fallback');
    }
  }

  /**
   * Store JWT token securely
   * @param tokenData - JWT token data to store
   */
  async storeToken(tokenData: JWTTokenData): Promise<void> {
    console.log('[TokenStorageService] Storing token data');
    console.log('[TokenStorageService] Token data:', {
      token: tokenData.token ? tokenData.token.substring(0, 10) + '...' : null,
      expiresAt: tokenData.expiresAt,
      refreshToken: tokenData.refreshToken ? tokenData.refreshToken.substring(0, 10) + '...' : null,
      user: tokenData.user ? { ...tokenData.user, email: '[REDACTED]' } : null
    });
    
    try {
      if (this.isTauri) {
        if (!this.store) {
          console.log('[TokenStorageService] Store not initialized, initializing now');
          await this.initStore();
        }
        
        console.log('[TokenStorageService] Setting token in Tauri store');
        await this.store!.set(this.TOKEN_KEY, tokenData);
        console.log('[TokenStorageService] Saving Tauri store');
        await this.store!.save();
      } else {
        // Web environment fallback
        console.log('[TokenStorageService] Storing token in localStorage (web environment)');
        localStorage.setItem(this.TOKEN_KEY, JSON.stringify(tokenData));
      }
      
      console.log('[TokenStorageService] Token stored securely');
    } catch (error) {
      console.error('[TokenStorageService] Failed to store token:', error);
      throw new Error('Failed to store authentication token');
    }
  }

  /**
   * Retrieve JWT token from secure storage
   * @returns Token data or null if not found
   */
  async retrieveToken(): Promise<JWTTokenData | null> {
    console.log('[TokenStorageService] Retrieving token data');
    
    try {
      let tokenData: JWTTokenData | null = null;
      
      if (this.isTauri) {
         if (!this.store) {
           console.log('[TokenStorageService] Store not initialized, initializing now');
           await this.initStore();
         }
         console.log('[TokenStorageService] Getting token from Tauri store');
         tokenData = await this.store!.get<JWTTokenData>(this.TOKEN_KEY) || null;
      } else {
        // Web environment fallback
        console.log('[TokenStorageService] Getting token from localStorage (web environment)');
        const storedData = localStorage.getItem(this.TOKEN_KEY);
        if (storedData) {
          tokenData = JSON.parse(storedData);
        }
      }
      
      if (!tokenData) {
        console.log('[TokenStorageService] No token data found');
        return null;
      }

      console.log('[TokenStorageService] Retrieved token data:', {
        token: tokenData.token ? tokenData.token.substring(0, 10) + '...' : null,
        expiresAt: tokenData.expiresAt,
        refreshToken: tokenData.refreshToken ? tokenData.refreshToken.substring(0, 10) + '...' : null,
        user: tokenData.user ? { ...tokenData.user, email: '[REDACTED]' } : null
      });

      // Check if token is expired
      if (this.isTokenExpired(tokenData)) {
        console.log('[TokenStorageService] Stored token is expired, removing it');
        await this.removeToken();
        return null;
      }

      console.log('[TokenStorageService] Returning valid token data');
      return tokenData;
    } catch (error) {
      console.error('[TokenStorageService] Failed to retrieve token:', error);
      return null;
    }
  }

  /**
   * Remove JWT token from secure storage
   */
  async removeToken(): Promise<void> {
    console.log('[TokenStorageService] Removing token data');
    
    try {
      if (this.isTauri) {
        if (!this.store) {
          console.log('[TokenStorageService] Store not initialized, initializing now');
          await this.initStore();
        }

        console.log('[TokenStorageService] Deleting token from Tauri store');
        await this.store!.delete(this.TOKEN_KEY);
        console.log('[TokenStorageService] Saving Tauri store');
        await this.store!.save();
      } else {
        // Web environment fallback
        console.log('[TokenStorageService] Removing token from localStorage (web environment)');
        localStorage.removeItem(this.TOKEN_KEY);
      }
      
      console.log('[TokenStorageService] Token removed from storage');
    } catch (error) {
      console.error('[TokenStorageService] Failed to remove token:', error);
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
    const timeUntilExpiry = expiry - now;
    
    // Add 5 minute buffer before actual expiry
    const buffer = 5 * 60 * 1000; // 5 minutes in milliseconds
    const isExpired = now >= (expiry - buffer);
    
    console.log('[TokenStorageService] Token expiry check - Now:', new Date(now).toISOString());
    console.log('[TokenStorageService] Token expiry check - Expires:', new Date(expiry).toISOString());
    console.log('[TokenStorageService] Token expiry check - Buffer (ms):', buffer);
    console.log('[TokenStorageService] Token expiry check - Time until expiry (ms):', timeUntilExpiry);
    console.log('[TokenStorageService] Token expiry check - Is expired:', isExpired);
    
    return isExpired;
  }

  /**
   * Check if a valid token exists
   * @returns True if valid token exists
   */
  async hasValidToken(): Promise<boolean> {
    console.log('[TokenStorageService] Checking for valid token');
    const tokenData = await this.retrieveToken();
    const hasValidToken = tokenData !== null && !this.isTokenExpired(tokenData);
    console.log('[TokenStorageService] Has valid token:', hasValidToken);
    return hasValidToken;
  }

  /**
   * Get the current token string if valid
   * @returns Token string or null
   */
  async getValidTokenString(): Promise<string | null> {
    console.log('[TokenStorageService] Getting valid token string');
    const tokenData = await this.retrieveToken();
    if (!tokenData || this.isTokenExpired(tokenData)) {
      console.log('[TokenStorageService] No valid token available');
      return null;
    }
    console.log('[TokenStorageService] Returning valid token string');
    return tokenData.token;
  }

  /**
   * Update user information in stored token
   * @param userUpdate - Partial user data to update
   */
  async updateUserInfo(userUpdate: Partial<JWTTokenData['user']>): Promise<void> {
    console.log('[TokenStorageService] Updating user info:', userUpdate);
    
    try {
      const tokenData = await this.retrieveToken();
      if (!tokenData) {
        console.error('[TokenStorageService] No token found to update');
        throw new Error('No token found to update');
      }

      const updatedTokenData: JWTTokenData = {
        ...tokenData,
        user: {
          ...tokenData.user,
          ...userUpdate
        }
      };

      console.log('[TokenStorageService] Storing updated token data');
      await this.storeToken(updatedTokenData);
      console.log('[TokenStorageService] User info updated successfully');
    } catch (error) {
      console.error('[TokenStorageService] Failed to update user info:', error);
      throw error;
    }
  }
}