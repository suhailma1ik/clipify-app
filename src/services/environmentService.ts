import { Environment, EnvironmentConfig, ApiConfig } from '../types/environment';

/**
 * Detect current environment with improved logic
 * @returns Current environment
 */
export const detectEnvironment = (): Environment => {
  console.log('[EnvironmentService] Detecting environment with improved logic');
  
  // Priority 1: Explicit VITE_ENVIRONMENT (most reliable)
  const viteEnv = import.meta.env.VITE_ENVIRONMENT;
  console.log('[EnvironmentService] VITE_ENVIRONMENT:', viteEnv);
  
  if (viteEnv === 'production' || viteEnv === 'development') {
    console.log('[EnvironmentService] Environment detected from VITE_ENVIRONMENT:', viteEnv);
    return viteEnv;
  }
  
  // Priority 2: NODE_ENV (build-time indicator)
  const nodeEnv = import.meta.env.NODE_ENV;
  console.log('[EnvironmentService] NODE_ENV:', nodeEnv);
  
  if (nodeEnv === 'production') {
    console.log('[EnvironmentService] Environment detected from NODE_ENV (production)');
    return 'production';
  }
  
  // Priority 3: Vite mode (fallback)
  const mode = import.meta.env.MODE;
  console.log('[EnvironmentService] MODE:', mode);
  
  if (mode === 'production') {
    console.log('[EnvironmentService] Environment detected from MODE (production)');
    return 'production';
  }
  
  // Priority 4: Check for production-specific environment variables
  const prodApiUrl = import.meta.env.VITE_PROD_API_BASE_URL;
  const devApiUrl = import.meta.env.VITE_DEV_API_BASE_URL;
  
  if (prodApiUrl && !devApiUrl) {
    console.log('[EnvironmentService] Environment detected as production (has prod vars, no dev vars)');
    return 'production';
  }
  
  // Default to development with warning
  console.warn('[EnvironmentService] Could not reliably detect environment, defaulting to development');
  console.log('[EnvironmentService] Available env indicators:', {
    VITE_ENVIRONMENT: viteEnv,
    NODE_ENV: nodeEnv,
    MODE: mode,
    hasProdVars: !!prodApiUrl,
    hasDevVars: !!devApiUrl
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
      baseUrl: import.meta.env.VITE_PROD_BASE_URL || 'https://clipify0.el.r.appspot.com/',
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
    baseUrl: import.meta.env.VITE_DEV_API_BASE_URL || 'https://clipify0.el.r.appspot.com',
    timeout: parseInt(import.meta.env.VITE_DEV_API_TIMEOUT || '10000')
  };
  console.log('[EnvironmentService] Development API config:', config);
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
    tauri: getTauriConfig(env),
    logLevel: getLogLevel(env) as 'debug' | 'info' | 'warn' | 'error'
  };
  
  console.log('[EnvironmentService] Complete environment config:', config);
  
  return config;
};



// Export singleton instance with current environment config
export const environmentConfig = getEnvironmentConfig();

console.log('[EnvironmentService] Environment config initialized:', environmentConfig);