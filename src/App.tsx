import { useEffect } from "react";
import "./App.css";

// Import components and utilities
import {
  NotificationBanner,
  ManualRephraseSection,
  AuthManager,
  HotkeyPermissionManager,
} from "./components";
import { appStyles } from "./styles/AppStyles";
import {
  useNotification,
  useClipboardHistory,
  useTextProcessing,
  useAutoRephrase,
  useManualRephrase,
  useClipboardMonitoring,
  useShortcutStatus,
  useAuth,
  useAuthTokenSync,
} from "./hooks";

function App() {
  // Use custom hooks for state management
  const { notification, showNotification, clearNotification } =
    useNotification();
  const { loadClipboardHistory } = useClipboardHistory();
  const { setCleanedText } = useTextProcessing(
    showNotification,
    loadClipboardHistory
  );
  const { setShortcutStatus } = useShortcutStatus();
  const { isAuthenticated } = useAuth();

  // Sync JWT tokens from auth service to API client
  useAuthTokenSync();

  // Auto-rephrase functionality (triggered by Cmd+Shift+C global shortcut)
  const { setupAutoRephraseListener } = useAutoRephrase({
    showNotification,
    setShortcutStatus,
  });

  // Manual rephrase functionality (for UI-based rephrasing)
  const {
    manualText,
    setManualText,
    rephrasedText,
    isRephrasingManual,
    handleManualRephrase,
  } = useManualRephrase({
    isAuthenticated,
    showNotification,
    setShortcutStatus,
  });

  // Clipboard monitoring functionality (event-driven via Cmd+Shift+C global shortcut)
  const { setupClipboardMonitoring } = useClipboardMonitoring({
    setCleanedText,
    loadClipboardHistory,
    setShortcutStatus,
  });

  // Setup event listeners and global shortcut
  // Workflow: User selects text → presses Cmd+Shift+C → text gets cleaned → auto-rephrase triggered
  useEffect(() => {
    let mounted = true;

    // Load clipboard history on mount
    loadClipboardHistory();

    // Setup event listeners and store cleanup functions
    let unlistenAutoRephrase: (() => void) | undefined;
    let cleanupClipboardMonitoring: (() => void) | undefined;

    // Setup auto-rephrase listener
    setupAutoRephraseListener().then((unlisten) => {
      if (mounted && unlisten) {
        unlistenAutoRephrase = unlisten;
      }
    });

    // Setup clipboard monitoring
    setupClipboardMonitoring().then((cleanup) => {
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
  }, [
    loadClipboardHistory,
    setCleanedText,
    setupAutoRephraseListener,
    setupClipboardMonitoring,
  ]);


  return (
    <main className="container" style={appStyles.mainContainer}>
      <NotificationBanner
        notification={notification}
        onDismiss={clearNotification}
      />

      {!isAuthenticated && <AuthManager showUserInfo={true} compact={false} />}

      {/* Hotkey Permission Manager */}
      <HotkeyPermissionManager 
        onPermissionGranted={() => {
          console.log('Accessibility permissions granted');
        }}
        onShortcutRegistered={() => {
          console.log('Global shortcut registered successfully');
          // Retry clipboard monitoring setup after shortcut registration
          setupClipboardMonitoring();
        }}
      />
      {/* Manual Text Rephrase Section - Only show when authenticated */}
      {isAuthenticated && (
        <ManualRephraseSection
          manualText={manualText}
          setManualText={setManualText}
          rephrasedText={rephrasedText}
          isRephrasingManual={isRephrasingManual}
          onRephrase={handleManualRephrase}
        />
      )}

      {/* <Footer /> */}
    </main>
  );
}

export default App;
