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
    console.log('[DeepLinkService] Initialized, isTauri:', this.isTauri);
  }

  /**
   * Start listening for deep link events
   * @param handler - Callback handler for processing deep links
   */
  async startListening(handler: DeepLinkHandler): Promise<void> {
    console.log('[DeepLinkService] Starting to listen for deep links');
    
    if (this.isListening) {
      console.warn('[DeepLinkService] Deep link service is already listening');
      return;
    }

    this.handler = handler;
    this.isListening = true;

    try {
      let unlisten: (() => void) | null = null;
      
      if (this.isTauri) {
        console.log('[DeepLinkService] Setting up Tauri deep link listener');
        // Listen for deep link events from Tauri
        unlisten = await listen<string>('deep-link', (event) => {
          console.log('[DeepLinkService] Deep link received:', event.payload);
          this.handleDeepLink(event.payload);
        });
        console.log('[DeepLinkService] Deep link service started listening for OAuth callbacks');
      } else {
        console.log('[DeepLinkService] Deep link service initialized in web environment (simulation mode)');
      }
      
      // Store the unlisten function for cleanup
      (window as any).__deepLinkUnlisten = unlisten;
    } catch (error) {
      console.error('[DeepLinkService] Failed to start deep link listener:', error);
      this.isListening = false;
      throw new Error('Failed to initialize deep link service');
    }
  }

  /**
   * Stop listening for deep link events
   */
  async stopListening(): Promise<void> {
    console.log('[DeepLinkService] Stopping deep link listener');
    
    if (!this.isListening) {
      console.log('[DeepLinkService] Not currently listening, nothing to stop');
      return;
    }

    try {
      // Call the unlisten function if it exists
      const unlisten = (window as any).__deepLinkUnlisten;
      if (unlisten && typeof unlisten === 'function') {
        console.log('[DeepLinkService] Calling unlisten function');
        unlisten();
        delete (window as any).__deepLinkUnlisten;
      }

      this.isListening = false;
      this.handler = null;
      
      console.log('[DeepLinkService] Deep link service stopped listening');
    } catch (error) {
      console.error('[DeepLinkService] Error stopping deep link listener:', error);
    }
  }

  /**
   * Handle incoming deep link URL
   * @param url - The deep link URL received
   */
  private handleDeepLink(url: string): void {
    console.log('[DeepLinkService] Processing deep link:', url);

    try {
      // Check if this is an OAuth callback URL
      if (!url.startsWith('clipify://auth/callback')) {
        console.log('[DeepLinkService] Non-auth deep link received, ignoring:', url);
        return;
      }

      console.log('[DeepLinkService] Processing OAuth callback URL');
      // Parse the callback URL and validate
      const authCode = oauthService.handleCallback(url);
      
      console.log('[DeepLinkService] OAuth callback processed successfully, auth code:', authCode.substring(0, 10) + '...');
      
      // Notify the handler of successful authentication
      if (this.handler) {
        console.log('[DeepLinkService] Notifying handler of successful authentication');
        this.handler.onAuthCallback(authCode);
      } else {
        console.warn('[DeepLinkService] No handler registered for OAuth callback');
      }
    } catch (error) {
      console.error('[DeepLinkService] Deep link processing error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown deep link error';
      console.error('[DeepLinkService] Error message:', errorMessage);
      
      // Notify the handler of the error
      if (this.handler) {
        console.log('[DeepLinkService] Notifying handler of error');
        this.handler.onError(errorMessage);
      }
    }
  }

  /**
   * Check if the service is currently listening
   * @returns True if listening for deep links
   */
  isActive(): boolean {
    console.log('[DeepLinkService] Checking if service is active:', this.isListening);
    return this.isListening;
  }

  /**
   * Manually trigger deep link processing (for testing)
   * @param url - Deep link URL to process
   */
  async simulateDeepLink(url: string): Promise<void> {
    console.log('[DeepLinkService] Simulating deep link:', url);
    
    if (!this.isListening) {
      console.error('[DeepLinkService] Deep link service is not active');
      throw new Error('Deep link service is not active');
    }
    
    console.log('[DeepLinkService] Processing simulated deep link');
    this.handleDeepLink(url);
  }
}