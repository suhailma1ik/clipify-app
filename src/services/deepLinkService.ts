import { listen } from '@tauri-apps/api/event';
import { oauthService } from './oauthService';

/**
 * Deep link callback handler interface
 */
export interface DeepLinkHandler {
  onAuthCallback: (authCode: string) => void;
  onError: (error: string) => void;
}

/**
 * Check if running in Tauri environment
 */
const isTauriEnvironment = (): boolean => {
  return typeof window !== 'undefined' && (window as any).__TAURI__ !== undefined;
};

/**
 * Deep link service for handling OAuth callbacks via custom URI scheme
 * Listens for clipify://auth/callback URLs and processes OAuth responses
 * In web environment, provides simulation capabilities for development
 */
export class DeepLinkService {
  private isListening: boolean = false;
  private handler: DeepLinkHandler | null = null;
  private readonly isTauri: boolean;

  constructor() {
    this.isTauri = isTauriEnvironment();
  }

  /**
   * Start listening for deep link events
   * @param handler - Callback handler for processing deep links
   */
  async startListening(handler: DeepLinkHandler): Promise<void> {
    if (this.isListening) {
      console.warn('Deep link service is already listening');
      return;
    }

    this.handler = handler;
    this.isListening = true;

    try {
      let unlisten: (() => void) | null = null;
      
      if (this.isTauri) {
        // Listen for deep link events from Tauri
        unlisten = await listen<string>('deep-link', (event) => {
          console.log('Deep link received:', event.payload);
          this.handleDeepLink(event.payload);
        });
        console.log('Deep link service started listening for OAuth callbacks');
      } else {
        console.log('Deep link service initialized in web environment (simulation mode)');
      }
      
      // Store the unlisten function for cleanup
      (window as any).__deepLinkUnlisten = unlisten;
    } catch (error) {
      console.error('Failed to start deep link listener:', error);
      this.isListening = false;
      throw new Error('Failed to initialize deep link service');
    }
  }

  /**
   * Stop listening for deep link events
   */
  async stopListening(): Promise<void> {
    if (!this.isListening) {
      return;
    }

    try {
      // Call the unlisten function if it exists
      const unlisten = (window as any).__deepLinkUnlisten;
      if (unlisten && typeof unlisten === 'function') {
        unlisten();
        delete (window as any).__deepLinkUnlisten;
      }

      this.isListening = false;
      this.handler = null;
      
      console.log('Deep link service stopped listening');
    } catch (error) {
      console.error('Error stopping deep link listener:', error);
    }
  }

  /**
   * Handle incoming deep link URL
   * @param url - The deep link URL received
   */
  private handleDeepLink(url: string): void {
    console.log('Processing deep link:', url);

    try {
      // Check if this is an OAuth callback URL
      if (!url.startsWith('clipify://auth/callback')) {
        console.log('Non-auth deep link received, ignoring:', url);
        return;
      }

      // Parse the callback URL and validate
      const authCode = oauthService.handleCallback(url);
      
      console.log('OAuth callback processed successfully');
      
      // Notify the handler of successful authentication
      if (this.handler) {
        this.handler.onAuthCallback(authCode);
      } else {
        console.warn('No handler registered for OAuth callback');
      }
    } catch (error) {
      console.error('Deep link processing error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown deep link error';
      
      // Notify the handler of the error
      if (this.handler) {
        this.handler.onError(errorMessage);
      }
    }
  }

  /**
   * Check if the service is currently listening
   * @returns True if listening for deep links
   */
  isActive(): boolean {
    return this.isListening;
  }

  /**
   * Manually trigger deep link processing (for testing)
   * @param url - Deep link URL to process
   */
  async simulateDeepLink(url: string): Promise<void> {
    if (!this.isListening) {
      throw new Error('Deep link service is not active');
    }
    
    console.log('Simulating deep link:', url);
    this.handleDeepLink(url);
  }
}

/**
 * Utility function to validate deep link URL format
 * @param url - URL to validate
 * @returns True if URL is a valid OAuth callback
 */
export function isValidOAuthCallback(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return (
      parsedUrl.protocol === 'clipify:' &&
      parsedUrl.pathname === '//auth/callback' &&
      (parsedUrl.searchParams.has('code') || parsedUrl.searchParams.has('error'))
    );
  } catch {
    return false;
  }
}

/**
 * Extract OAuth parameters from deep link URL
 * @param url - Deep link URL
 * @returns Parsed OAuth parameters
 */
export function parseOAuthDeepLink(url: string) {
  if (!isValidOAuthCallback(url)) {
    throw new Error('Invalid OAuth callback URL format');
  }

  const parsedUrl = new URL(url);
  return {
    code: parsedUrl.searchParams.get('code'),
    state: parsedUrl.searchParams.get('state'),
    error: parsedUrl.searchParams.get('error'),
    error_description: parsedUrl.searchParams.get('error_description')
  };
}

// Export singleton instance
export const deepLinkService = new DeepLinkService();