/**
 * Environment types for application configuration
 */

export type Environment = 'development' | 'production';

/**
 * API configuration interface
 */
export interface ApiConfig {
  baseUrl: string;
  timeout: number;
}

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
  VITE_DEV_TAURI_PORT?: string;
  VITE_DEV_TAURI_HMR_PORT?: string;
  VITE_DEV_LOG_LEVEL?: string;
  
  VITE_PROD_ENVIRONMENT?: string;
  VITE_PROD_BASE_URL?: string;
  VITE_PROD_API_BASE_URL?: string;
  VITE_PROD_API_TIMEOUT?: string;
  VITE_PROD_LOG_LEVEL?: string;
}

/**
 * Deep link configuration interface
 */
export interface DeepLinkConfig {
  schemes: string[];
  protocolRegistered: boolean;
  tauriConfigPath: string;
  environment: Environment;
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

/**
 * Environment diagnostics interface
 */
export interface EnvironmentDiagnostics {
  detectedEnvironment: Environment;
  configurationSource: 'env-vars' | 'defaults' | 'mixed';
  apiConfig: ApiConfig;
  deepLinkConfig: DeepLinkConfig;
  environmentVariables: Record<string, string | undefined>;
  missingVariables: string[];
  inconsistencies: string[];
  timestamp: number;
}