import { Environment, EnvironmentConfig, ApiConfig, OAuthConfig } from '../types/environment';

/**
 * Detect current environment with improved logic
 * @returns Current environment
 */
export const detectEnvironment = (): Environment => {
  console.log('[EnvironmentService] Detecting environment with improved logic');
  
  // Priority 1: Vite MODE (most reliable for build-time detection)
  const mode = import.meta.env.MODE;
  console.log('[EnvironmentService] Vite MODE:', mode);
  
  if (mode === 'production') {
    console.log('[EnvironmentService] Environment detected from Vite MODE (production)');
    return 'production';
  }
  
  if (mode === 'development') {
    console.log('[EnvironmentService] Environment detected from Vite MODE (development)');
    return 'development';
  }
  
  // Priority 2: Explicit VITE_ENVIRONMENT
  const viteEnv = import.meta.env.VITE_ENVIRONMENT;
  console.log('[EnvironmentService] VITE_ENVIRONMENT:', viteEnv);
  
  if (viteEnv === 'production' || viteEnv === 'development') {
    console.log('[EnvironmentService] Environment detected from VITE_ENVIRONMENT:', viteEnv);
    return viteEnv;
  }
  
  // Priority 3: NODE_ENV (build-time indicator)
  const nodeEnv = import.meta.env.NODE_ENV;
  console.log('[EnvironmentService] NODE_ENV:', nodeEnv);
  
  if (nodeEnv === 'production') {
    console.log('[EnvironmentService] Environment detected from NODE_ENV (production)');
    return 'production';
  }
  
  // Priority 4: Check for production-specific environment variables
  const prodApiUrl = import.meta.env.VITE_PROD_API_BASE_URL;
  const devApiUrl = import.meta.env.VITE_DEV_API_BASE_URL;
  const prodEnvVar = import.meta.env.VITE_PROD_ENVIRONMENT;
  
  // If we have production environment variable set
  if (prodEnvVar === 'production') {
    console.log('[EnvironmentService] Environment detected from VITE_PROD_ENVIRONMENT (production)');
    return 'production';
  }
  
  // If we have production vars but no dev vars (Windows build scenario)
  if (prodApiUrl && !devApiUrl) {
    console.log('[EnvironmentService] Environment detected as production (has prod vars, no dev vars)');
    return 'production';
  }
  
  // Priority 5: Check if we have production API URL configured (Windows build fix)
  if (prodApiUrl && prodApiUrl !== 'http://localhost:8080' && prodApiUrl !== 'http://localhost:8080/') {
    console.log('[EnvironmentService] Environment detected as production (has non-localhost prod API URL)');
    return 'production';
  }
  
  // Default to development with warning
  console.warn('[EnvironmentService] Could not reliably detect environment, defaulting to development');
  console.log('[EnvironmentService] Available env indicators:', {
    MODE: mode,
    VITE_ENVIRONMENT: viteEnv,
    NODE_ENV: nodeEnv,
    VITE_PROD_ENVIRONMENT: prodEnvVar,
    hasProdVars: !!prodApiUrl,
    hasDevVars: !!devApiUrl,
    prodApiUrl: prodApiUrl
  });
  
  return 'development';
};

/**
 * Get frontend configuration based on environment
 * @param environment Current environment
 * @returns Frontend configuration
 */
const getFrontendConfig = (environment: Environment) => {
  console.log('[EnvironmentService] Getting frontend config for environment:', environment);
  
  if (environment === 'production') {
    const config = {
      // Prefer explicit website base URL if provided; fallback to public website domain
      // IMPORTANT: Do not default to API host here; this must be the website domain
      baseUrl: (import.meta.env as any).VITE_WEBSITE_BASE_URL || import.meta.env.VITE_PROD_BASE_URL || 'https://clipify.space/',
      port: parseInt(import.meta.env.VITE_PROD_PORT || '5173')
    };
    console.log('[EnvironmentService] Production frontend config:', config);
    return config;
  }
  
  // Development configuration
  const config = {
    baseUrl: import.meta.env.VITE_DEV_BASE_URL || 'http://localhost:5173/',
    port: parseInt(import.meta.env.VITE_DEV_PORT || '5173')
  };
  console.log('[EnvironmentService] Development frontend config:', config);
  return config;
};

/**
 * Get API configuration based on environment
 * @param environment Current environment
 * @returns API configuration
 */
