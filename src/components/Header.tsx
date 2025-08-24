import React from 'react';
import { commonStyles } from '../utils';

const Header: React.FC = () => {
  return (
    <div style={{ 
      textAlign: "center", 
      ...commonStyles.card
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
        <div style={{
          background: 'linear-gradient(45deg, #667eea, #764ba2)',
          borderRadius: '16px',
          padding: '12px',
          marginRight: '16px',
          boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
        }}>
          <span style={{ fontSize: '32px' }}>📋</span>
        </div>
        <h1 style={{ 
          ...commonStyles.gradientText,
          fontSize: '48px',
          fontWeight: '800',
          margin: 0,
          letterSpacing: '-0.02em'
        }}>Clipify</h1>
      </div>
      <p style={{ 
        color: "#4a5568", 
        fontSize: "20px", 
        fontWeight: '600',
        marginBottom: "8px",
        background: 'linear-gradient(45deg, #4a5568, #2d3748)',
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
      }}>
        Professional Text Cleanup Tool
      </p>
      <p style={{ color: "#718096", fontSize: "16px", margin: 0 }}>
        ✨ Instantly clean and beautify copied text with AI-powered formatting
      </p>
    </div>
  );
};

export default Header;