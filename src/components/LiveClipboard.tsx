import React from 'react';
import { LiveClipboardProps } from '../types';
import { commonStyles, addHoverEffect, removeHoverEffect } from '../utils';

const LiveClipboard: React.FC<LiveClipboardProps> = ({
  clipboard,
  onRefreshClipboard
}) => {
  return (
    <div style={commonStyles.card}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{
          background: 'linear-gradient(45deg, #9c27b0, #673ab7)',
          borderRadius: '12px',
          padding: '10px',
          marginRight: '16px',
          boxShadow: '0 4px 15px rgba(156, 39, 176, 0.4)'
        }}>
          <span style={{ fontSize: '24px' }}>📋</span>
        </div>
        <div>
          <h2 style={{ margin: 0, color: '#2d3748', fontSize: '22px', fontWeight: '800' }}>Live Clipboard</h2>
          <p style={{ margin: 0, color: '#718096', fontSize: '14px' }}>Real-time clipboard monitoring</p>
        </div>
      </div>
      
      <div style={{
        background: 'linear-gradient(135deg, #fafafa, #fff)',
        border: '2px solid #e0e0e0',
        borderRadius: '12px',
        padding: '20px',
        minHeight: '120px',
        maxHeight: '180px',
        overflowY: 'auto',
        position: 'relative'
      }}>
        {clipboard ? (
          <div style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontSize: '14px',
            fontFamily: "'SF Mono', 'Monaco', 'Cascadia Code', monospace",
            lineHeight: '1.5',
            color: '#2d3748'
          }}>
            {clipboard}
          </div>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '80px',
            color: '#a0aec0',
            fontSize: '16px',
            fontStyle: 'italic'
          }}>
            <span style={{ marginRight: '8px', fontSize: '20px' }}>📎</span>
            Clipboard is empty - copy some text to see it here
          </div>
        )}
      </div>
      
      <div style={{ marginTop: '16px', textAlign: 'center' }}>
        <button 
          type="button" 
          onClick={onRefreshClipboard}
          style={{
            padding: '10px 20px',
            background: 'linear-gradient(45deg, #9c27b0, #673ab7)',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            boxShadow: '0 3px 10px rgba(156, 39, 176, 0.3)',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            margin: '0 auto'
          }}
          onMouseOver={(e) => addHoverEffect(e.target as HTMLElement)}
          onMouseOut={(e) => removeHoverEffect(e.target as HTMLElement)}
        >
          <span style={{ fontSize: '16px' }}>🔄</span>
          Refresh Clipboard
        </button>
      </div>
    </div>
  );
};

export default LiveClipboard;