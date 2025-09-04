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
      <div className={`auth-manager-compact ${className}`}>
        {isAuthenticated ? (
          <div className="auth-status authenticated">
            <span className="status-indicator">🟢</span>
            <span className="status-text">Authenticated</span>
            {!isLoading && (
              <button
                onClick={handleLogout}
                className="logout-btn"
                title="Logout"
              >
                Logout
              </button>
            )}
          </div>
        ) : (
          <div className="auth-status unauthenticated">
            <span className="status-indicator">🔴</span>
            <span className="status-text">Not authenticated</span>
            {!isLoading && (
              <button
                onClick={handleLogin}
                className="login-btn"
                title="Login"
              >
                Login
              </button>
            )}
          </div>
        )}
        {isLoading && (
          <div className="loading-indicator">
            <span>⏳</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`auth-manager ${className}`}>
      <div className="auth-header">
        <h3>Authentication</h3>
        <div className={`auth-status ${isAuthenticated ? 'authenticated' : 'unauthenticated'}`}>
          <span className="status-indicator">
            {isAuthenticated ? '🟢' : '🔴'}
          </span>
          <span className="status-text">
            {isAuthenticated ? 'Authenticated' : 'Not authenticated'}
          </span>
        </div>
      </div>

      {error && (
        <div className="auth-error">
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
          <button onClick={handleClearError} className="clear-error-btn">
            ✕
          </button>
        </div>
      )}

      {isLoading && (
        <div className="auth-loading">
          <div className="loading-spinner">⏳</div>
          <span>Processing authentication...</span>
        </div>
      )}

      {showUserInfo && user && (
        <div className="user-info">
          <div className="user-details">
            <div className="user-avatar">
              {user.avatar ? (
                <img src={user.avatar} alt="User avatar" />
              ) : (
                <div className="avatar-placeholder">
                  {user.name ? user.name.charAt(0).toUpperCase() : '👤'}
                </div>
              )}
            </div>
            <div className="user-text">
              {user.name && <div className="user-name">{user.name}</div>}
              <div className="user-email">{user.email}</div>
            </div>
          </div>
        </div>
      )}

      <div className="auth-actions">
        {isAuthenticated ? (
          <button
            onClick={handleLogout}
            disabled={isLoading}
            className="auth-btn logout-btn"
          >
            {isLoading ? 'Logging out...' : 'Logout'}
          </button>
        ) : (
          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="auth-btn login-btn"
          >
            {isLoading ? 'Opening browser...' : 'Login with Browser'}
          </button>
        )}
      </div>

      <div className="auth-help">
        <details>
          <summary>How does authentication work?</summary>
          <div className="help-content">
            <p>
              1. Click "Login with Browser" to open your default web browser
            </p>
            <p>
              2. Complete authentication in the browser (Google OAuth or email/password)
            </p>
            <p>
              3. The browser will redirect back to this app automatically
            </p>
            <p>
              4. Your authentication will be securely stored for future use
            </p>
          </div>
        </details>
      </div>

      <style>{`
        .auth-manager {
          padding: 20px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          background: #fafafa;
          max-width: 400px;
        }

        .auth-manager-compact {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          background: #fafafa;
        }

        .auth-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .auth-header h3 {
          margin: 0;
          color: #333;
        }

        .auth-status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
        }

        .auth-status.authenticated .status-text {
          color: #22c55e;
        }

        .auth-status.unauthenticated .status-text {
          color: #ef4444;
        }

        .auth-error {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 6px;
          margin-bottom: 16px;
        }

        .error-message {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #dc2626;
          font-size: 14px;
        }

        .clear-error-btn {
          background: none;
          border: none;
          color: #dc2626;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
        }

        .clear-error-btn:hover {
          background: #fecaca;
        }

        .auth-loading {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 6px;
          margin-bottom: 16px;
          color: #0369a1;
        }

        .loading-spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .user-info {
          padding: 16px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          margin-bottom: 16px;
        }

        .user-details {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .user-avatar img {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
        }

        .avatar-placeholder {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          color: #64748b;
        }

        .user-name {
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 2px;
        }

        .user-email {
          font-size: 14px;
          color: #64748b;
        }

        .auth-actions {
          margin-bottom: 16px;
        }

        .auth-btn {
          width: 100%;
          padding: 12px 16px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .auth-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .login-btn {
          background: #3b82f6;
          color: white;
        }

        .login-btn:hover:not(:disabled) {
          background: #2563eb;
        }

        .logout-btn {
          background: #ef4444;
          color: white;
        }

        .logout-btn:hover:not(:disabled) {
          background: #dc2626;
        }

        .auth-manager-compact .logout-btn,
        .auth-manager-compact .login-btn {
          padding: 4px 8px;
          font-size: 12px;
          width: auto;
        }

        .auth-help {
          border-top: 1px solid #e2e8f0;
          padding-top: 16px;
        }

        .auth-help summary {
          cursor: pointer;
          color: #64748b;
          font-size: 14px;
          margin-bottom: 8px;
        }

        .help-content {
          font-size: 13px;
          color: #64748b;
          line-height: 1.5;
        }

        .help-content p {
          margin: 8px 0;
        }

        .loading-indicator {
          display: flex;
          align-items: center;
        }
      `}</style>
    </div>
  );
};

export default AuthManager;