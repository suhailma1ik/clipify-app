import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { JWTTokenData, tokenStorage } from '../services/tokenStorage';
import { tokenExchangeService } from '../services/tokenExchangeService';
import { deepLinkService, DeepLinkHandler } from '../services/deepLinkService';
import { AuthErrorHandler, AuthErrorType, AuthError } from '../utils/errorHandler';
import { notificationService } from '../services/notificationService';

/**
 * Authentication state interface
 */
export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: JWTTokenData['user'] | null;
  token: string | null;
  error: AuthError | null;
}

/**
 * Authentication actions interface
 */
export interface AuthActions {
  login: () => Promise<void>;
  signup: () => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  clearError: () => void;
  switchAccount: () => Promise<void>;
}

/**
 * Combined authentication context interface
 */
export interface AuthContextType extends AuthState, AuthActions {}

/**
 * Authentication context
 */
const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Authentication provider props
 */
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Authentication provider component
 * Manages authentication state and provides auth methods
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    token: null,
    error: null
  });

  /**
   * Update authentication state
   */
  const updateAuthState = (updates: Partial<AuthState>) => {
    setAuthState(prev => ({ ...prev, ...updates }));
  };

  /**
   * Set authentication error
   */
  const setError = (error: AuthError | null) => {
    updateAuthState({ error, isLoading: false });
    
    // Send error notification if error exists
    if (error) {
      notificationService.authError(error.userMessage);
    }
  };

  /**
   * Handle and classify errors
   */
  const handleError = (error: any, context: string) => {
    const authError = AuthErrorHandler.classifyError(error, context);
    setError(authError);
    return authError;
  };

  /**
   * Clear authentication error
   */
  const clearError = () => {
    updateAuthState({ error: null });
  };

  /**
   * Set authenticated user data
   */
  const setAuthenticated = (tokenData: JWTTokenData) => {
    updateAuthState({
      isAuthenticated: true,
      isLoading: false,
      user: tokenData.user,
      token: tokenData.token,
      error: null
    });
    
    // Send success notification
    notificationService.authSuccess(`Welcome back, ${tokenData.user.name}!`);
  };

  /**
   * Clear authentication data
   */
  const clearAuthentication = () => {
    updateAuthState({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      token: null,
      error: null
    });
  };

  /**
   * Check for existing valid token on app launch
   */
  const checkExistingAuth = async (): Promise<boolean> => {
    try {
      console.log('Checking for existing authentication...');
      updateAuthState({ isLoading: true, error: null });

      const tokenData = await tokenStorage.retrieveToken();
      
      if (!tokenData) {
        console.log('No stored token found');
        clearAuthentication();
        return false;
      }

      // Check if token is expired
      if (tokenStorage.isTokenExpired(tokenData)) {
        console.log('Stored token is expired, attempting refresh...');
        
        if (tokenData.refreshToken) {
          console.log('Attempting to refresh expired token...');
          const refreshed = await refreshToken();
          if (refreshed) {
            console.log('Token refresh successful');
            return true;
          } else {
            console.log('Token refresh failed, clearing authentication');
            await tokenStorage.removeToken();
            clearAuthentication();
          }
        } else {
          console.log('No refresh token available, clearing authentication');
          await tokenStorage.removeToken();
          clearAuthentication();
        }
        return false;
      }

      // Validate token with backend
      console.log('Validating existing token with backend...');
      const isValid = await tokenExchangeService.validateToken(tokenData.token);
      
      if (isValid) {
        console.log('Existing token is valid, fetching user profile...');
        try {
          const userData = await tokenExchangeService.getUserProfile(tokenData.token);
          if (userData) {
            console.log('User profile fetched successfully:', userData.email);
            setAuthenticated({ ...tokenData, user: userData });
            return true;
          } else {
            console.log('Failed to fetch user profile despite valid token');
            // Token is valid but profile fetch failed, still consider authenticated
            setAuthenticated(tokenData);
            return true;
          }
        } catch (profileError) {
          console.error('Error fetching user profile:', profileError);
          // Token is valid but profile fetch failed, still consider authenticated
          setAuthenticated(tokenData);
          return true;
        }
      } else {
        console.log('Token validation failed, attempting refresh...');
        if (tokenData.refreshToken) {
          console.log('Attempting to refresh invalid token...');
          const refreshed = await refreshToken();
          if (refreshed) {
            console.log('Token refresh successful after validation failure');
            return true;
          } else {
            console.log('Token refresh failed after validation failure');
          }
        } else {
          console.log('No refresh token available for invalid token');
        }
        
        console.log('Unable to recover from invalid token, clearing authentication');
        await tokenStorage.removeToken();
        clearAuthentication();
        return false;
      }
    } catch (error) {
      console.error('Error checking existing auth:', error);
      handleError(error, 'checkExistingAuth');
      await tokenStorage.removeToken();
      clearAuthentication();
      return false;
    }
  };

  /**
   * Handle OAuth callback with authorization code
   */
  const handleOAuthCallback = async (authCode: string, state: string = ''): Promise<boolean> => {
    try {
      console.log('Handling OAuth callback with auth code:', authCode);
      updateAuthState({ isLoading: true, error: null });

      // Exchange authorization code for JWT token
      const tokenData = await tokenExchangeService.exchangeCodeForToken(authCode, state);
      
      if (tokenData && tokenData.token) {
        console.log('Token exchange successful, storing token and setting authenticated state');
        
        // Store the token immediately
        await tokenStorage.storeToken(tokenData);
        console.log('Token stored successfully');
        
        // Fetch user profile to ensure we have complete user data
        try {
          const userData = await tokenExchangeService.getUserProfile(tokenData.token);
          if (userData) {
            console.log('User profile fetched after OAuth:', userData.email);
            // Update token data with fresh user data
            const updatedTokenData = { ...tokenData, user: userData };
            await tokenStorage.storeToken(updatedTokenData);
            setAuthenticated(updatedTokenData);
          } else {
            setAuthenticated(tokenData);
          }
        } catch (profileError) {
          console.warn('Failed to fetch user profile after OAuth, but continuing with authentication:', profileError);
          setAuthenticated(tokenData);
        }
        
        console.log('Authentication state set successfully');
        return true;
      } else {
        console.error('Token exchange failed - no token received');
         const authError = AuthErrorHandler.createError(
           AuthErrorType.OAUTH_ERROR,
           'No token received from OAuth callback',
           'Authentication failed. No token received.',
           undefined,
           { source: 'oauth_callback' },
           true
         );
         setError(authError);
        return false;
      }
    } catch (error) {
      console.error('OAuth callback error:', error);
      handleError(error, 'handleOAuthCallback');
      return false;
    }
  };

  /**
   * Handle OAuth callback error
   */
  const handleOAuthError = (error: string) => {
    console.error('OAuth error:', error);
    const authError = AuthErrorHandler.createError(
      AuthErrorType.OAUTH_ERROR,
      error,
      error,
      undefined,
      { source: 'oauth_callback' },
      true
    );
    setError(authError);
  };

  /**
   * Check if user has an existing session on the website
   */
  const checkWebsiteSession = async (): Promise<boolean> => {
    try {
      console.log('Checking for existing website session...');
      
      // Test connectivity first
      const isConnected = await tokenExchangeService.testConnection();
      if (!isConnected) {
        console.log('Cannot connect to server, proceeding with OAuth flow');
        return false;
      }

      // Make a request to the OAuth login endpoint with client_type=desktop
      // This will check for existing session cookies and redirect if authenticated
      const { oauthService } = await import('../services/oauthService');
      
      // Launch the OAuth URL - if user is already logged in on website,
      // the server will detect the session and redirect back immediately
      await oauthService.launchOAuthFlow(false);
      
      return true; // Session check initiated
    } catch (error) {
      console.error('Website session check failed:', error);
      return false;
    }
  };

  /**
   * Start OAuth login flow with session checking
   */
  const login = async () => {
    try {
      console.log('Starting login flow...');
      clearError();
      
      // Start deep link service if not already running
      if (!deepLinkService.isActive()) {
        const handler: DeepLinkHandler = {
          onAuthCallback: handleOAuthCallback,
          onError: handleOAuthError
        };
        
        await deepLinkService.startListening(handler);
      }
      
      // Check for existing website session first
      const sessionCheckInitiated = await checkWebsiteSession();
      
      if (!sessionCheckInitiated) {
        // Fallback to direct OAuth flow if session check failed
        console.log('Session check failed, launching direct OAuth flow');
        await import('../services/oauthService').then(({ oauthService }) => {
          return oauthService.launchOAuthFlow(false);
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      handleError(error, 'login');
    }
  };

  /**
   * Start OAuth signup flow
   */
  const signup = async () => {
    try {
      console.log('Starting signup flow...');
      clearError();
      
      // Start deep link service if not already running
      if (!deepLinkService.isActive()) {
        const handler: DeepLinkHandler = {
          onAuthCallback: handleOAuthCallback,
          onError: handleOAuthError
        };
        
        await deepLinkService.startListening(handler);
      }
      
      // Launch OAuth flow in browser with signup hint
      await import('../services/oauthService').then(({ oauthService }) => {
        return oauthService.launchOAuthFlow(true);
      });
    } catch (error) {
      console.error('Signup error:', error);
      handleError(error, 'signup');
    }
  };

  /**
   * Logout user and clear all authentication data
   */
  const logout = async () => {
    try {
      console.log('Logging out...');
      
      // Stop deep link service
      await deepLinkService.stopListening();
      
      // Clear stored token
      await tokenStorage.removeToken();
      
      // Clear authentication state
      clearAuthentication();
      
      console.log('Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if there's an error, clear the state
      clearAuthentication();
    }
  };

  /**
   * Refresh expired token
   */
  const refreshToken = async (): Promise<boolean> => {
    try {
      console.log('Refreshing token...');
      
      const currentTokenData = await tokenStorage.retrieveToken();
      
      if (!currentTokenData?.refreshToken) {
        console.log('No refresh token available');
        return false;
      }

      const newTokenData = await tokenExchangeService.refreshToken(currentTokenData.refreshToken);
      
      // Store new token
      await tokenStorage.storeToken(newTokenData);
      
      // Update authentication state
      setAuthenticated(newTokenData);
      
      console.log('Token refresh successful');
      return true;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  };

  /**
   * Switch to a different account
   */
  const switchAccount = async () => {
    try {
      console.log('Switching account...');
      
      // Clear current authentication
      await logout();
      
      // Start login flow
      await login();
    } catch (error) {
      console.error('Account switch error:', error);
      handleError(error, 'switchAccount');
    }
  };

  /**
   * Initialize authentication on component mount
   */
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      if (!mounted) return;
      
      // Check for existing authentication
      await checkExistingAuth();
      
      if (!mounted) return;
      
      // Set up deep link service handler
      const handler: DeepLinkHandler = {
        onAuthCallback: handleOAuthCallback,
        onError: handleOAuthError
      };
      
      try {
        await deepLinkService.startListening(handler);
      } catch (error) {
        console.error('Failed to start deep link service:', error);
      }
    };

    initialize();

    // Cleanup function
    return () => {
      mounted = false;
      deepLinkService.stopListening();
    };
  }, []);

  /**
   * Auto-refresh token before expiry
   */
  useEffect(() => {
    if (!authState.isAuthenticated || !authState.token) {
      return;
    }

    const checkTokenExpiry = async () => {
      const tokenData = await tokenStorage.retrieveToken();
      
      if (!tokenData) {
        return;
      }

      // Check if token will expire in next 5 minutes
      const now = Date.now();
      const expiry = tokenData.expiresAt * 1000;
      const fiveMinutes = 5 * 60 * 1000;
      
      if (now >= (expiry - fiveMinutes)) {
        console.log('Token expiring soon, attempting refresh...');
        const refreshed = await refreshToken();
        
        if (!refreshed) {
          console.log('Auto-refresh failed, logging out...');
          await logout();
        }
      }
    };

    // Check every minute
    const interval = setInterval(checkTokenExpiry, 60000);
    
    return () => clearInterval(interval);
  }, [authState.isAuthenticated, authState.token]);

  const contextValue: AuthContextType = {
    ...authState,
    login,
    signup,
    logout,
    refreshToken,
    clearError,
    switchAccount
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to use authentication context
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

/**
 * Hook to check if user is authenticated
 */
export const useIsAuthenticated = (): boolean => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated;
};

/**
 * Hook to get current user
 */
export const useCurrentUser = (): JWTTokenData['user'] | null => {
  const { user } = useAuth();
  return user;
};

/**
 * Hook to get authentication loading state
 */
export const useAuthLoading = (): boolean => {
  const { isLoading } = useAuth();
  return isLoading;
};