/**
 * Environment types for application configuration
 */

export type Environment = 'development' | 'production';

/**
 * OAuth configuration interface
 */
export interface OAuthConfig {
  baseUrl: string;
  clientId: string;
  redirectUri: string;
  scope: string;
}

/**
 * API configuration interface
 */
export interface ApiConfig {
  baseUrl: string;
  timeout: number;
}

/**
 * Frontend configuration interface
 */
export interface FrontendConfig {
  baseUrl: string;
  port?: number;
}

/**
 * Tauri-specific configuration interface
 */
export interface TauriConfig {
  port?: number;
  hmrPort?: number;
}

/**
 * Complete environment configuration interface
 */
export interface EnvironmentConfig {
  environment: Environment;
  frontend: FrontendConfig;
  api: ApiConfig;
  oauth: OAuthConfig;
  tauri?: TauriConfig;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Environment variable keys for runtime access
 */
export interface EnvironmentVariables {
  ENVIRONMENT: string;
  BASE_URL: string;
  PORT?: string;
  API_BASE_URL: string;
  API_TIMEOUT: string;
  OAUTH_BASE_URL: string;
  OAUTH_CLIENT_ID: string;
  OAUTH_REDIRECT_URI: string;
  OAUTH_SCOPE: string;
  TAURI_PORT?: string;
  TAURI_HMR_PORT?: string;
  LOG_LEVEL: string;
}

/**
 * Vite environment variables (prefixed based on environment)
 */
export interface ViteEnvironmentVariables {
  VITE_DEV_ENVIRONMENT?: string;
  VITE_DEV_BASE_URL?: string;
  VITE_DEV_PORT?: string;
  VITE_DEV_API_BASE_URL?: string;
  VITE_DEV_API_TIMEOUT?: string;
  VITE_DEV_OAUTH_BASE_URL?: string;
  VITE_DEV_OAUTH_CLIENT_ID?: string;
  VITE_DEV_OAUTH_REDIRECT_URI?: string;
  VITE_DEV_OAUTH_SCOPE?: string;
  VITE_DEV_TAURI_PORT?: string;
  VITE_DEV_TAURI_HMR_PORT?: string;
  VITE_DEV_LOG_LEVEL?: string;
  
  VITE_PROD_ENVIRONMENT?: string;
  VITE_PROD_BASE_URL?: string;
  VITE_PROD_API_BASE_URL?: string;
  VITE_PROD_API_TIMEOUT?: string;
  VITE_PROD_OAUTH_BASE_URL?: string;
  VITE_PROD_OAUTH_CLIENT_ID?: string;
  VITE_PROD_OAUTH_REDIRECT_URI?: string;
  VITE_PROD_OAUTH_SCOPE?: string;
  VITE_PROD_LOG_LEVEL?: string;
}