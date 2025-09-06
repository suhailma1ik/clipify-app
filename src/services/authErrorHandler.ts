/**
 * Authentication Error Handler
 * Centralized handling of authentication errors and automatic logout
 */

import { getAuthService } from './authService';
import { getLoggingService } from './loggingService';

export class AuthErrorHandler {
    private static instance: AuthErrorHandler | null = null;
    private isHandlingAuthError = false;

    private constructor() { }

    public static getInstance(): AuthErrorHandler {
        if (!AuthErrorHandler.instance) {
            AuthErrorHandler.instance = new AuthErrorHandler();
        }
        return AuthErrorHandler.instance;
    }

    /**
     * Handle authentication errors and trigger logout if necessary
     * @param error - The error that occurred
     * @param context - Context where the error occurred
     */
    public async handleAuthError(error: Error, context: string = 'unknown'): Promise<void> {
        // Prevent multiple simultaneous auth error handling
        if (this.isHandlingAuthError) {
            console.log('[AuthErrorHandler] Already handling auth error, skipping');
            return;
        }

        try {
            this.isHandlingAuthError = true;

            const errorMessage = error.message?.toLowerCase() || '';

            // Check if this is an authentication-related error
            if (
                errorMessage.includes('authentication_required') ||
                errorMessage.includes('unauthorized') ||
                errorMessage.includes('invalid or expired token') ||
                errorMessage.includes('token refresh failed')
            ) {
                console.warn(`[AuthErrorHandler] Authentication error detected in ${context}:`, error.message || 'No error message');
                getLoggingService().warn('auth', `Authentication error in ${context}`, error);

                // Trigger logout to clear all tokens and redirect to login
                const authService = getAuthService();
                await authService.logout();

                console.log('[AuthErrorHandler] User logged out due to authentication error');
            }
        } catch (logoutError) {
            console.error('[AuthErrorHandler] Failed to handle auth error:', logoutError);
            getLoggingService().error('auth', 'Failed to handle authentication error', logoutError as Error);
        } finally {
            this.isHandlingAuthError = false;
        }
    }

    /**
     * Check if an error is authentication-related
     * @param error - The error to check
     * @returns True if the error is authentication-related
     */
    public isAuthError(error: Error): boolean {
        const errorMessage = error.message?.toLowerCase() || '';
        return (
            errorMessage.includes('authentication_required') ||
            errorMessage.includes('unauthorized') ||
            errorMessage.includes('invalid or expired token') ||
            errorMessage.includes('token refresh failed') ||
            errorMessage.includes('401') ||
            errorMessage.includes('403')
        );
    }
}

// Export singleton getter
export const getAuthErrorHandler = (): AuthErrorHandler => {
    return AuthErrorHandler.getInstance();
};