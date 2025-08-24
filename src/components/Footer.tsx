import React from 'react';
import { commonStyles } from '../utils';

const Footer: React.FC = () => {
  return (
    <div style={commonStyles.card}>
      <div style={{ 
        marginBottom: '20px', 
        padding: '20px', 
        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05), rgba(118, 75, 162, 0.05))',
        borderRadius: '12px', 
        border: '1px solid rgba(102, 126, 234, 0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '24px', marginRight: '12px' }}>💡</span>
          <h4 style={{ margin: 0, color: '#2d3748', fontSize: '18px', fontWeight: '700' }}>Pro Tips</h4>
        </div>
        <div style={{ color: '#4a5568', fontSize: '14px', lineHeight: '1.6' }}>
          <p style={{ margin: '0 0 8px 0' }}>
            • <strong>Background Operation:</strong> Clipify runs continuously in your system tray
          </p>
          <p style={{ margin: '0 0 8px 0' }}>
            • <strong>Smart Minimize:</strong> Closing the window minimizes to tray instead of quitting
          </p>
          <p style={{ margin: '0' }}>
            • <strong>Quick Access:</strong> Right-click tray icon for menu, left-click to show/hide
          </p>
        </div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
        <div style={{
          background: 'linear-gradient(45deg, #667eea, #764ba2)',
          borderRadius: '12px',
          padding: '8px',
          marginRight: '12px',
          boxShadow: '0 3px 8px rgba(102, 126, 234, 0.3)'
        }}>
          <span style={{ fontSize: '20px' }}>✨</span>
        </div>
        <span style={{ 
          ...commonStyles.gradientText,
          fontSize: '18px',
          fontWeight: '700'
        }}>
          Clipify - Making your text clean and professional, one copy at a time
        </span>
      </div>
      
      <p style={{ color: '#a0aec0', fontSize: '12px', margin: 0, textAlign: 'center' }}>
        v1.0.0 • Built with ♥️ for productivity
      </p>
    </div>
  );
};

export default Footer;