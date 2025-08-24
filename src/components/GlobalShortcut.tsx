import React from 'react';
import { GlobalShortcutProps } from '../types';
import { commonStyles } from '../utils';

const GlobalShortcut: React.FC<GlobalShortcutProps> = ({ shortcutStatus }) => {
  return (
    <div style={commonStyles.card}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{
          background: 'linear-gradient(45deg, #667eea, #764ba2)',
          borderRadius: '12px',
          padding: '10px',
          marginRight: '16px',
          boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
        }}>
          <span style={{ fontSize: '24px' }}>⌨️</span>
        </div>
        <div>
          <h2 style={{ margin: 0, color: '#2d3748', fontSize: '22px', fontWeight: '800' }}>Quick Capture</h2>
          <p style={{ margin: 0, color: '#718096', fontSize: '14px' }}>Press Cmd+Shift+C anywhere</p>
        </div>
      </div>
      
      <div style={{
        padding: '20px',
        borderRadius: '12px',
        background: shortcutStatus.includes("✅") ? 'linear-gradient(135deg, #e8f5e8, #f0fff0)' : 
                   shortcutStatus.includes("❌") ? 'linear-gradient(135deg, #ffe8e8, #fff5f5)' : 'linear-gradient(135deg, #e8f0ff, #f0f8ff)',
        border: shortcutStatus.includes("✅") ? '2px solid #4caf50' : 
               shortcutStatus.includes("❌") ? '2px solid #f44336' : '2px solid #667eea',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Animated background effect */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: shortcutStatus.includes("✅") ? 'radial-gradient(circle at 50% 50%, rgba(76, 175, 80, 0.1), transparent)' :
                     shortcutStatus.includes("❌") ? 'radial-gradient(circle at 50% 50%, rgba(244, 67, 54, 0.1), transparent)' : 'radial-gradient(circle at 50% 50%, rgba(102, 126, 234, 0.1), transparent)',
          animation: shortcutStatus.includes("✅") || shortcutStatus.includes("❌") ? 'pulse 2s ease-in-out infinite' : 'none'
        }} />
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: '16px',
            fontWeight: '600',
            color: shortcutStatus.includes("✅") ? '#2e7d32' : 
                   shortcutStatus.includes("❌") ? '#c62828' : '#1565c0'
          }}>
            <span style={{ marginRight: '12px', fontSize: '20px' }}>
              {shortcutStatus.includes("✅") ? '🎉' : shortcutStatus.includes("❌") ? '⚠️' : '🔄'}
            </span>
            {shortcutStatus}
          </div>
        </div>
      </div>
      
      <div style={{
        marginTop: '16px',
        padding: '16px',
        background: 'linear-gradient(45deg, rgba(102, 126, 234, 0.05), rgba(118, 75, 162, 0.05))',
        borderRadius: '10px',
        border: '1px solid rgba(102, 126, 234, 0.1)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          color: '#4a5568',
          fontWeight: '500'
        }}>
          <kbd style={{
            background: 'linear-gradient(45deg, #667eea, #764ba2)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '600',
            marginRight: '4px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
          }}>Cmd</kbd>
          <span style={{ margin: '0 4px' }}>+</span>
          <kbd style={{
            background: 'linear-gradient(45deg, #667eea, #764ba2)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '600',
            marginRight: '4px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
          }}>Shift</kbd>
          <span style={{ margin: '0 4px' }}>+</span>
          <kbd style={{
            background: 'linear-gradient(45deg, #667eea, #764ba2)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '600',
            marginRight: '8px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
          }}>C</kbd>
          → Capture & Clean Text Instantly
        </div>
      </div>
    </div>
  );
};

export default GlobalShortcut;