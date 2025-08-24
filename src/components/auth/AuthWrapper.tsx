import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import LandingPage from './LandingPage';
import App from '../../App';
import { AuthError, AuthErrorHandler } from '../../utils/errorHandler';
import './AuthWrapper.css';

/**
 * Loading spinner component
 */
const LoadingSpinner: React.FC = () => (
  <div className="auth-loading">
    <div className="auth-loading-container">
      <div className="spinner-large" />
      <h2 className="loading-title">Clipify</h2>
      <p className="loading-message">Initializing application...</p>
    </div>
  </div>
);

/**
 * Error display component
 */
interface ErrorDisplayProps {
  error: AuthError;
  onRetry: () => void;
  onClear: () => void;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onRetry, onClear }) => {
  const errorDisplay = AuthErrorHandler.formatForDisplay(error);
  
  return (
    <div className="auth-error">
      <div className="auth-error-container">
        <div className="error-icon">⚠️</div>
        <h2 className="error-title">{errorDisplay.title}</h2>
        <p className="error-message">{errorDisplay.message}</p>
        <div className="error-details">
          <p className="error-timestamp">
            {error.timestamp.toLocaleTimeString()}
          </p>
          {error.code && (
            <p className="error-code">Code: {error.code}</p>
          )}
        </div>
        <div className="error-actions">
          {error.retryable && (
            <button className="error-button primary" onClick={onRetry}>
              Try Again
            </button>
          )}
          <button className="error-button secondary" onClick={onClear}>
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Authentication wrapper component
 * Routes between landing page and main app based on auth state
 */
export const AuthWrapper: React.FC = () => {
  console.log('[AuthWrapper] Component rendered');
  
  const { 
    isAuthenticated, 
    isLoading, 
    error, 
    login, 
    clearError 
  } = useAuth();
  
  console.log('[AuthWrapper] Auth state - isAuthenticated:', isAuthenticated, 'isLoading:', isLoading, 'error:', error?.message);

  // Show loading spinner during initialization
  if (isLoading) {
    console.log('[AuthWrapper] Showing loading spinner');
    return <LoadingSpinner />;
  }

  // Show error if authentication failed
  if (error) {
    console.log('[AuthWrapper] Showing error display');
    return (
      <ErrorDisplay 
        error={error} 
        onRetry={login} 
        onClear={clearError} 
      />
    );
  }

  // Show main app if authenticated
  if (isAuthenticated) {
    console.log('[AuthWrapper] Showing main application');
    return <App />;
  }

  // Show landing page if not authenticated
  console.log('[AuthWrapper] Showing landing page');
  return (
    <LandingPage 
      onAuthStart={() => {
        console.log('[AuthWrapper] Auth start callback triggered');
        // Clear any previous errors when starting auth
        clearError();
      }}
      onAuthError={(errorMessage) => {
        console.error('[AuthWrapper] Auth error callback triggered:', errorMessage);
        // Error will be handled by AuthContext
      }}
    />
  );
};

export default AuthWrapper;