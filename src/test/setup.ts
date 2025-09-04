// Test setup file
import '@testing-library/jest-dom';

// Mock environment variables
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_ENVIRONMENT: 'development',
    VITE_DEV_BASE_URL: 'http://localhost:5173/',
    VITE_DEV_API_BASE_URL: 'https://clipify0.el.r.appspot.com',
    VITE_DEV_API_TIMEOUT: '10000',
    VITE_DEV_OAUTH_BASE_URL: 'https://clipify0.el.r.appspot.com/api/v1/auth/google/login',
    VITE_DEV_OAUTH_CLIENT_ID: 'clipify-desktop',
    VITE_DEV_OAUTH_REDIRECT_URI: 'appclipify://auth/callback',
    VITE_DEV_OAUTH_SCOPE: 'openid email profile',
    VITE_DEV_TAURI_PORT: '1420',
    VITE_DEV_TAURI_HMR_PORT: '1421',
    VITE_DEV_LOG_LEVEL: 'debug',
    VITE_PROD_BASE_URL: 'https://clipify0.el.r.appspot.com/',
    VITE_PROD_API_BASE_URL: 'https://clipify0.el.r.appspot.com',
    VITE_PROD_API_TIMEOUT: '30000',
    VITE_PROD_OAUTH_BASE_URL: 'https://clipify0.el.r.appspot.com/api/v1/auth/google/login',
    VITE_PROD_OAUTH_CLIENT_ID: 'clipify-desktop',
    VITE_PROD_OAUTH_REDIRECT_URI: 'appclipify://auth/callback',
    VITE_PROD_OAUTH_SCOPE: 'openid email profile',
    VITE_PROD_LOG_LEVEL: 'info'
  }
});