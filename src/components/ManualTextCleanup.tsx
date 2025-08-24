import React from 'react';
import { ManualTextCleanupProps } from '../types';
import { commonStyles, addHoverEffect, removeHoverEffect } from '../utils';

const ManualTextCleanup: React.FC<ManualTextCleanupProps> = ({
  originalText,
  cleanedText,
  isProcessing,
  onOriginalTextChange,
  onProcessClipboardText,
  onCopyCleanedText
}) => {
  return (
    <div style={commonStyles.card}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{
          background: 'linear-gradient(45deg, #4caf50, #388e3c)',
          borderRadius: '12px',
          padding: '10px',
          marginRight: '16px',
          boxShadow: '0 4px 15px rgba(76, 175, 80, 0.4)'
        }}>
          <span style={{ fontSize: '24px' }}>📝</span>
        </div>
        <div>
          <h2 style={{ margin: 0, color: '#2d3748', fontSize: '22px', fontWeight: '800' }}>Manual Text Cleanup</h2>
          <p style={{ margin: 0, color: '#718096', fontSize: '14px' }}>Paste and clean your text manually</p>
        </div>
      </div>
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: '20px' }}>
        {/* Original Text Panel */}
        <div style={{
          background: 'linear-gradient(135deg, #fff8f0, #fff)',
          borderRadius: '12px',
          padding: '16px',
          border: '2px solid #ff9800',
          boxShadow: '0 2px 10px rgba(255, 152, 0, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '18px', marginRight: '8px' }}>📄</span>
            <h3 style={{ margin: 0, color: '#e65100', fontSize: '16px', fontWeight: '700' }}>Original Text</h3>
          </div>
          <textarea
            value={originalText}
            onChange={(e) => onOriginalTextChange(e.target.value)}
            placeholder="📝 Paste your messy text here...\n\nI'll clean it up for you instantly!"
            style={{
              width: "100%",
              height: "220px",
              padding: "16px",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontFamily: "'SF Mono', 'Monaco', 'Cascadia Code', monospace",
              resize: "none",
              backgroundColor: "rgba(255, 255, 255, 0.8)",
              backdropFilter: 'blur(5px)',
              outline: 'none',
              boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.06)',
              transition: 'all 0.2s ease'
            }}
            onFocus={(e) => {
              e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
              e.target.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.06), 0 0 0 3px rgba(255, 152, 0, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
              e.target.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.06)';
            }}
          />
        </div>
        
        {/* Cleaned Text Panel */}
        <div style={{
          background: 'linear-gradient(135deg, #f0fff0, #fff)',
          borderRadius: '12px',
          padding: '16px',
          border: '2px solid #4caf50',
          boxShadow: '0 2px 10px rgba(76, 175, 80, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '18px', marginRight: '8px' }}>✨</span>
            <h3 style={{ margin: 0, color: '#2e7d32', fontSize: '16px', fontWeight: '700' }}>Cleaned Text</h3>
          </div>
          <textarea
            value={cleanedText}
            readOnly
            placeholder="Your beautifully cleaned text will appear here...\n\n✨ Ready to copy and use!"
            style={{
              width: "100%",
              height: "220px",
              padding: "16px",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontFamily: "'SF Mono', 'Monaco', 'Cascadia Code', monospace",
              resize: "none",
              backgroundColor: "rgba(255, 255, 255, 0.8)",
              backdropFilter: 'blur(5px)',
              outline: 'none',
              boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.06)',
              cursor: 'default'
            }}
          />
        </div>
      </div>
      
      {/* Action Buttons */}
      <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
        <button 
          type="button" 
          onClick={onProcessClipboardText}
          disabled={isProcessing}
          style={{
            padding: "14px 28px",
            background: isProcessing ? 'linear-gradient(45deg, #ccc, #999)' : 'linear-gradient(45deg, #2196f3, #1976d2)',
            color: "white",
            border: "none",
            borderRadius: "12px",
            cursor: isProcessing ? "not-allowed" : "pointer",
            fontSize: '16px',
            fontWeight: '600',
            boxShadow: isProcessing ? 'none' : '0 4px 15px rgba(33, 150, 243, 0.4)',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseOver={(e) => !isProcessing && addHoverEffect(e.target as HTMLElement)}
          onMouseOut={(e) => !isProcessing && removeHoverEffect(e.target as HTMLElement)}
        >
          <span style={{ fontSize: '18px' }}>{isProcessing ? '🔄' : '📋'}</span>
          {isProcessing ? "Processing..." : "Cleanup from Clipboard"}
        </button>
        
        <button 
          type="button" 
          onClick={onCopyCleanedText}
          disabled={!cleanedText}
          style={{
            padding: "14px 28px",
            background: !cleanedText ? 'linear-gradient(45deg, #ccc, #999)' : 'linear-gradient(45deg, #4caf50, #388e3c)',
            color: "white",
            border: "none",
            borderRadius: "12px",
            cursor: cleanedText ? "pointer" : "not-allowed",
            fontSize: '16px',
            fontWeight: '600',
            boxShadow: !cleanedText ? 'none' : '0 4px 15px rgba(76, 175, 80, 0.4)',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseOver={(e) => cleanedText && addHoverEffect(e.target as HTMLElement)}
          onMouseOut={(e) => cleanedText && removeHoverEffect(e.target as HTMLElement)}
        >
          <span style={{ fontSize: '18px' }}>✨</span>
          Copy Cleaned Text
        </button>
      </div>
    </div>
  );
};

export default ManualTextCleanup;