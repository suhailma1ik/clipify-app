import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  detectEnvironment, 
  getEnvironmentConfig, 
  getEnvVar,
  environmentConfig
} from '../services/environmentService';
import { Environment } from '../types/environment';

describe('Environment Service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('detectEnvironment', () => {
    it('should detect development environment from VITE_ENVIRONMENT', () => {
      // @ts-ignore
      import.meta.env = { VITE_ENVIRONMENT: 'development' };
      expect(detectEnvironment()).toBe('development');
    });

    it('should detect production environment from VITE_ENVIRONMENT', () => {
      // @ts-ignore
      import.meta.env = { VITE_ENVIRONMENT: 'production' };
      expect(detectEnvironment()).toBe('production');
    });

    it('should detect development environment from NODE_ENV', () => {
      // @ts-ignore
      import.meta.env = { NODE_ENV: 'development' };
      expect(detectEnvironment()).toBe('development');
    });

    it('should detect production environment from NODE_ENV', () => {
      // @ts-ignore
      import.meta.env = { NODE_ENV: 'production' };
      expect(detectEnvironment()).toBe('production');
    });

    it('should default to development when no environment is specified', () => {
      // @ts-ignore
      import.meta.env = {};
      expect(detectEnvironment()).toBe('development');
    });
  });

  describe('getEnvironmentConfig', () => {
    it('should return development configuration when environment is development', () => {
      // @ts-ignore
      import.meta.env = {
        VITE_DEV_BASE_URL: 'http://localhost:5173/',
        VITE_DEV_API_BASE_URL: 'http://localhost:8080',
        VITE_DEV_API_TIMEOUT: '10000',
        VITE_DEV_OAUTH_BASE_URL: 'http://localhost:8080/api/v1/auth/google/login',
        VITE_DEV_OAUTH_CLIENT_ID: 'clipify-desktop',
        VITE_DEV_OAUTH_REDIRECT_URI: 'clipify://auth/callback',
        VITE_DEV_OAUTH_SCOPE: 'openid email profile',
        VITE_DEV_TAURI_PORT: '1420',
        VITE_DEV_TAURI_HMR_PORT: '1421',
        VITE_DEV_LOG_LEVEL: 'debug'
      };

      const config = getEnvironmentConfig('development');
      
      expect(config.environment).toBe('development');
      expect(config.frontend.baseUrl).toBe('http://localhost:5173/');
      expect(config.api.baseUrl).toBe('http://localhost:8080');
      expect(config.api.timeout).toBe(10000);
      expect(config.oauth.baseUrl).toBe('http://localhost:8080/api/v1/auth/google/login');
      expect(config.oauth.clientId).toBe('clipify-desktop');
      expect(config.oauth.redirectUri).toBe('clipify://auth/callback');
      expect(config.oauth.scope).toBe('openid email profile');
      expect(config.tauri?.port).toBe(1420);
      expect(config.tauri?.hmrPort).toBe(1421);
      expect(config.logLevel).toBe('debug');
    });

    it('should return production configuration when environment is production', () => {
      // @ts-ignore
      import.meta.env = {
        VITE_PROD_BASE_URL: 'https://clipify.space/',
        VITE_PROD_API_BASE_URL: 'https://clipify.space',
        VITE_PROD_API_TIMEOUT: '30000',
        VITE_PROD_OAUTH_BASE_URL: 'https://clipify.space/api/v1/auth/google/login',
        VITE_PROD_OAUTH_CLIENT_ID: 'clipify-desktop',
        VITE_PROD_OAUTH_REDIRECT_URI: 'clipify://auth/callback',
        VITE_PROD_OAUTH_SCOPE: 'openid email profile',
        VITE_PROD_LOG_LEVEL: 'info'
      };

      const config = getEnvironmentConfig('production');
      
      expect(config.environment).toBe('production');
      expect(config.frontend.baseUrl).toBe('https://clipify.space/');
      expect(config.api.baseUrl).toBe('https://clipify.space');
      expect(config.api.timeout).toBe(30000);
      expect(config.oauth.baseUrl).toBe('https://clipify.space/api/v1/auth/google/login');
      expect(config.oauth.clientId).toBe('clipify-desktop');
      expect(config.oauth.redirectUri).toBe('clipify://auth/callback');
      expect(config.oauth.scope).toBe('openid email profile');
      expect(config.logLevel).toBe('info');
    });
  });

  describe('getEnvVar', () => {
    it('should return development variable when environment is development', () => {
      // @ts-ignore
      import.meta.env = { VITE_DEV_BASE_URL: 'http://localhost:5173/' };
      
      const result = getEnvVar('BASE_URL', 'development');
      expect(result).toBe('http://localhost:5173/');
    });

    it('should return production variable when environment is production', () => {
      // @ts-ignore
      import.meta.env = { VITE_PROD_BASE_URL: 'https://clipify.space/' };
      
      const result = getEnvVar('BASE_URL', 'production');
      expect(result).toBe('https://clipify.space/');
    });
  });

  describe('environmentConfig', () => {
    it('should export a default environment configuration', () => {
      expect(environmentConfig).toBeDefined();
      expect(environmentConfig.environment).toBeDefined();
      expect(environmentConfig.frontend).toBeDefined();
      expect(environmentConfig.api).toBeDefined();
      expect(environmentConfig.oauth).toBeDefined();
    });
  });
});