const getApiConfig = (environment: Environment): ApiConfig => {
  console.log('[EnvironmentService] Getting API config for environment:', environment);
  
  if (environment === 'production') {
    const config = {
      baseUrl: import.meta.env.VITE_PROD_API_BASE_URL || 'https://clipify0.el.r.appspot.com',
      timeout: parseInt(import.meta.env.VITE_PROD_API_TIMEOUT || '30000')
    };
    console.log('[EnvironmentService] Production API config:', config);
    return config;
  }
  
  // Development configuration
  const config = {
    baseUrl: import.meta.env.VITE_DEV_API_BASE_URL || 'http://localhost:8080',
    timeout: parseInt(import.meta.env.VITE_DEV_API_TIMEOUT || '10000')
  };
  console.log('[EnvironmentService] Development API config:', config);
  return config;
};



/**
 * Get OAuth configuration based on environment
 * @param environment Current environment
 * @returns OAuth configuration
 */
const getOAuthConfig = (environment: Environment): OAuthConfig => {
  console.log('[EnvironmentService] Getting OAuth config for environment:', environment);
  
  if (environment === 'production') {
    const config = {
      baseUrl: import.meta.env.VITE_PROD_OAUTH_BASE_URL || 'https://clipify0.el.r.appspot.com/api/v1/auth/google/login',
      clientId: import.meta.env.VITE_PROD_OAUTH_CLIENT_ID || 'clipify-desktop',
      redirectUri: import.meta.env.VITE_PROD_OAUTH_REDIRECT_URI || 'clipify://auth/callback',
      scope: import.meta.env.VITE_PROD_OAUTH_SCOPE || 'openid email profile'
    };
    console.log('[EnvironmentService] Production OAuth config:', config);
    return config;
  }
  
  // Development configuration
  const config = {
    baseUrl: import.meta.env.VITE_DEV_OAUTH_BASE_URL || 'https://clipify0.el.r.appspot.com/api/v1/auth/google/login',
    clientId: import.meta.env.VITE_DEV_OAUTH_CLIENT_ID || 'clipify-desktop',
    redirectUri: import.meta.env.VITE_DEV_OAUTH_REDIRECT_URI || 'clipify://auth/callback',
    scope: import.meta.env.VITE_DEV_OAUTH_SCOPE || 'openid email profile'
  };
  console.log('[EnvironmentService] Development OAuth config:', config);
  return config;
};

/**
 * Get Tauri-specific configuration based on environment
 * @param environment Current environment
 * @returns Tauri configuration
 */
const getTauriConfig = (environment: Environment) => {
  console.log('[EnvironmentService] Getting Tauri config for environment:', environment);
  
  if (environment === 'production') {
    const config = {
      port: parseInt(import.meta.env.VITE_PROD_TAURI_PORT || '1420'),
      hmrPort: parseInt(import.meta.env.VITE_PROD_TAURI_HMR_PORT || '1421')
    };
    console.log('[EnvironmentService] Production Tauri config:', config);
    return config;
  }
  
  // Development configuration
  const config = {
    port: parseInt(import.meta.env.VITE_DEV_TAURI_PORT || '1420'),
    hmrPort: parseInt(import.meta.env.VITE_DEV_TAURI_HMR_PORT || '1421')
  };
  console.log('[EnvironmentService] Development Tauri config:', config);
  return config;
};

/**
 * Get logging level based on environment
 * @param environment Current environment
 * @returns Logging level
 */
const getLogLevel = (environment: Environment) => {
  console.log('[EnvironmentService] Getting log level for environment:', environment);
  
  if (environment === 'production') {
    const level = import.meta.env.VITE_PROD_LOG_LEVEL || 'info';
    console.log('[EnvironmentService] Production log level:', level);
    return level;
  }
  
  // Development configuration
  const level = import.meta.env.VITE_DEV_LOG_LEVEL || 'debug';
  console.log('[EnvironmentService] Development log level:', level);
  return level;
};

/**
 * Get complete environment configuration with validation
 * @param environment Optional environment to use, otherwise auto-detect
 * @returns Complete environment configuration
 */
export const getEnvironmentConfig = (environment?: Environment): EnvironmentConfig => {
  const env = environment || detectEnvironment();
  console.log('[EnvironmentService] Getting environment config for:', env);
  
  const config = {
    environment: env,
    frontend: getFrontendConfig(env),
    api: getApiConfig(env),
    oauth: getOAuthConfig(env),
    tauri: getTauriConfig(env),
    logLevel: getLogLevel(env) as 'debug' | 'info' | 'warn' | 'error'
  };
  
  console.log('[EnvironmentService] Complete environment config:', config);
  
  return config;
};



// Export singleton instance with current environment config
export const environmentConfig = getEnvironmentConfig();

console.log('[EnvironmentService] Environment config initialized:', environmentConfig);