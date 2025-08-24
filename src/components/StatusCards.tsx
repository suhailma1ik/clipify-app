import React from 'react';
import { StatusCardProps } from '../types';
import { addHoverEffect, removeHoverEffect } from '../utils';

const StatusCards: React.FC<StatusCardProps> = ({
  trayStatus,
  permissionStatus,
  onHideToTray,
  onToggleWindowVisibility,
  onCheckPermissions
}) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
      
      {/* System Tray Status Card */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{
            background: 'linear-gradient(45deg, #ff9800, #f57c00)',
            borderRadius: '12px',
            padding: '8px',
            marginRight: '12px',
            boxShadow: '0 3px 10px rgba(255, 152, 0, 0.3)'
          }}>
            <span style={{ fontSize: '20px' }}>🖥️</span>
          </div>
          <h3 style={{ margin: 0, color: '#2d3748', fontSize: '18px', fontWeight: '700' }}>System Tray</h3>
        </div>
        
        <div style={{
          padding: '16px',
          borderRadius: '12px',
          background: trayStatus.includes("✅") ? 'linear-gradient(45deg, #e8f5e8, #f0fff0)' : 
                     trayStatus.includes("❌") ? 'linear-gradient(45deg, #ffe8e8, #fff5f5)' : 'linear-gradient(45deg, #e8f0ff, #f0f8ff)',
          border: trayStatus.includes("✅") ? '2px solid #4caf50' : 
                 trayStatus.includes("❌") ? '2px solid #f44336' : '2px solid #2196f3',
          marginBottom: '16px'
        }}>
          <div style={{ 
            color: trayStatus.includes("✅") ? '#2e7d32' : 
                   trayStatus.includes("❌") ? '#c62828' : '#1565c0',
            fontSize: '14px',
            fontWeight: '600',
            marginBottom: '8px'
          }}>
            {trayStatus}
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onHideToTray}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: 'linear-gradient(45deg, #ff9800, #f57c00)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              boxShadow: '0 3px 10px rgba(255, 152, 0, 0.3)',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => addHoverEffect(e.target as HTMLElement)}
            onMouseOut={(e) => removeHoverEffect(e.target as HTMLElement)}
          >
            📩 Hide to Tray
          </button>
          <button
            onClick={onToggleWindowVisibility}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: 'linear-gradient(45deg, #2196f3, #1976d2)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              boxShadow: '0 3px 10px rgba(33, 150, 243, 0.3)',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => addHoverEffect(e.target as HTMLElement)}
            onMouseOut={(e) => removeHoverEffect(e.target as HTMLElement)}
          >
            🔄 Toggle
          </button>
        </div>
        
        <div style={{ 
          marginTop: '12px', 
          fontSize: '12px', 
          color: '#718096',
          textAlign: 'center',
          fontStyle: 'italic'
        }}>
          Runs continuously in system tray
        </div>
      </div>
      
      {/* Permissions Status Card */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{
            background: permissionStatus.includes("✅") ? 'linear-gradient(45deg, #4caf50, #388e3c)' :
                       permissionStatus.includes("❌") ? 'linear-gradient(45deg, #f44336, #d32f2f)' : 'linear-gradient(45deg, #ffc107, #f57c00)',
            borderRadius: '12px',
            padding: '8px',
            marginRight: '12px',
            boxShadow: permissionStatus.includes("✅") ? '0 3px 10px rgba(76, 175, 80, 0.3)' :
                       permissionStatus.includes("❌") ? '0 3px 10px rgba(244, 67, 54, 0.3)' : '0 3px 10px rgba(255, 193, 7, 0.3)'
          }}>
            <span style={{ fontSize: '20px' }}>🔒</span>
          </div>
          <h3 style={{ margin: 0, color: '#2d3748', fontSize: '18px', fontWeight: '700' }}>Accessibility</h3>
        </div>
        
        <div style={{
          padding: '16px',
          borderRadius: '12px',
          background: permissionStatus.includes("✅") ? 'linear-gradient(45deg, #e8f5e8, #f0fff0)' : 
                     permissionStatus.includes("❌") ? 'linear-gradient(45deg, #ffe8e8, #fff5f5)' : 'linear-gradient(45deg, #fff3cd, #fffacd)',
          border: permissionStatus.includes("✅") ? '2px solid #4caf50' : 
                 permissionStatus.includes("❌") ? '2px solid #f44336' : '2px solid #ffc107',
          marginBottom: '16px'
        }}>
          <div style={{ 
            color: permissionStatus.includes("✅") ? '#2e7d32' : 
                   permissionStatus.includes("❌") ? '#c62828' : '#856404',
            fontSize: '14px',
            fontWeight: '600',
            marginBottom: '8px'
          }}>
            {permissionStatus}
          </div>
        </div>
        
        <button
          onClick={onCheckPermissions}
          style={{
            width: '100%',
            padding: '12px 16px',
            background: 'linear-gradient(45deg, #6c757d, #495057)',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            boxShadow: '0 3px 10px rgba(108, 117, 125, 0.3)',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => addHoverEffect(e.target as HTMLElement)}
          onMouseOut={(e) => removeHoverEffect(e.target as HTMLElement)}
        >
          🔄 Recheck Permissions
        </button>
        
        <div style={{ 
          marginTop: '12px', 
          fontSize: '12px', 
          color: '#718096',
          textAlign: 'center',
          fontStyle: 'italic'
        }}>
          Required for global shortcut functionality
        </div>
      </div>
    </div>
  );
};

export default StatusCards;