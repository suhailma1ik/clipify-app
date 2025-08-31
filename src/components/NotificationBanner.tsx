import React from 'react';
import { Notification } from '../hooks/useNotification';

interface NotificationBannerProps {
  notification: Notification | null;
  onDismiss: () => void;
}

const NotificationBanner: React.FC<NotificationBannerProps> = ({ notification, onDismiss }) => {
  if (!notification) return null;

  const getBackgroundColor = (type: string) => {
    switch (type) {
      case 'success': return 'linear-gradient(45deg, #4caf50, #388e3c)';
      case 'error': return 'linear-gradient(45deg, #f44336, #d32f2f)';
      default: return 'linear-gradient(45deg, #2196f3, #1976d2)';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      default: return 'ℹ️';
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: getBackgroundColor(notification.type),
      color: 'white',
      padding: '16px 20px',
      borderRadius: '12px',
      boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)',
      zIndex: 1000,
      maxWidth: '400px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.2)'
    }}>
      <span style={{ fontSize: '20px' }}>{getIcon(notification.type)}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '2px' }}>
          {notification.message}
        </div>
      </div>
      <button
        onClick={onDismiss}
        style={{
          background: 'none',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          fontSize: '18px',
          padding: '4px',
          borderRadius: '4px',
          opacity: 0.8,
          transition: 'opacity 0.2s ease'
        }}
        onMouseOver={(e) => (e.target as HTMLElement).style.opacity = '1'}
        onMouseOut={(e) => (e.target as HTMLElement).style.opacity = '0.8'}
      >
        ×
      </button>
    </div>
  );
};

export default NotificationBanner;
