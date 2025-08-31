import { appStyles, buttons } from '../styles/AppStyles';

interface JwtTokenManagerProps {
  hasToken: boolean;
  onShowTokenInput: () => void;
  onClearToken: () => void;
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}

export function JwtTokenManager({ 
  hasToken, 
  onShowTokenInput, 
  onClearToken, 
  showNotification 
}: JwtTokenManagerProps) {
  const handleClearToken = () => {
    try {
      onClearToken();
      showNotification('JWT token cleared successfully', 'success');
    } catch (error) {
      console.error('Failed to clear JWT token:', error);
      showNotification('Failed to clear JWT token', 'error');
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
            <span style={appStyles.iconLarge}>🔑</span>
          </div>
          <div>
            <h3 style={appStyles.h3Title}>JWT Token Management</h3>
            <p style={appStyles.mutedText}>
              {hasToken 
                ? 'JWT token is configured and ready to use' 
                : 'No JWT token configured'
              }
            </p>
          </div>
        </div>

        <div style={{
          padding: '8px 12px',
          borderRadius: '6px',
          backgroundColor: hasToken ? '#d4edda' : '#f8d7da',
          color: hasToken ? '#155724' : '#721c24',
          fontSize: '12px',
          fontWeight: '500'
        }}>
          {hasToken ? '✅ Active' : '❌ Not Set'}
        </div>
      </div>

      <div style={appStyles.rowGap12}>
        <button
          onClick={onShowTokenInput}
          style={buttons.primary({ large: false })}
        >
          <span>🔄</span>
          {hasToken ? 'Update Token' : 'Add Token'}
        </button>

        {hasToken && (
          <button
            onClick={handleClearToken}
            style={buttons.secondary({ large: false })}
          >
            <span>🗑️</span>
            Clear Token
          </button>
        )}
      </div>
    </div>
  );
}