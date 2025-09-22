import { describe, it, expect } from 'vitest';
import { API_BASE_URL, ENVIRONMENT, isProduction, isDevelopment } from '../env';

describe('env utilities', () => {
  describe('API_BASE_URL', () => {
    it('should be a valid URL string', () => {
      expect(typeof API_BASE_URL).toBe('string');
      expect(API_BASE_URL.length).toBeGreaterThan(0);
      expect(API_BASE_URL.startsWith('http')).toBe(true);
    });

    it('should use default URL in test environment', () => {
      // In test environment, it should use the actual configured value
      expect(API_BASE_URL).toBe('http://localhost:8080');
    });
  });

  describe('ENVIRONMENT', () => {
    it('should be a valid environment string', () => {
      expect(typeof ENVIRONMENT).toBe('string');
      expect(ENVIRONMENT.length).toBeGreaterThan(0);
    });

    it('should use default environment in test', () => {
      // In test environment, it should use the default value
      expect(ENVIRONMENT).toBe('development');
    });
  });

  describe('isProduction', () => {
    it('should be a function', () => {
      expect(typeof isProduction).toBe('function');
    });

    it('should return boolean', () => {
      const result = isProduction();
      expect(typeof result).toBe('boolean');
    });

    it('should return false in test environment', () => {
      // Since ENVIRONMENT is 'development' in test, isProduction should return false
      expect(isProduction()).toBe(false);
    });

    it('should be consistent with ENVIRONMENT value', () => {
      expect(isProduction()).toBe(ENVIRONMENT === 'production');
    });
  });

  describe('isDevelopment', () => {
    it('should be a function', () => {
      expect(typeof isDevelopment).toBe('function');
    });

    it('should return boolean', () => {
      const result = isDevelopment();
      expect(typeof result).toBe('boolean');
    });

    it('should return true in test environment', () => {
      // Since ENVIRONMENT is 'development' in test, isDevelopment should return true
      expect(isDevelopment()).toBe(true);
    });

    it('should be consistent with ENVIRONMENT value', () => {
      expect(isDevelopment()).toBe(ENVIRONMENT === 'development');
    });
  });

  describe('environment functions consistency', () => {
    it('should ensure isProduction and isDevelopment are mutually exclusive', () => {
      const prod = isProduction();
      const dev = isDevelopment();
      
      // They should not both be true at the same time
      expect(prod && dev).toBe(false);
      
      // For standard environments (production/development), one should be true
      if (ENVIRONMENT === 'production' || ENVIRONMENT === 'development') {
        expect(prod || dev).toBe(true);
      }
    });

    it('should have consistent return values', () => {
      // Multiple calls should return the same values
      expect(isProduction()).toBe(isProduction());
      expect(isDevelopment()).toBe(isDevelopment());
    });
  });

  describe('exported values', () => {
    it('should export all required values', () => {
      expect(API_BASE_URL).toBeDefined();
      expect(ENVIRONMENT).toBeDefined();
      expect(isProduction).toBeDefined();
      expect(isDevelopment).toBeDefined();
    });

    it('should have correct types', () => {
      expect(typeof API_BASE_URL).toBe('string');
      expect(typeof ENVIRONMENT).toBe('string');
      expect(typeof isProduction).toBe('function');
      expect(typeof isDevelopment).toBe('function');
    });
  });
});