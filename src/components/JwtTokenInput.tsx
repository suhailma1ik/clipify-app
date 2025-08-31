import { useState } from 'react';
import { appStyles, buttons } from '../styles/AppStyles';

interface JwtTokenInputProps {
  onSaveToken: (token: string) => void;
  onCancel?: () => void;
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}

export function JwtTokenInput({ onSaveToken, onCancel, showNotification }: JwtTokenInputProps) {
  const [tokenInput, setTokenInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSaveToken = async () => {
    if (!tokenInput.trim()) {
      showNotification('Please enter a valid JWT token', 'error');
      return;
    }

    try {
      setIsLoading(true);
      onSaveToken(tokenInput.trim());
      showNotification('JWT token saved successfully!', 'success');
      setTokenInput('');
    } catch (error) {
      console.error('Failed to save JWT token:', error);
      showNotification(
        `Failed to save token: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setTokenInput('');
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <div style={appStyles.card}>
      <div style={{
        ...appStyles.rowBetween,
        marginBottom: '16px'
      }}>
        <div style={appStyles.rowCenter}>
          <div style={appStyles.iconBox}>
            <span style={appStyles.iconLarge}>🔐</span>
          </div>
          <div>
            <h3 style={appStyles.h3Title}>JWT Token Required</h3>
            <p style={appStyles.mutedText}>Enter your JWT token to access the rephrase API</p>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <textarea
          value={tokenInput}
          onChange={(e) => setTokenInput(e.target.value)}
          placeholder="Paste your JWT token here..."
          style={{
            ...appStyles.input,
            minHeight: '80px',
            resize: 'vertical',
            fontFamily: 'monospace',
            fontSize: '12px'
          }}
        />
      </div>

      <div style={appStyles.rowBetween}>
        <div style={appStyles.rowGap12}>
          <button
            onClick={handleSaveToken}
            disabled={isLoading || !tokenInput.trim()}
            style={buttons.primary({
              large: true,
              disabled: isLoading || !tokenInput.trim()
            })}
          >
            {isLoading ? (
              <>
                <span style={{ animation: 'spin 1s linear infinite' }}>⏳</span>
                Saving...
              </>
            ) : (
              <>
                <span>💾</span>
                Save Token
              </>
            )}
          </button>

          {onCancel && (
            <button
              onClick={handleCancel}
              disabled={isLoading}
              style={buttons.secondary({
                large: true,
                disabled: isLoading
              })}
            >
              Cancel
            </button>
          )}
        </div>

        <div style={appStyles.mutedText}>
          <small>Token will be stored securely in your browser</small>
        </div>
      </div>
    </div>
  );
}