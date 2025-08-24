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

  console.log('[AuthContext] AuthProvider initialized');

  /**
   * Update authentication state
   */
  const updateAuthState = (updates: Partial<AuthState>) => {
    console.log('[AuthContext] Updating auth state:', updates);
    setAuthState(prev => {
      const newState = { ...prev, ...updates };
      console.log('[AuthContext] New auth state:', {
        ...newState,
        token: newState.token ? newState.token.substring(0, 10) + '...' : null
      });
      return newState;
    });
  };

  /**
   * Set authentication error
   */
  const setError = (error: AuthError | null) => {
    console.log('[AuthContext] Setting error:', error);
    updateAuthState({ error, isLoading: false });
    
    // Send error notification if error exists
    if (error) {
      console.log('[AuthContext] Sending error notification');
      notificationService.authError(error.userMessage);
    }
  };

  /**
   * Handle and classify errors
   */
  const handleError = (error: any, context: string) => {
    console.log('[AuthContext] Handling error in context:', context, error);
    const authError = AuthErrorHandler.classifyError(error, context);
    console.log('[AuthContext] Classified error:', authError);
    setError(authError);
    return authError;
  };

  /**
   * Clear authentication error
   */
  const clearError = () => {
    console.log('[AuthContext] Clearing error');
    updateAuthState({ error: null });
  };

  /**
   * Set authenticated user data
   */
  const setAuthenticated = (tokenData: JWTTokenData) => {
    console.log('[AuthContext] Setting authenticated state');
    console.log('[AuthContext] Token data:', {
      token: tokenData.token ? tokenData.token.substring(0, 10) + '...' : null,
      expiresAt: tokenData.expiresAt,
      refreshToken: tokenData.refreshToken ? tokenData.refreshToken.substring(0, 10) + '...' : null,
      user: tokenData.user ? { ...tokenData.user, email: '[REDACTED]' } : null
    });
    
    updateAuthState({
      isAuthenticated: true,
      isLoading: false,
      user: tokenData.user,
      token: tokenData.token,
      error: null
    });
    
    // Send success notification
    if (tokenData.user) {
      console.log('[AuthContext] Sending success notification');
      notificationService.authSuccess(`Welcome back, ${tokenData.user.name}!`);
    }
  };

  /**
   * Clear authentication data
   */
  const clearAuthentication = () => {
    console.log('[AuthContext] Clearing authentication');
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
    console.log('[AuthContext] Checking for existing authentication...');
    updateAuthState({ isLoading: true, error: null });

    try {
      const tokenData = await tokenStorage.retrieveToken();
      
      if (!tokenData) {
        console.log('[AuthContext] No stored token found');
        clearAuthentication();
        return false;
      }

      console.log('[AuthContext] Found stored token, checking expiration');
      // Check if token is expired
      if (tokenStorage.isTokenExpired(tokenData)) {
        console.log('[AuthContext] Stored token is expired, attempting refresh...');
        
        if (tokenData.refreshToken) {
          console.log('[AuthContext] Attempting to refresh expired token...');
          const refreshed = await refreshToken();
          if (refreshed) {
            console.log('[AuthContext] Token refresh successful');
            return true;
          } else {
            console.log('[AuthContext] Token refresh failed, clearing authentication');
            await tokenStorage.removeToken();
            clearAuthentication();
          }
        } else {
          console.log('[AuthContext] No refresh token available, clearing authentication');
          await tokenStorage.removeToken();
          clearAuthentication();
        }
        return false;
      }

      // Validate token with backend
      console.log('[AuthContext] Validating existing token with backend...');
      const isValid = await tokenExchangeService.validateToken(tokenData.token);
      
      if (isValid) {
        console.log('[AuthContext] Existing token is valid, fetching user profile...');
        try {
          const userData = await tokenExchangeService.getUserProfile(tokenData.token);
          if (userData) {
            console.log('[AuthContext] User profile fetched successfully:', { ...userData, email: '[REDACTED]' });
            setAuthenticated({ ...tokenData, user: userData });
            return true;
          } else {
            console.log('[AuthContext] Failed to fetch user profile despite valid token');
            // Token is valid but profile fetch failed, still consider authenticated
            setAuthenticated(tokenData);
            return true;
          }
        } catch (profileError) {
          console.error('[AuthContext] Error fetching user profile:', profileError);
          // Token is valid but profile fetch failed, still consider authenticated
          setAuthenticated(tokenData);
          return true;
        }
      } else {
        console.log('[AuthContext] Token validation failed, attempting refresh...');
        if (tokenData.refreshToken) {
          console.log('[AuthContext] Attempting to refresh invalid token...');
          const refreshed = await refreshToken();
          if (refreshed) {
            console.log('[AuthContext] Token refresh successful after validation failure');
            return true;
          } else {
            console.log('[AuthContext] Token refresh failed after validation failure');
          }
        } else {
          console.log('[AuthContext] No refresh token available for invalid token');
        }
        
        console.log('[AuthContext] Unable to recover from invalid token, clearing authentication');
        await tokenStorage.removeToken();
        clearAuthentication();
        return false;
      }
    } catch (error) {
      console.error('[AuthContext] Error checking existing auth:', error);
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
    console.log('[AuthContext] Handling OAuth callback with auth code:', authCode.substring(0, 10) + '...');
    updateAuthState({ isLoading: true, error: null });

    try {
      console.log('[AuthContext] Attempting to refresh invalid token...');
      // Exchange authorization code for JWT token
      const tokenData = await tokenExchangeService.exchangeCodeForToken(authCode, state);
      
      if (tokenData && tokenData.token) {
        console.log('[AuthContext] Token exchange successful, storing token and setting authenticated state');
        
        // Store the token immediately
        await tokenStorage.storeToken(tokenData);
        console.log('[AuthContext] Token stored successfully');
        
        // Fetch user profile to ensure we have complete user data
        try {
          const userData = await tokenExchangeService.getUserProfile(tokenData.token);
          if (userData) {
            console.log('[AuthContext] User profile fetched after OAuth:', { ...userData, email: '[REDACTED]' });
            // Update token data with fresh user data
            const updatedTokenData = { ...tokenData, user: userData };
            await tokenStorage.storeToken(updatedTokenData);
            setAuthenticated(updatedTokenData);
          } else {
            setAuthenticated(tokenData);
          }
        } catch (profileError) {
          console.warn('[AuthContext] Failed to fetch user profile after OAuth, but continuing with authentication:', profileError);
          setAuthenticated(tokenData);
        }
      
        console.log('[AuthContext] Authentication state set successfully');
        return true;
      } else {
        console.error('[AuthContext] Token exchange failed - no token received');
        setError(AuthErrorHandler.createError(
          AuthErrorType.AUTHENTICATION_FAILED,
          'Token exchange failed',
          'Failed to receive authentication token from server',
          undefined,
          { context: 'oauth_callback' }
        ));
        return false;
      }
    } catch (error) {
      console.error('[AuthContext] OAuth callback handling error:', error);
      handleError(error, 'oauthCallback');
      return false;
    } finally {
      updateAuthState({ isLoading: false });
    }
  };

  /**
   * Handle OAuth callback error
   */
  const handleOAuthError = (error: string) => {
    console.error('[AuthContext] OAuth error:', error);
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
      console.log('[AuthContext] Checking for existing website session...');
      
      // Test connectivity first
      const isConnected = await tokenExchangeService.testConnection();
      console.log('[AuthContext] Connection test result:', isConnected);
      
      if (!isConnected) {
        console.log('[AuthContext] Cannot connect to server, proceeding with OAuth flow');
        return false;
      }

      // Make a request to the OAuth login endpoint with client_type=desktop
      // This will check for existing session cookies and redirect if authenticated
      const { oauthService } = await import('../services/oauthService');
      
      // Launch the OAuth URL - if user is already logged in on website,
      // the server will detect the session and redirect back immediately
      console.log('[AuthContext] Launching OAuth flow to check website session');
      await oauthService.launchOAuthFlow(false);
      
      return true; // Session check initiated
    } catch (error) {
      console.error('[AuthContext] Website session check failed:', error);
      return false;
    }
  };

  /**
   * Start OAuth login flow with session checking
   */
  const login = async () => {
    try {
      console.log('[AuthContext] Starting login flow...');
      clearError();
      
      // Start deep link service if not already running
      if (!deepLinkService.isActive()) {
        console.log('[AuthContext] Deep link service not active, starting it');
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
        console.log('[AuthContext] Session check failed, launching direct OAuth flow');
        await import('../services/oauthService').then(({ oauthService }) => {
          return oauthService.launchOAuthFlow(false);
        });
      }
    } catch (error) {
      console.error('[AuthContext] Login error:', error);
      handleError(error, 'login');
    }
  };

  /**
   * Start OAuth signup flow
   */
  const signup = async () => {
    try {
      console.log('[AuthContext] Starting signup flow...');
      clearError();
      
      // Start deep link service if not already running
      if (!deepLinkService.isActive()) {
        console.log('[AuthContext] Deep link service not active, starting it');
        const handler: DeepLinkHandler = {
          onAuthCallback: handleOAuthCallback,
          onError: handleOAuthError
        };
        
        await deepLinkService.startListening(handler);
      }
      
      // Launch OAuth flow in browser with signup hint
      console.log('[AuthContext] Launching OAuth flow with signup hint');
      await import('../services/oauthService').then(({ oauthService }) => {
        return oauthService.launchOAuthFlow(true);
      });
    } catch (error) {
      console.error('[AuthContext] Signup error:', error);
      handleError(error, 'signup');
    }
  };

  /**
   * Logout user and clear all authentication data
   */
  const logout = async () => {
    try {
      console.log('[AuthContext] Logging out...');
      
      // Stop deep link service
      console.log('[AuthContext] Stopping deep link service');
      await deepLinkService.stopListening();
      
      // Clear stored token
      console.log('[AuthContext] Removing stored token');
      await tokenStorage.removeToken();
      
      // Clear authentication state
      console.log('[AuthContext] Clearing authentication state');
      clearAuthentication();
      
      console.log('[AuthContext] Logout successful');
    } catch (error) {
      console.error('[AuthContext] Logout error:', error);
      // Even if there's an error, clear the state
      clearAuthentication();
    }
  };

  /**
   * Refresh JWT token
   */
  const refreshToken = async (): Promise<boolean> => {
    console.log('[AuthContext] Refreshing token...');
    
    try {
      const tokenData = await tokenStorage.retrieveToken();
      
      if (!tokenData || !tokenData.refreshToken) {
        console.log('[AuthContext] No refresh token available');
        return false;
      }

      console.log('[AuthContext] Attempting token refresh with refresh token');
      const newTokenData = await tokenExchangeService.refreshToken(tokenData.refreshToken);
      
      if (newTokenData && newTokenData.token) {
        console.log('[AuthContext] Token refresh successful, storing new token');
        await tokenStorage.storeToken(newTokenData);
        setAuthenticated(newTokenData);
        return true;
      } else {
        console.error('[AuthContext] Token refresh failed - no token received');
        return false;
      }
    } catch (error) {
      console.error('[AuthContext] Token refresh error:', error);
      handleError(error, 'tokenRefresh');
      return false;
    }
  };

  /**
   * Switch to a different account
   */
  const switchAccount = async () => {
    try {
      console.log('[AuthContext] Switching account...');
      
      // Logout current user
      await logout();
      
      // Start fresh login flow
      await login();
    } catch (error) {
      console.error('[AuthContext] Account switch error:', error);
      handleError(error, 'switchAccount');
    }
  };

  /**
   * Initialize authentication on component mount
   */
  useEffect(() => {
    console.log('[AuthContext] Initializing authentication');
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
        console.log('[AuthContext] Starting deep link service');
        await deepLinkService.startListening(handler);
      } catch (error) {
        console.error('[AuthContext] Failed to start deep link service:', error);
      }
    };

    initialize();

    // Cleanup function
    return () => {
      console.log('[AuthContext] Cleaning up');
      mounted = false;
      deepLinkService.stopListening();
    };
  }, []);

  /**
   * Auto-refresh token before expiry
   */
  useEffect(() => {
    console.log('[AuthContext] Setting up token auto-refresh');
    if (!authState.isAuthenticated || !authState.token) {
      console.log('[AuthContext] Not authenticated or no token, skipping auto-refresh');
      return;
    }

    const checkTokenExpiry = async () => {
      console.log('[AuthContext] Checking token expiry for auto-refresh');
      const tokenData = await tokenStorage.retrieveToken();
      
      if (!tokenData) {
        console.log('[AuthContext] No token data found for auto-refresh');
        return;
      }

      // Check if token expires in less than 5 minutes
      const now = Date.now();
      const expiry = tokenData.expiresAt * 1000;
      const timeUntilExpiry = expiry - now;
      const refreshThreshold = 5 * 60 * 1000; // 5 minutes

      console.log('[AuthContext] Token expiry check for auto-refresh - Time until expiry (ms):', timeUntilExpiry);
      
      if (timeUntilExpiry < refreshThreshold) {
        console.log('[AuthContext] Token expires soon, attempting refresh');
        await refreshToken();
      } else {
        console.log('[AuthContext] Token is still valid, no refresh needed');
      }
    };

    // Check immediately
    checkTokenExpiry();

    // Check every minute
    const interval = setInterval(checkTokenExpiry, 60 * 1000);
    
    return () => {
      console.log('[AuthContext] Clearing auto-refresh interval');
      clearInterval(interval);
    };
  }, [authState.isAuthenticated, authState.token]);

  console.log('[AuthContext] Providing auth context with state:', {
    ...authState,
    token: authState.token ? authState.token.substring(0, 10) + '...' : null
  });

  return (
    <AuthContext.Provider value={{
      ...authState,
      login,
      signup,
      logout,
      refreshToken,
      clearError,
      switchAccount
    }}>
      {children}
    </AuthContext.Provider>
  );
};