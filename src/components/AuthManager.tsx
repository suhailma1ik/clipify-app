/**
 * Authentication Manager Component
 * Provides UI for desktop authentication flow
 */

import React from 'react';
import { useAuth } from '../hooks/useAuth';

interface AuthManagerProps {
  className?: string;
  showUserInfo?: boolean;
  compact?: boolean;
}

export const AuthManager: React.FC<AuthManagerProps> = ({
  className = '',
  showUserInfo = true,
  compact = false,
}) => {
  const {
    isAuthenticated,
    isLoading,
    user,
    error,
    login,
    logout,
    clearError,
  } = useAuth();

  const handleLogin = async () => {
    try {
      await login();
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleClearError = () => {
    clearError();
  };

  if (compact) {
    return (
      <div className={`auth-manager-compact row-center gap-12 card ${className}`}>
        {isAuthenticated ? (
          <div className="row-center gap-8">
            <span>🟢</span>
            <span>Authenticated</span>
            {!isLoading && (
              <button onClick={handleLogout} className="btn btn-danger btn-sm" title="Logout">
                Logout
              </button>
            )}
          </div>
        ) : (
          <div className="row-center gap-8">
            <span>🔴</span>
            <span>Not authenticated</span>
            {!isLoading && (
              <button onClick={handleLogin} className="btn btn-primary btn-sm" title="Login">
                Login
              </button>
            )}
          </div>
        )}
        {isLoading && (
          <div className="row-center gap-8">
            <span>⏳</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`auth-manager card card-hover ${className}`}>
      <div className="row-between">
        <h3 style={{ margin: 0 }}>Authentication</h3>
        <div className="row-center gap-8">
          <span>{isAuthenticated ? '🟢' : '🔴'}</span>
          <span className={`badge ${isAuthenticated ? 'badge-success' : 'badge-danger'}`}>
            {isAuthenticated ? 'Authenticated' : 'Not authenticated'}
          </span>
        </div>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'rgba(239, 68, 68, 0.28)' }}>
          <div className="row-between">
            <div className="row-center gap-8" style={{ color: '#991b1b' }}>
              <span>⚠️</span>
              <span>{error}</span>
            </div>
            <button onClick={handleClearError} className="btn btn-ghost btn-sm">✕</button>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="card row-center gap-12">
          <div style={{ animation: 'spin 1s linear infinite' }}>⏳</div>
          <span className="text-muted">Processing authentication...</span>
        </div>
      )}

      {showUserInfo && user && (
        <div className="surface" style={{ padding: 16, borderRadius: 12 }}>
          <div className="row-center gap-12">
            <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
              {user.avatar ? (
                <img src={user.avatar} alt="User avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div className="row-center" style={{ width: '100%', height: '100%', justifyContent: 'center', color: 'var(--color-muted)', fontWeight: 700 }}>
                  {user.name ? user.name.charAt(0).toUpperCase() : '👤'}
                </div>
              )}
            </div>
            <div>
              {user.name && <div style={{ fontWeight: 600 }}>{user.name}</div>}
              <div className="text-muted" style={{ fontSize: 14 }}>{user.email}</div>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        {isAuthenticated ? (
          <button onClick={handleLogout} disabled={isLoading} className="btn btn-danger" style={{ width: '100%' }}>
            {isLoading ? 'Logging out...' : 'Logout'}
          </button>
        ) : (
          <button onClick={handleLogin} disabled={isLoading} className="btn btn-primary" style={{ width: '100%' }}>
            {isLoading ? 'Opening browser...' : 'Login with Browser'}
          </button>
        )}
      </div>

      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
        <details>
          <summary className="text-muted" style={{ cursor: 'pointer' }}>How does authentication work?</summary>
          <div className="text-muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
            <p>1. Click "Login with Browser" to open your default web browser</p>
            <p>2. Complete authentication in the browser (Google OAuth or email/password)</p>
            <p>3. The browser will redirect back to this app automatically</p>
            <p>4. Your authentication will be securely stored for future use</p>
          </div>
        </details>
      </div>
    </div>
  );
};

export default AuthManager;