import { sendNotification, isPermissionGranted, requestPermission } from '@tauri-apps/plugin-notification';

/**
 * Notification types for different user feedback scenarios
 */
export enum NotificationType {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
  PROGRESS = 'progress'
}

/**
 * OAuth flow stages for progress tracking
 */
export enum OAuthFlowStage {
  INITIALIZING = 'initializing',
  BROWSER_OPENING = 'browser_opening',
  USER_AUTHENTICATING = 'user_authenticating',
  WAITING_CALLBACK = 'waiting_callback',
  PROCESSING_CALLBACK = 'processing_callback',
  EXCHANGING_TOKEN = 'exchanging_token',
  STORING_TOKEN = 'storing_token',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

/**
 * Troubleshooting step interface
 */
export interface TroubleshootingStep {
  step: number;
  title: string;
  description: string;
  action?: string;
  isCompleted?: boolean;
}

/**
 * Enhanced notification options with troubleshooting support
 */
export interface EnhancedNotificationOptions {
  title: string;
  body: string;
  type?: NotificationType;
  icon?: string;
  sound?: string;
  persistent?: boolean;
  troubleshootingSteps?: TroubleshootingStep[];
  actions?: string[];
  progress?: {
    current: number;
    total: number;
    stage: string;
  };
}

/**
 * Interface for notification options (legacy compatibility)
 */
export interface NotificationOptions {
  title: string;
  body: string;
  type?: NotificationType;
  icon?: string;
  sound?: string;
  persistent?: boolean;
}

/**
 * Notification service for user feedback
 * Provides cross-platform notifications using Tauri's notification plugin
 */
export class NotificationService {
  private permissionGranted: boolean = false;
  private initialized: boolean = false;

  /**
   * Initialize the notification service
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Check if permission is already granted
      this.permissionGranted = await isPermissionGranted();
      
      // Request permission if not granted
      if (!this.permissionGranted) {
        const permission = await requestPermission();
        this.permissionGranted = permission === 'granted';
        
        // Windows-specific: Retry permission request if failed
        if (!this.permissionGranted && this.isWindows()) {
          console.log('Windows: Retrying notification permission request...');
          await this.delay(1000); // Wait 1 second
          const retryPermission = await requestPermission();
          this.permissionGranted = retryPermission === 'granted';
        }
      }

      this.initialized = true;
      console.log('Notification service initialized. Permission granted:', this.permissionGranted);
      
      // Windows-specific: Log additional debug info
      if (this.isWindows()) {
        console.log('Windows notification system detected');
      }
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
      
      // Windows-specific error handling
      if (this.isWindows()) {
        console.warn('Windows notification initialization failed. This may be due to Windows notification settings or permissions.');
      }
      this.initialized = true; // Set to true to avoid repeated initialization attempts
    }
  }

  /**
   * Send a notification to the user
   */
  async sendNotification(options: NotificationOptions): Promise<boolean> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      if (!this.permissionGranted) {
        console.warn('Notification permission not granted, falling back to console log');
        
        // Windows-specific: Try to request permission again
        if (this.isWindows()) {
          console.log('Windows: Attempting to re-request notification permission...');
          try {
            const permission = await requestPermission();
            this.permissionGranted = permission === 'granted';
            if (!this.permissionGranted) {
              console.warn('Windows: Notification permission still denied after retry');
              console.log(`${options.type?.toUpperCase() || 'NOTIFICATION'}: ${options.title} - ${options.body}`);
              return false;
            }
          } catch (error) {
            console.error('Windows: Failed to re-request notification permission:', error);
            console.log(`${options.type?.toUpperCase() || 'NOTIFICATION'}: ${options.title} - ${options.body}`);
            return false;
          }
        } else {
          console.log(`${options.type?.toUpperCase() || 'NOTIFICATION'}: ${options.title} - ${options.body}`);
          return false;
        }
      }

      await sendNotification({
        title: options.title,
        body: options.body,
        icon: options.icon || this.getDefaultIcon(options.type),
        sound: options.sound || undefined // Use the sound string or undefined
      });

