# Enhanced Token Refresh and Auto-Logout Implementation

## Overview

This implementation provides automatic token refresh on 401 errors and automatic logout when refresh tokens are invalid or expired.

## How It Works

### 1. Token Refresh Flow

When an API request receives a 401 Unauthorized response:

1. **ApiClientService** detects the 401 error
2. Calls **TokenRefreshService** to attempt token refresh
3. If refresh succeeds, retries the original request with new token
4. If refresh fails, triggers logout through **AuthErrorHandler**

### 2. Refresh Token Validation

The **TokenRefreshService** handles refresh token validation:

- If refresh token request returns 401/403 → clears all tokens (invalid/expired refresh token)
- If refresh token request returns other errors → keeps tokens (temporary server issue)
- If refresh succeeds → stores new access token and refresh token

### 3. Automatic Logout

The **AuthErrorHandler** provides centralized authentication error handling:

- Detects authentication-related errors
- Triggers logout through **AuthService**
- Prevents multiple simultaneous logout attempts
- Logs authentication errors for debugging

## Key Components

### AuthErrorHandler (`src/services/authErrorHandler.ts`)

```typescript
// Centralized auth error handling
const authErrorHandler = getAuthErrorHandler();

// Check if error is auth-related
if (authErrorHandler.isAuthError(error)) {
  await authErrorHandler.handleAuthError(error, 'context');
}
```

### Enhanced TokenRefreshService

- Automatically clears tokens when refresh token is invalid (401/403)
- Preserves tokens for temporary server errors (500, etc.)
- Stores new tokens when refresh succeeds

### Enhanced ApiClientService

- Automatic retry with new token after successful refresh
- Triggers logout when all tokens are cleared
- Handles authentication errors gracefully

## Usage in Components

### Using the Auth Error Handler Hook

```typescript
import { useAuthErrorHandler } from '../hooks/useAuthErrorHandler';

const MyComponent = () => {
  const { handleError, isAuthError } = useAuthErrorHandler();

  const handleApiCall = async () => {
    try {
      await apiCall();
    } catch (error) {
      if (error instanceof Error && isAuthError(error)) {
        await handleError(error, 'MyComponent');
        // User will be logged out automatically
      } else {
        // Handle other errors
      }
    }
  };
};
```

### Automatic Handling in Hooks

The `useManualRephrase` and `useAutoRephrase` hooks now automatically handle authentication errors:

```typescript
} catch (error) {
  if (error instanceof Error && isAuthError(error)) {
    await handleError(error, 'useManualRephrase');
    showNotification('Authentication expired. Please log in again.', 'error');
  } else {
    // Handle other errors
  }
}
```

## Error Messages That Trigger Logout

The system recognizes these error patterns as authentication errors:

- `"authentication_required"`
- `"unauthorized"`
- `"invalid or expired token"`
- `"token refresh failed"`
- `"401"`
- `"403"`

## Benefits

1. **Seamless User Experience**: Automatic token refresh keeps users logged in
2. **Security**: Invalid tokens are immediately cleared and user is logged out
3. **Reliability**: Handles edge cases like expired refresh tokens
4. **Centralized**: All authentication error handling in one place
5. **Testable**: Modular design with clear separation of concerns

## Testing

The `AuthErrorHandler` includes comprehensive tests covering:

- Authentication error detection
- Automatic logout triggering
- Error handling edge cases
- Singleton behavior

Run tests with:
```bash
npm test -- authErrorHandler.test.ts
```

## Error Scenarios Handled

1. **Access token expired** → Automatic refresh → Continue with new token
2. **Refresh token expired** → Clear all tokens → Logout user
3. **Refresh token invalid** → Clear all tokens → Logout user
4. **Server temporarily down** → Keep tokens → Show error message
5. **Network error during refresh** → Keep tokens → Show error message

This implementation ensures users have a smooth experience while maintaining security by immediately logging out users with invalid credentials.