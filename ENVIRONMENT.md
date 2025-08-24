# Environment Configuration

This document describes the environment configuration system for the Clipify application.

## Overview

The application supports two environments:
- **Development**: For local development and testing
- **Production**: For production builds and deployment

Each environment has its own configuration file with specific settings for URLs, API endpoints, and other environment-specific values.

## Environment Files

### Development Environment (.env.development)
```bash
# Environment identifier
VITE_DEV_ENVIRONMENT=development

# Frontend Development Server
VITE_DEV_BASE_URL=http://localhost:5173/
VITE_DEV_PORT=5173

# Backend API Configuration  
VITE_DEV_API_BASE_URL=http://localhost:8080
VITE_DEV_API_TIMEOUT=10000

# OAuth Configuration
VITE_DEV_OAUTH_BASE_URL=http://localhost:8080/api/v1/auth/google/login
VITE_DEV_OAUTH_CLIENT_ID=clipify-desktop
VITE_DEV_OAUTH_REDIRECT_URI=clipify://auth/callback
VITE_DEV_OAUTH_SCOPE=openid email profile

# Tauri Development Server
VITE_DEV_TAURI_PORT=1420
VITE_DEV_TAURI_HMR_PORT=1421

# Logging Level
VITE_DEV_LOG_LEVEL=debug
```

### Production Environment (.env.production)
```bash
# Environment identifier
VITE_PROD_ENVIRONMENT=production

# Frontend Base URL
VITE_PROD_BASE_URL=https://clipify.space/

# Backend API Configuration
VITE_PROD_API_BASE_URL=https://clipify.space
VITE_PROD_API_TIMEOUT=30000

# OAuth Configuration
VITE_PROD_OAUTH_BASE_URL=https://clipify.space/api/v1/auth/google/login
VITE_PROD_OAUTH_CLIENT_ID=clipify-desktop
VITE_PROD_OAUTH_REDIRECT_URI=clipify://auth/callback
VITE_PROD_OAUTH_SCOPE=openid email profile

# Logging Level
VITE_PROD_LOG_LEVEL=info
```

## Environment Variables Reference

| Variable | Description | Development Default | Production Default |
|----------|-------------|---------------------|--------------------|
| `VITE_DEV_ENVIRONMENT` / `VITE_PROD_ENVIRONMENT` | Environment identifier | `development` | `production` |
| `VITE_DEV_BASE_URL` / `VITE_PROD_BASE_URL` | Frontend base URL | `http://localhost:5173/` | `https://clipify.space/` |
| `VITE_DEV_PORT` / `VITE_PROD_PORT` | Frontend server port | `5173` | `5173` |
| `VITE_DEV_API_BASE_URL` / `VITE_PROD_API_BASE_URL` | Backend API base URL | `http://localhost:8080` | `https://clipify.space` |
| `VITE_DEV_API_TIMEOUT` / `VITE_PROD_API_TIMEOUT` | API request timeout (ms) | `10000` | `30000` |
| `VITE_DEV_OAUTH_BASE_URL` / `VITE_PROD_OAUTH_BASE_URL` | OAuth endpoint URL | `http://localhost:8080/api/v1/auth/google/login` | `https://clipify.space/api/v1/auth/google/login` |
| `VITE_DEV_OAUTH_CLIENT_ID` / `VITE_PROD_OAUTH_CLIENT_ID` | OAuth client ID | `clipify-desktop` | `clipify-desktop` |
| `VITE_DEV_OAUTH_REDIRECT_URI` / `VITE_PROD_OAUTH_REDIRECT_URI` | OAuth redirect URI | `clipify://auth/callback` | `clipify://auth/callback` |
| `VITE_DEV_OAUTH_SCOPE` / `VITE_PROD_OAUTH_SCOPE` | OAuth scope | `openid email profile` | `openid email profile` |
| `VITE_DEV_TAURI_PORT` / `VITE_PROD_TAURI_PORT` | Tauri development server port | `1420` | `1420` |
| `VITE_DEV_TAURI_HMR_PORT` / `VITE_PROD_TAURI_HMR_PORT` | Tauri HMR port | `1421` | `1421` |
| `VITE_DEV_LOG_LEVEL` / `VITE_PROD_LOG_LEVEL` | Logging level | `debug` | `info` |

## Tauri Configuration Files

The application also includes environment-specific Tauri configuration files:

- `tauri.dev.conf.json`: Development configuration
- `tauri.prod.conf.json`: Production configuration

These files contain environment-specific settings for the Tauri desktop application.

## Usage

### Development
```bash
# Start development server with development environment
npm run dev:dev

# Start development server with production environment
npm run dev:prod

# Start Tauri development with development environment
npm run tauri:dev:dev

# Start Tauri development with production environment
npm run tauri:dev:prod
```

### Building
```bash
# Build with development environment
npm run build:dev

# Build with production environment
npm run build:prod

# Build Tauri app with development environment
npm run tauri:build:dev

# Build Tauri app with production environment
npm run tauri:build:prod
```

## Environment Detection

The application automatically detects the current environment based on:
1. Explicit `VITE_ENVIRONMENT` environment variable
2. `NODE_ENV` environment variable
3. Defaults to `development` if neither is set

Services and components can access environment configuration through the `environmentService`:

```typescript
import { environmentConfig, getEnvVar } from './services/environmentService';

// Get current environment configuration
const config = environmentConfig;

// Get specific environment variable
const apiUrl = getEnvVar('API_BASE_URL');
```

## Best Practices

1. Always use environment variables for configuration values that change between environments
2. Never hardcode environment-specific values in the source code
3. Use the environment service for accessing configuration values
4. Test both development and production configurations before deployment
5. Keep environment files in version control but exclude sensitive values