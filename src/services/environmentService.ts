/**
 * Environment Service
 * Centralized configuration management for different environments
 */

import { Environment, EnvironmentConfig, OAuthConfig, ApiConfig } from '../types/environment';

/**
 * Detect current environment
 * @returns Current environment
 */
export const detectEnvironment = (): Environment => {
  // Check for explicit environment variable
  const envVar = import.meta.env.VITE_ENVIRONMENT;
  if (envVar === 'production') return 'production';
  if (envVar === 'development') return 'development';
  
  // Check NODE_ENV
  const nodeEnv = import.meta.env.NODE_ENV;
  if (nodeEnv === 'production') return 'production';
  if (nodeEnv === 'development') return 'development';
  
  // Default to development
  return 'development';
};

/**
 * Get frontend configuration based on environment
 * @param environment Current environment
 * @returns Frontend configuration
 */
const getFrontendConfig = (environment: Environment) => {
  if (environment === 'production') {
    return {
      baseUrl: import.meta.env.VITE_PROD_BASE_URL || 'https://clipify.space/',
      port: parseInt(import.meta.env.VITE_PROD_PORT || '5173')
    };
  }
  
  // Development configuration
  return {
    baseUrl: import.meta.env.VITE_DEV_BASE_URL || 'http://localhost:5173/',
    port: parseInt(import.meta.env.VITE_DEV_PORT || '5173')
  };
};

/**
 * Get API configuration based on environment
 * @param environment Current environment
 * @returns API configuration
 */
const getApiConfig = (environment: Environment): ApiConfig => {
  if (environment === 'production') {
    return {
      baseUrl: import.meta.env.VITE_PROD_API_BASE_URL || 'https://clipify.space',
      timeout: parseInt(import.meta.env.VITE_PROD_API_TIMEOUT || '30000')
    };
  }
  
  // Development configuration
  return {
    baseUrl: import.meta.env.VITE_DEV_API_BASE_URL || 'http://localhost:8080',
    timeout: parseInt(import.meta.env.VITE_DEV_API_TIMEOUT || '10000')
  };
};

/**
 * Get OAuth configuration based on environment
 * @param environment Current environment
 * @returns OAuth configuration
 */
const getOAuthConfig = (environment: Environment): OAuthConfig => {
  if (environment === 'production') {
    return {
      baseUrl: import.meta.env.VITE_PROD_OAUTH_BASE_URL || 'https://clipify.space/api/v1/auth/google/login',
      clientId: import.meta.env.VITE_PROD_OAUTH_CLIENT_ID || 'clipify-desktop',
      redirectUri: import.meta.env.VITE_PROD_OAUTH_REDIRECT_URI || 'clipify://auth/callback',
      scope: import.meta.env.VITE_PROD_OAUTH_SCOPE || 'openid email profile'
    };
  }
  
  // Development configuration
  return {
    baseUrl: import.meta.env.VITE_DEV_OAUTH_BASE_URL || 'http://localhost:8080/api/v1/auth/google/login',
    clientId: import.meta.env.VITE_DEV_OAUTH_CLIENT_ID || 'clipify-desktop',
    redirectUri: import.meta.env.VITE_DEV_OAUTH_REDIRECT_URI || 'clipify://auth/callback',
    scope: import.meta.env.VITE_DEV_OAUTH_SCOPE || 'openid email profile'
  };
};

/**
 * Get Tauri-specific configuration based on environment
 * @param environment Current environment
 * @returns Tauri configuration
 */
const getTauriConfig = (environment: Environment) => {
  if (environment === 'production') {
    return {
      port: parseInt(import.meta.env.VITE_PROD_TAURI_PORT || '1420'),
      hmrPort: parseInt(import.meta.env.VITE_PROD_TAURI_HMR_PORT || '1421')
    };
  }
  
  // Development configuration
  return {
    port: parseInt(import.meta.env.VITE_DEV_TAURI_PORT || '1420'),
    hmrPort: parseInt(import.meta.env.VITE_DEV_TAURI_HMR_PORT || '1421')
  };
};

/**
 * Get logging level based on environment
 * @param environment Current environment
 * @returns Logging level
 */
const getLogLevel = (environment: Environment) => {
  if (environment === 'production') {
    return import.meta.env.VITE_PROD_LOG_LEVEL || 'info';
  }
  
  // Development configuration
  return import.meta.env.VITE_DEV_LOG_LEVEL || 'debug';
};

/**
 * Get complete environment configuration
 * @param environment Optional environment to use, otherwise auto-detect
 * @returns Complete environment configuration
 */
export const getEnvironmentConfig = (environment?: Environment): EnvironmentConfig => {
  const env = environment || detectEnvironment();
  
  return {
    environment: env,
    frontend: getFrontendConfig(env),
    api: getApiConfig(env),
    oauth: getOAuthConfig(env),
    tauri: getTauriConfig(env),
    logLevel: getLogLevel(env) as 'debug' | 'info' | 'warn' | 'error'
  };
};

/**
 * Get environment-specific variable
 * @param key Variable key
 * @param environment Optional environment to use, otherwise auto-detect
 * @returns Environment variable value
 */
export const getEnvVar = (key: string, environment?: Environment): string | undefined => {
  const env = environment || detectEnvironment();
  const prefix = env === 'production' ? 'VITE_PROD_' : 'VITE_DEV_';
  return import.meta.env[`${prefix}${key}`];
};

// Export singleton instance with current environment config
export const environmentConfig = getEnvironmentConfig();

// Export utility functions
export default {
  detectEnvironment,
  getEnvironmentConfig,
  getEnvVar,
  environmentConfig
};