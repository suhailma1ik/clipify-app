import { useState } from 'react';
import { oauthService } from '../../services/oauthService';
import './LandingPage.css';

/**
 * Props for the LandingPage component
 */
interface LandingPageProps {
  onAuthStart?: () => void;
  onAuthError?: (error: string) => void;
}

/**
 * Landing page component for unauthenticated users
 * Displays welcome message and authentication options
 */
export const LandingPage: React.FC<LandingPageProps> = ({
  onAuthStart,
  onAuthError
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<'login' | 'signup' | null>(null);

  console.log('[LandingPage] Component rendered');

  /**
   * Handle login button click
   */
  const handleLogin = async () => {
    console.log('[LandingPage] Login button clicked');
    
    if (isLoading) {
      console.log('[LandingPage] Already loading, ignoring click');
      return;
    }
    
    setIsLoading(true);
    setLoadingAction('login');
    onAuthStart?.();
    console.log('[LandingPage] Auth start callback called');

    try {
      console.log('[LandingPage] Starting login flow...');
      await oauthService.launchOAuthFlow(false);
      console.log('[LandingPage] Login flow launched successfully');
    } catch (error) {
      console.error('[LandingPage] Login failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start login process';
      console.error('[LandingPage] Login error message:', errorMessage);
      onAuthError?.(errorMessage);
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
      console.log('[LandingPage] Login flow completed');
    }
  };

  /**
   * Handle signup button click
   */
  const handleSignup = async () => {
    console.log('[LandingPage] Signup button clicked');
    
    if (isLoading) {
      console.log('[LandingPage] Already loading, ignoring click');
      return;
    }
    
    setIsLoading(true);
    setLoadingAction('signup');
    onAuthStart?.();
    console.log('[LandingPage] Auth start callback called');

    try {
      console.log('[LandingPage] Starting signup flow...');
      await oauthService.launchOAuthFlow(true);
      console.log('[LandingPage] Signup flow launched successfully');
    } catch (error) {
      console.error('[LandingPage] Signup failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start signup process';
      console.error('[LandingPage] Signup error message:', errorMessage);
      onAuthError?.(errorMessage);
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
      console.log('[LandingPage] Signup flow completed');
    }
  };

  return (
    <div className="landing-page">
      <div className="landing-container">
        {/* Header Section */}
        <div className="landing-header">
          <div className="logo-section">
            <div className="app-icon">
              📋
            </div>
            <h1 className="app-title">Clipify</h1>
          </div>
          <p className="app-subtitle">Professional Text Cleanup Tool</p>
        </div>

        {/* Main Content */}
        <div className="landing-content">
          <div className="welcome-section">
            <h2 className="welcome-title">Welcome to Clipify Desktop</h2>
            <p className="welcome-description">
              Transform your text with AI-powered cleanup and enhancement. 
              Clipify removes unwanted characters, fixes formatting, and makes your text 
              professional and readable.
            </p>
          </div>

          {/* Features List */}
          <div className="features-section">
            <h3 className="features-title">Key Features</h3>
            <ul className="features-list">
              <li className="feature-item">
                <span className="feature-icon">🧹</span>
                <span className="feature-text">Intelligent text cleanup and formatting</span>
              </li>
              <li className="feature-item">
                <span className="feature-icon">⚡</span>
                <span className="feature-text">Lightning-fast processing with global shortcuts</span>
              </li>
              <li className="feature-item">
                <span className="feature-icon">📋</span>
                <span className="feature-text">Clipboard history and management</span>
              </li>
              <li className="feature-item">
                <span className="feature-icon">🤖</span>
                <span className="feature-text">AI-powered text enhancement</span>
              </li>
              <li className="feature-item">
                <span className="feature-icon">🔒</span>
                <span className="feature-text">Secure and privacy-focused</span>
              </li>
            </ul>
          </div>

          {/* Authentication Buttons */}
          <div className="auth-section">
            <div className="auth-buttons">
              <button
                className={`auth-button primary ${isLoading && loadingAction === 'login' ? 'loading' : ''}`}
                onClick={handleLogin}
                disabled={isLoading}
              >
                {isLoading && loadingAction === 'login' ? (
                  <>
                    <div className="spinner" />
                    <span>Opening Browser...</span>
                  </>
                ) : (
                  <>
                    <span className="button-icon">🔑</span>
                    <span>Login to Clipify</span>
                  </>
                )}
              </button>

              <button
                className={`auth-button secondary ${isLoading && loadingAction === 'signup' ? 'loading' : ''}`}
                onClick={handleSignup}
                disabled={isLoading}
              >
                {isLoading && loadingAction === 'signup' ? (
                  <>
                    <div className="spinner" />
                    <span>Opening Browser...</span>
                  </>
                ) : (
                  <>
                    <span className="button-icon">✨</span>
                    <span>Create Account</span>
                  </>
                )}
              </button>
            </div>

            <div className="auth-info">
              <p className="auth-description">
                Sign in with your Clipify account to access all features and sync your preferences.
              </p>
              <p className="auth-note">
                Your browser will open for secure authentication. 
                Return to this app after signing in.
              </p>
            </div>
          </div>

          {/* Footer Section */}
          <div className="landing-footer">
            <p className="footer-text">
              Need help? Visit our{' '}
              <a 
                href="https://clipify.space/support" 
                target="_blank" 
                rel="noopener noreferrer"
                className="footer-link"
              >
                support page
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;