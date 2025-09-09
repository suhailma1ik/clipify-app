import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async ({ mode }) => {
  // Load environment variables based on Vite mode (development/production)
  const env = loadEnv(mode, process.cwd(), '');
  
  // Determine environment configuration based on mode
  const getEnvConfig = () => {
    if (mode === 'production') {
      return {
        port: parseInt(env.VITE_PROD_TAURI_PORT || '1420'),
        hmrPort: parseInt(env.VITE_PROD_TAURI_HMR_PORT || '1421'),
        baseUrl: env.VITE_PROD_BASE_URL || 'https://clipify0.el.r.appspot.com/',
        logLevel: env.VITE_PROD_LOG_LEVEL || 'info'
      };
    }
    
    // Development configuration
    return {
      port: parseInt(env.VITE_DEV_TAURI_PORT || '1420'),
      hmrPort: parseInt(env.VITE_DEV_TAURI_HMR_PORT || '1421'),
      baseUrl: env.VITE_DEV_BASE_URL || 'http://localhost:1420',
      logLevel: env.VITE_DEV_LOG_LEVEL || 'debug'
    };
  };

  const envConfig = getEnvConfig();
  
  return ({
  plugins: [react()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: envConfig.port,
    strictPort: false,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: envConfig.hmrPort,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
  
  // Environment-specific logging
  logLevel: envConfig.logLevel as any,
  
  // Base URL configuration - use relative path for Tauri builds
  base: './',
  });
});