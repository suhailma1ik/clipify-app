// Environment configuration utility
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://clipify0.el.r.appspot.com';
export const ENVIRONMENT = import.meta.env.VITE_ENVIRONMENT || 'development';

export const isProduction = () => ENVIRONMENT === 'production';
export const isDevelopment = () => ENVIRONMENT === 'development';

// Log current environment configuration
console.log(`[Environment] Running in ${ENVIRONMENT} mode`);
console.log(`[Environment] API Base URL: ${API_BASE_URL}`);