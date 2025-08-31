import { useEffect } from "react";
import "./App.css";

// Import components and utilities
import {
  Footer,
  NotificationBanner,
  JwtTokenInput,
  JwtTokenManager,
  ManualRephraseSection,
  HotkeyPermissionRequest,
} from './components';
import { appStyles } from './styles/AppStyles';
import {
  useNotification,
  useJwtToken,
  useClipboardHistory,
  useTextProcessing,
  useAutoRephrase,
  useManualRephrase,
  useClipboardMonitoring,
  useShortcutStatus,
  useHotkeyPermission
} from './hooks';

function App() {
  // Use custom hooks for state management
  const { notification, showNotification, clearNotification } = useNotification();
  const { showTokenInput, setShowTokenInput, saveJwtToken, clearJwtToken, hasJwtToken } = useJwtToken();
  const { loadClipboardHistory } = useClipboardHistory();
  const { setCleanedText } = useTextProcessing(showNotification, loadClipboardHistory);
  const { shortcutStatus, setShortcutStatus } = useShortcutStatus();
  
  // Hotkey permission management
  const {
    permissionStatus,
    showPermissionRequest,
    hasPermission,
    isRequesting,
    error: permissionError,
    requestPermission,
    grantPermission,
    denyPermission,
  } = useHotkeyPermission();

  // Auto-rephrase functionality (triggered by Cmd+Shift+C global shortcut)
  const { setupAutoRephraseListener } = useAutoRephrase({
    showNotification,
    setShortcutStatus
  });

  // Manual rephrase functionality (for UI-based rephrasing)
  const {
    manualText,
    setManualText,
    rephrasedText,
    isRephrasingManual,
    handleManualRephrase
  } = useManualRephrase({
    hasJwtToken,
    showNotification,
    setShowTokenInput,
    setShortcutStatus
  });

  // Clipboard monitoring functionality (event-driven via Cmd+Shift+C global shortcut)
  const { setupClipboardMonitoring } = useClipboardMonitoring({
    setCleanedText,
    loadClipboardHistory,
    setShortcutStatus
  });

  // Setup event listeners and global shortcut
  // Workflow: User selects text → presses Cmd+Shift+C → text gets cleaned → auto-rephrase triggered
  useEffect(() => {
    let mounted = true;

    // Load clipboard history on mount
    loadClipboardHistory();

    // Only setup listeners if hotkey permission is granted
    if (hasPermission) {
      // Setup event listeners and store cleanup functions
      let unlistenAutoRephrase: (() => void) | undefined;
      let cleanupClipboardMonitoring: (() => void) | undefined;

      // Setup auto-rephrase listener
      setupAutoRephraseListener().then(unlisten => {
        if (mounted && unlisten) {
          unlistenAutoRephrase = unlisten;
        }
      });

      // Setup clipboard monitoring
      setupClipboardMonitoring().then(cleanup => {
        if (mounted && cleanup) {
          cleanupClipboardMonitoring = cleanup;
        }
      });

      return () => {
        mounted = false;
        // Cleanup event listeners
        if (unlistenAutoRephrase) {
          unlistenAutoRephrase();
        }
        if (cleanupClipboardMonitoring) {
          cleanupClipboardMonitoring();
        }
      };
    } else if (permissionStatus === 'unknown') {
      // Request permission on first load
      requestPermission();
    }

    return () => {
      mounted = false;
    };
  }, [loadClipboardHistory, setCleanedText, setupAutoRephraseListener, setupClipboardMonitoring, hasPermission, permissionStatus, requestPermission]);


  console.log(shortcutStatus);

  const getStatusMessage = () => {
    if (hasPermission) {
      return shortcutStatus;
    } else if (permissionStatus === 'denied') {
      if (permissionError) {
        return permissionError;
      }
      return 'Hotkey access denied. Manual rephrase available below.';
    } else {
      return 'Hotkey permission required for global shortcuts.';
    }
  };

  return (
    <main className="container" style={appStyles.mainContainer}>
      {/* Professional Header */}
      {/* <Header /> */}

      {/* Hotkey Permission Request */}
      {showPermissionRequest && (
        <HotkeyPermissionRequest
          onGrantPermission={grantPermission}
          onDenyPermission={denyPermission}
          isRequesting={isRequesting}
        />
      )}

      {/* Notification Display */}
      <NotificationBanner
        notification={notification}
        onDismiss={clearNotification}
      />

      {/* JWT Token Input Section */}
      {showTokenInput && (
        <JwtTokenInput
          onSaveToken={saveJwtToken}
          onCancel={() => setShowTokenInput(false)}
          showNotification={showNotification}
        />
      )}

      {/* JWT Token Management Section */}
      {!showTokenInput && (
        <JwtTokenManager
          hasToken={hasJwtToken}
          onShowTokenInput={() => setShowTokenInput(true)}
          onClearToken={clearJwtToken}
          showNotification={showNotification}
        />
      )}

      {/* Status Display Section */}
      <div style={appStyles.card}>
        <div style={appStyles.rowCenter}>
          <div style={appStyles.iconBox}>
            <span style={appStyles.iconLarge}>
              {hasPermission ? '⌨️' : permissionStatus === 'denied' ? '🚫' : '🔐'}
            </span>
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={appStyles.h3Title}>Global Shortcut Status</h3>
            <p style={{
              ...appStyles.mutedText,
              color: hasPermission ? '#4caf50' : permissionStatus === 'denied' ? '#f44336' : '#ff9800'
            }}>
              {getStatusMessage()}
            </p>
            {permissionStatus === 'denied' && permissionError && permissionError.includes('Accessibility') && (
              <button
                onClick={requestPermission}
                style={{
                  marginTop: '8px',
                  padding: '8px 16px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Retry Permission Setup
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Manual Text Rephrase Section */}
      <ManualRephraseSection
        manualText={manualText}
        setManualText={setManualText}
        rephrasedText={rephrasedText}
        isRephrasingManual={isRephrasingManual}
        onRephrase={handleManualRephrase}
      />

      <Footer />
    </main>
  );
}

export default App;
