import React from 'react';

interface HeaderProps {
  username?: string;
  userPlan?: string;
  usageStats?: {
    clipboardItems: number;
    storageUsed: string;
    dailyLimit: number;
    dailyUsage: number;
  };
}

const Header: React.FC<HeaderProps> = ({
  username = "Guest User",
  userPlan = "Free Plan",
  usageStats = {
    clipboardItems: 0,
    storageUsed: "0 KB",
    dailyLimit: 100,
    dailyUsage: 0
  }
}) => {
  const usagePercentage = (usageStats.dailyUsage / usageStats.dailyLimit) * 100;
  
  return (
    <header style={{
      background: 'rgba(255, 255, 255, 0.98)',
      backdropFilter: 'blur(20px)',
      borderRadius: '20px',
      padding: '24px 32px',
      marginBottom: '32px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background gradient overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
        pointerEvents: 'none'
      }} />
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Left side - App branding and user info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {/* App logo/icon */}
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '16px',
            padding: '12px',
            boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)'
          }}>
            <span style={{ fontSize: '28px' }}>📋</span>
          </div>
          
          {/* App title and user info */}
          <div>
            <h1 style={{
              margin: 0,
              fontSize: '28px',
              fontWeight: '800',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '4px'
            }}>
              Clipify Pro
            </h1>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              fontSize: '14px',
              color: '#64748b'
            }}>
              <span style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: '600'
              }}>
                👤 {username}
              </span>
              <span style={{
                background: userPlan === 'Pro Plan' ? 'linear-gradient(45deg, #10b981, #059669)' : 'linear-gradient(45deg, #6b7280, #4b5563)',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '700'
              }}>
                {userPlan}
              </span>
            </div>
          </div>
        </div>
        
        {/* Right side - Usage stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {/* Usage statistics */}
          <div style={{
            display: 'flex',
            gap: '20px',
            alignItems: 'center'
          }}>
            {/* Clipboard items count */}
            <div style={{
              textAlign: 'center',
              padding: '12px 16px',
              background: 'rgba(102, 126, 234, 0.1)',
              borderRadius: '12px',
              border: '1px solid rgba(102, 126, 234, 0.2)'
            }}>
              <div style={{
                fontSize: '20px',
                fontWeight: '800',
                color: '#667eea',
                marginBottom: '2px'
              }}>
                {usageStats.clipboardItems}
              </div>
              <div style={{
                fontSize: '11px',
                color: '#64748b',
                fontWeight: '600'
              }}>
                Items Stored
              </div>
            </div>
            
            {/* Storage used */}
            <div style={{
              textAlign: 'center',
              padding: '12px 16px',
              background: 'rgba(118, 75, 162, 0.1)',
              borderRadius: '12px',
              border: '1px solid rgba(118, 75, 162, 0.2)'
            }}>
              <div style={{
                fontSize: '20px',
                fontWeight: '800',
                color: '#764ba2',
                marginBottom: '2px'
              }}>
                {usageStats.storageUsed}
              </div>
              <div style={{
                fontSize: '11px',
                color: '#64748b',
                fontWeight: '600'
              }}>
                Storage Used
              </div>
            </div>
            
            {/* Daily usage progress */}
            <div style={{
              padding: '12px 16px',
              background: 'rgba(16, 185, 129, 0.1)',
              borderRadius: '12px',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              minWidth: '140px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px'
              }}>
                <span style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#64748b'
                }}>
                  Daily Usage
                </span>
                <span style={{
                  fontSize: '12px',
                  fontWeight: '700',
                  color: '#10b981'
                }}>
                  {usageStats.dailyUsage}/{usageStats.dailyLimit}
                </span>
              </div>
              <div style={{
                width: '100%',
                height: '6px',
                background: 'rgba(16, 185, 129, 0.2)',
                borderRadius: '3px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${Math.min(usagePercentage, 100)}%`,
                  height: '100%',
                  background: usagePercentage > 80 ? 'linear-gradient(90deg, #f59e0b, #d97706)' : 'linear-gradient(90deg, #10b981, #059669)',
                  borderRadius: '3px',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
};

export default Header;