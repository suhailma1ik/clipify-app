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
    <header className="card card-hover">
      <div className="row-between">
        {/* Left: Branding + user info */}
        <div className="row-center gap-16">
          <div className="btn-icon" style={{ background: "var(--accent-gradient)", borderRadius: "12px", boxShadow: "0 6px 16px rgba(61,113,236,0.28)" }}>
            <span style={{ fontSize: 24 }}>📋</span>
          </div>
          <div>
            <h1 className="gradient-text" style={{ margin: 0, fontWeight: 800 }}>Clipify Pro</h1>
            <div className="row-center gap-12 text-muted" style={{ fontSize: 14 }}>
              <span className="row-center gap-8" style={{ fontWeight: 600 }}>👤 {username}</span>
              <span className={`badge ${userPlan === 'Pro Plan' ? 'badge-success' : 'badge-muted'}`}>{userPlan}</span>
            </div>
          </div>
        </div>

        {/* Right: Usage stats */}
        <div className="row-center gap-16">
          <div className="row-center gap-16">
            <div className="card" style={{ padding: "12px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "var(--accent)" }}>{usageStats.clipboardItems}</div>
              <div className="text-muted" style={{ fontSize: 12, fontWeight: 600 }}>Items Stored</div>
            </div>
            <div className="card" style={{ padding: "12px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 800 }} className="gradient-text">{usageStats.storageUsed}</div>
              <div className="text-muted" style={{ fontSize: 12, fontWeight: 600 }}>Storage Used</div>
            </div>
            <div className="card" style={{ padding: "12px 16px", minWidth: 160 }}>
              <div className="row-between" style={{ marginBottom: 8 }}>
                <span className="text-muted" style={{ fontSize: 12, fontWeight: 600 }}>Daily Usage</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: usagePercentage > 80 ? '#d97706' : '#059669' }}>{usageStats.dailyUsage}/{usageStats.dailyLimit}</span>
              </div>
              <div className="progress">
                <div className={`progress-bar ${usagePercentage > 80 ? 'warn' : 'ok'}`} style={{ width: `${Math.min(usagePercentage, 100)}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;