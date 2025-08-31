import { useState, useCallback } from 'react';
import { notificationService } from '../services/notificationService';

export type NotificationType = 'success' | 'error' | 'info';

export interface Notification {
  message: string;
  type: NotificationType;
}

export const useNotification = () => {
  const [notification, setNotification] = useState<Notification | null>(null);

  const showNotification = useCallback(async (
    message: string,
    type: NotificationType = 'info'
  ) => {
    setNotification({ message, type });

    // Also send system notification using notification service
    try {
      await notificationService.initialize();
      switch (type) {
        case 'success':
          await notificationService.success('Clipify', message);
          break;
        case 'error':
          await notificationService.error('Clipify', message);
          break;
        default:
          await notificationService.info('Clipify', message);
          break;
      }
    } catch (error) {
      console.error('Failed to send system notification:', error);
    }

    // Auto-hide notification after 5 seconds
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  }, []);

  const clearNotification = useCallback(() => {
    setNotification(null);
  }, []);

  return {
    notification,
    showNotification,
    clearNotification
  };
};
