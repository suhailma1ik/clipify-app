import { sendNotification, isPermissionGranted, requestPermission } from '@tauri-apps/plugin-notification';

/**
 * Notification types for different user feedback scenarios
 */
export enum NotificationType {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

/**
 * Interface for notification options
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
      }

      this.initialized = true;
      console.log('Notification service initialized. Permission granted:', this.permissionGranted);
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
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
        console.log(`${options.type?.toUpperCase() || 'NOTIFICATION'}: ${options.title} - ${options.body}`);
        return false;
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

  async authError(message: string = 'Authentication failed. Please try again.'): Promise<boolean> {
    return this.error('Authentication Error', message);
  }

  async authWarning(message: string): Promise<boolean> {
    return this.warning('Authentication Warning', message);
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
   * Show a persistent notification that requires user action
   */
  async showPersistentError(title: string, body: string): Promise<boolean> {
    return this.sendNotification({
      title,
      body,
      type: NotificationType.ERROR,
      persistent: true,
      sound: 'default'
    });
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

  const authError = async (message?: string) => {
    return notificationService.authError(message);
  };

  const authWarning = async (message: string) => {
    return notificationService.authWarning(message);
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

  return {
    sendNotification,
    success,
    error,
    warning,
    info,
    authSuccess,
    authError,
    authWarning,
    tokenExpired,
    networkError,
    loginRequired,
    isAvailable: () => notificationService.isAvailable(),
    requestPermission: () => notificationService.requestPermission()
  };
};