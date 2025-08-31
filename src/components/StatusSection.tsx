import React from 'react';
import { appStyles, buttons, statusBox } from '../styles/AppStyles';

interface StatusSectionProps {
  shortcutStatus: string;
  isProcessing: boolean;
  onRefreshClipboard: () => void;
  onTestNotification: () => void;
}

const StatusSection: React.FC<StatusSectionProps> = ({
  shortcutStatus,
  isProcessing,
  onRefreshClipboard,
  onTestNotification
}) => {
  return (
    <div style={appStyles.card}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '16px'
      }}>
        <div style={appStyles.iconBox}>
          <span style={appStyles.iconLarge}>⚙️</span>
        </div>
        <div>
          <h3 style={appStyles.h3Title}>Controls & Status</h3>
          <p style={appStyles.mutedText}>Manage clipboard monitoring and test notifications</p>
        </div>
      </div>

      <div style={{
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
        marginBottom: '20px'
      }}>
        <button
          onClick={onRefreshClipboard}
          disabled={isProcessing}
          style={buttons.primary({ large: true })}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 5px 15px rgba(61, 113, 236, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 3px 10px rgba(61, 113, 236, 0.3)';
          }}
        >
          <span>🔄</span>
          {isProcessing ? 'Refreshing...' : 'Refresh Clipboard'}
        </button>

        <button
          onClick={onTestNotification}
          style={buttons.primary({ large: true })}
        >
          <span>🔔</span>
          Test Notification
        </button>
      </div>

      {/* Status Display */}
      <div style={statusBox(shortcutStatus)}>
        {shortcutStatus}
      </div>
    </div>
  );
};

export default StatusSection;