      console.log('Notification sent:', options.title);
      return true;
    } catch (error) {
      console.error('Failed to send notification:', error);
      
      // Windows-specific error handling and retry
      if (this.isWindows()) {
        console.log('Windows: Retrying notification after error...');
        try {
          await this.delay(500);
          await sendNotification({
            title: options.title,
            body: options.body,
            icon: options.icon || this.getDefaultIcon(options.type)
          });
          console.log('Notification sent on retry:', options.title);
          return true;
        } catch (retryError) {
          console.error('Windows: Notification retry also failed:', retryError);
        }
      }
      
      // Fallback to console log
      console.log(`${options.type?.toUpperCase() || 'NOTIFICATION'}: ${options.title} - ${options.body}`);
      return false;
    }
  }

  /**
   * Send a success notification
   */
  async success(title: string, body: string): Promise<boolean> {
    return this.sendNotification({
      title,
      body,
      type: NotificationType.SUCCESS,
      sound: 'default'
    });
  }

  /**
   * Send an error notification
   */
  async error(title: string, body: string): Promise<boolean> {
    return this.sendNotification({
      title,
      body,
      type: NotificationType.ERROR,
      sound: 'default'
    });
  }

  /**
   * Send a warning notification
   */
  async warning(title: string, body: string): Promise<boolean> {
    return this.sendNotification({
      title,
      body,
      type: NotificationType.WARNING,
      sound: 'default'
    });
  }

  /**
   * Send an info notification
   */
  async info(title: string, body: string): Promise<boolean> {
    return this.sendNotification({
      title,
      body,
      type: NotificationType.INFO,
      sound: undefined
    });
  }

  /**
   * Send authentication-specific notifications
   */
  async authSuccess(message: string = 'Successfully logged in!'): Promise<boolean> {
    return this.success('Authentication Successful', message);
  }

  async tokenExpired(): Promise<boolean> {
    return this.warning(
      'Session Expired',
      'Your session has expired. Please log in again to continue.'
    );
  }

  async networkError(): Promise<boolean> {
    return this.error(
      'Connection Problem',
      'Unable to connect to the server. Please check your internet connection.'
    );
  }

  async loginRequired(): Promise<boolean> {
    return this.info(
      'Login Required',
      'Please log in to access Clipify features.'
    );
  }

  /**
   * Get default icon based on notification type
   */
  private getDefaultIcon(_type?: NotificationType): string | undefined {
    // Return undefined to use system default icons
    // In the future, this could return paths to custom icons
    return undefined;
  }

  /**
   * Check if notifications are supported and permitted
   */
  async isAvailable(): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.permissionGranted;
  }

  /**
   * Request notification permission explicitly
   */
  async requestPermission(): Promise<boolean> {
    try {
      const permission = await requestPermission();
      this.permissionGranted = permission === 'granted';
      return this.permissionGranted;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }

  /**
   * Deep link specific notifications
   */
  async deepLinkReceived(url: string, isStartup: boolean = false): Promise<boolean> {
    const title = isStartup ? '🔗 Deep Link (App Launch)' : '🔗 Deep Link Received';
    const formattedUrl = this.formatDeepLinkUrl(url);
    const timestamp = new Date().toLocaleTimeString();
    
    return this.sendNotification({
      title,
      body: `${timestamp}\n${formattedUrl}`,
      type: NotificationType.INFO,
      persistent: true,
      sound: 'default'
    });
  }

  async deepLinkAuth(message: string = 'Authentication deep link received'): Promise<boolean> {
    return this.sendNotification({
      title: '🔐 Authentication Link',
      body: message,
      type: NotificationType.INFO,
      persistent: true,
      sound: 'default'
    });
  }

  async deepLinkError(error: string): Promise<boolean> {
    return this.sendNotification({
      title: '⚠️ Deep Link Error',
      body: `Failed to process deep link: ${error}`,
      type: NotificationType.ERROR,
      persistent: true,
      sound: 'default'
    });
  }

  /**
   * Format deep link URL for display in notifications
   */
  private formatDeepLinkUrl(url: string): string {
    try {
      const parsed = new URL(url);
      
      if (parsed.protocol === 'clipify:') {
        if (parsed.pathname.includes('auth')) {
          return '🔑 Authentication Request';
        }
        return `📦 Clipify Action: ${parsed.pathname.replace('/', '')}`;
      }
      
      // Generic URL formatting
      const host = parsed.hostname || parsed.protocol.replace(':', '');
      const path = parsed.pathname;
      
      if (path && path !== '/') {
        return `${host}${path.length > 30 ? path.substring(0, 27) + '...' : path}`;
      }
      
      return host;
    } catch {
      // Fallback for invalid URLs
      return url.length > 50 ? `${url.substring(0, 47)}...` : url;
    }
  }

  /**
   * Show a silent notification
   */
  async showSilent(title: string, body: string): Promise<boolean> {
    return this.sendNotification({
      title,
      body,
      type: NotificationType.INFO,
      sound: undefined
    });
  }

  /**
   * Check if running on Windows
   */
  private isWindows(): boolean {
    return typeof window !== 'undefined' && window.navigator.platform.toLowerCase().includes('win');
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Enhanced notification with troubleshooting support
   */
  async sendEnhancedNotification(options: EnhancedNotificationOptions): Promise<boolean> {
    let body = options.body;

    // Add progress information if available
    if (options.progress) {
      const progressText = `Progress: ${options.progress.current}/${options.progress.total} - ${options.progress.stage}`;
      body = `${progressText}\n${body}`;
    }

    // Add troubleshooting steps if available
    if (options.troubleshootingSteps && options.troubleshootingSteps.length > 0) {
      const stepsText = options.troubleshootingSteps
        .map(step => `${step.step}. ${step.title}${step.isCompleted ? ' ✓' : ''}`)
        .join('\n');
      body = `${body}\n\nTroubleshooting:\n${stepsText}`;
    }

    // Add action buttons if available
    if (options.actions && options.actions.length > 0) {
      const actionsText = options.actions.join(' | ');
      body = `${body}\n\nActions: ${actionsText}`;
    }

    return this.sendNotification({
      title: options.title,
      body,
      type: options.type,
      icon: options.icon,
      sound: options.sound,
      persistent: options.persistent
    });
  }

  /**
   * Show OAuth flow progress notification
   */
  async showOAuthProgress(stage: OAuthFlowStage, details?: string): Promise<boolean> {
    const stageMessages: Record<OAuthFlowStage, { title: string; body: string; emoji: string }> = {
      [OAuthFlowStage.INITIALIZING]: {
        title: 'Starting Authentication',
        body: 'Preparing OAuth flow...',
        emoji: '🔄'
      },
      [OAuthFlowStage.BROWSER_OPENING]: {
        title: 'Opening Browser',
        body: 'Launching browser for authentication...',
        emoji: '🌐'
      },
      [OAuthFlowStage.USER_AUTHENTICATING]: {
        title: 'Waiting for Login',
        body: 'Please complete authentication in your browser',
        emoji: '🔐'
      },
      [OAuthFlowStage.WAITING_CALLBACK]: {
        title: 'Waiting for Callback',
        body: 'Waiting for authentication callback...',
        emoji: '⏳'
      },
      [OAuthFlowStage.PROCESSING_CALLBACK]: {
        title: 'Processing Callback',
        body: 'Processing authentication response...',
        emoji: '⚙️'
      },
      [OAuthFlowStage.EXCHANGING_TOKEN]: {
        title: 'Exchanging Token',
        body: 'Exchanging authorization code for tokens...',
        emoji: '🔄'
      },
      [OAuthFlowStage.STORING_TOKEN]: {
        title: 'Saving Session',
        body: 'Storing authentication tokens...',
        emoji: '💾'
      },
      [OAuthFlowStage.COMPLETED]: {
        title: 'Authentication Complete',
        body: 'Successfully authenticated!',
        emoji: '✅'
      },
      [OAuthFlowStage.FAILED]: {
        title: 'Authentication Failed',
        body: 'Authentication process failed',
        emoji: '❌'
      }
    };

    const stageInfo = stageMessages[stage];
    const title = `${stageInfo.emoji} ${stageInfo.title}`;
    const body = details ? `${stageInfo.body}\n${details}` : stageInfo.body;

    return this.sendNotification({
      title,
      body,
      type: stage === OAuthFlowStage.COMPLETED ? NotificationType.SUCCESS : 
            stage === OAuthFlowStage.FAILED ? NotificationType.ERROR : 
            NotificationType.INFO,
      sound: stage === OAuthFlowStage.COMPLETED ? 'default' : undefined
    });
  }



  /**
   * Show success notification with completion details
   */
  async showAuthenticationSuccess(details?: {
    duration?: number;
    method?: 'deep_link' | 'manual' | 'fallback';
    retryCount?: number;
  }): Promise<boolean> {
    let body = 'You have successfully logged into Clipify!';
    
    if (details) {
      const methodText = details.method === 'deep_link' ? 'Deep Link' :
                        details.method === 'manual' ? 'Manual Entry' :
                        details.method === 'fallback' ? 'Fallback Method' : 'Standard';
      
      body += `\n\nMethod: ${methodText}`;
      
      if (details.duration) {
        body += `\nTime: ${Math.round(details.duration / 1000)}s`;
      }
      
      if (details.retryCount && details.retryCount > 0) {
        body += `\nRetries: ${details.retryCount}`;
      }
    }

    return this.sendNotification({
      title: '✅ Authentication Successful',
      body,
      type: NotificationType.SUCCESS,
      sound: 'default'
    });
  }

  /**
   * Show fallback mode notification
   */
  async showFallbackModeActivated(reason: string): Promise<boolean> {
    const troubleshootingSteps: TroubleshootingStep[] = [
      {
        step: 1,
        title: 'Copy Authorization Code',
        description: 'Copy the code from your browser',
        action: 'Copy code'
      },
      {
        step: 2,
        title: 'Paste in Application',
        description: 'Paste the code in the manual entry field',
        action: 'Paste code'
      },
      {
        step: 3,
        title: 'Complete Authentication',
        description: 'Click submit to complete authentication',
        action: 'Submit'
      }
    ];

    return this.sendEnhancedNotification({
      title: '🔄 Fallback Mode Activated',
      body: `Automatic authentication failed: ${reason}\n\nPlease use manual code entry to complete authentication.`,
      type: NotificationType.WARNING,
      persistent: true,
      troubleshootingSteps,
      actions: ['Use Manual Entry', 'Try Again'],
      sound: 'default'
    });
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

/**
 * React hook for using notification service
 */
export const useNotifications = () => {
  const sendNotification = async (options: NotificationOptions) => {
    return notificationService.sendNotification(options);
  };

  const success = async (title: string, body: string) => {
    return notificationService.success(title, body);
  };

  const error = async (title: string, body: string) => {
    return notificationService.error(title, body);
  };

  const warning = async (title: string, body: string) => {
    return notificationService.warning(title, body);
  };

  const info = async (title: string, body: string) => {
    return notificationService.info(title, body);
  };

  // Authentication-specific notifications
  const authSuccess = async (message?: string) => {
    return notificationService.authSuccess(message);
  };





  const tokenExpired = async () => {
    return notificationService.tokenExpired();
  };

  const networkError = async () => {
    return notificationService.networkError();
  };

  const loginRequired = async () => {
    return notificationService.loginRequired();
  };

  // Deep link specific notifications
  const deepLinkReceived = async (url: string, isStartup = false) => {
    return notificationService.deepLinkReceived(url, isStartup);
  };

  const deepLinkAuth = async (message?: string) => {
    return notificationService.deepLinkAuth(message);
  };

  const deepLinkError = async (error: string) => {
    return notificationService.deepLinkError(error);
  };

  // Enhanced notification methods
  const sendEnhancedNotification = async (options: EnhancedNotificationOptions) => {
    return notificationService.sendEnhancedNotification(options);
  };

  const showOAuthProgress = async (stage: OAuthFlowStage, details?: string) => {
    return notificationService.showOAuthProgress(stage, details);
  };



  const showAuthenticationSuccess = async (details?: {
    duration?: number;
    method?: 'deep_link' | 'manual' | 'fallback';
    retryCount?: number;
  }) => {
    return notificationService.showAuthenticationSuccess(details);
  };

  const showFallbackModeActivated = async (reason: string) => {
    return notificationService.showFallbackModeActivated(reason);
  };

  return {
    // Basic notification methods
    sendNotification,
    success,
    error,
    warning,
    info,
    
    // Authentication-specific methods
    authSuccess,
    tokenExpired,
    networkError,
    loginRequired,
    
    // Deep link methods
    deepLinkReceived,
    deepLinkAuth,
    deepLinkError,
    
    // Enhanced methods
    sendEnhancedNotification,
    showOAuthProgress,
    showAuthenticationSuccess,
    showFallbackModeActivated,
    
    // Utility methods
    isAvailable: () => notificationService.isAvailable(),
    requestPermission: () => notificationService.requestPermission()
  };
};