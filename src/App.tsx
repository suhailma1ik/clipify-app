import { useEffect, useMemo } from "react";
import "./App.css";

// Import components and utilities
import Header from "./components/Header";
import {
  NotificationBanner,
  AuthManager,
  ClipboardHistory,
} from "./components";
import {
  useNotification,
  useClipboardHistory,
  useTextProcessing,
  useAutoRephrase,
  useClipboardMonitoring,
  useShortcutStatus,
  useAuth,
  useAuthTokenSync,
} from "./hooks";

function App() {
  // Use custom hooks for state management
  const { notification, showNotification, clearNotification } =
    useNotification();
  const {
    clipboardHistory,
    searchQuery,
    setSearchQuery,
    filteredHistory,
    selectedEntry,
    setSelectedEntry,
    loadClipboardHistory,
    searchClipboardHistory,
    deleteHistoryEntry,
    clearAllHistory,
    pasteFromHistory,
  } = useClipboardHistory();

  const { setCleanedText } = useTextProcessing(
    showNotification,
    loadClipboardHistory
  );
  const { setShortcutStatus } = useShortcutStatus();
  const { isAuthenticated, user } = useAuth();

  // Sync JWT tokens from auth service to API client
  useAuthTokenSync();

  // Auto-rephrase functionality (triggered by Cmd+Shift+C global shortcut)
  const { setupAutoRephraseListener } = useAutoRephrase({
    showNotification,
    setShortcutStatus,
  });

  // Clipboard monitoring functionality (event-driven via Cmd+Shift+C global shortcut)
  const { setupClipboardMonitoring } = useClipboardMonitoring({
    setCleanedText,
    loadClipboardHistory,
    setShortcutStatus,
  });

  // Memoize clipboard history handlers to prevent unnecessary re-renders
  const clipboardHandlers = useMemo(
    () => ({
      onSearchQueryChange: (query: string) => {
        setSearchQuery(query);
        searchClipboardHistory(query);
      },
      onSelectEntry: setSelectedEntry,
      onDeleteEntry: deleteHistoryEntry,
      onClearAllHistory: clearAllHistory,
      onRefreshHistory: loadClipboardHistory,
      onPasteFromHistory: pasteFromHistory,
    }),
    [
      setSearchQuery,
      searchClipboardHistory,
      setSelectedEntry,
      deleteHistoryEntry,
      clearAllHistory,
      loadClipboardHistory,
      pasteFromHistory,
    ]
  );

  // Setup event listeners and global shortcut
  useEffect(() => {
    let mounted = true;
    let unlistenAutoRephrase: (() => void) | undefined;
    let cleanupClipboardMonitoring: (() => void) | undefined;

    // Load clipboard history on mount
    loadClipboardHistory();

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
      if (unlistenAutoRephrase) unlistenAutoRephrase();
      if (cleanupClipboardMonitoring) cleanupClipboardMonitoring();
    };
  }, [
    loadClipboardHistory,
    setupAutoRephraseListener,
    setupClipboardMonitoring,
  ]);

  return (
    <main className="container">
      <Header username={user?.name || user?.email || "Guest User"} />

      <NotificationBanner
        notification={notification}
        onDismiss={clearNotification}
      />

      {/* Authentication Section - Modern & Clean */}
      <div className="auth-section fade-in">
        {!isAuthenticated ? (
          <div className="auth-card glass-enhanced">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                marginBottom: "20px",
              }}
            >
              <div className="auth-icon">🔐</div>
              <div>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 600 }}>
                  Authentication Required
                </h3>
                <p
                  style={{ margin: "4px 0 0", fontSize: "14px", opacity: 0.7 }}
                >
                  Sign in to access clipboard management features
                </p>
              </div>
            </div>
            <AuthManager showUserInfo={true} compact={false} />
          </div>
        ) : (
          <div className="auth-status-card slide-up">
            <div className="status-indicator">
              <div className="status-dot status-success"></div>
              <span className="status-text">Connected & Ready</span>
            </div>
            <AuthManager showUserInfo={false} compact={true} />
          </div>
        )}
      </div>

      {/* Main Content - Only show when authenticated */}
      {isAuthenticated && (
        <div className="main-content fade-in">
          <ClipboardHistory
            clipboardHistory={clipboardHistory}
            searchQuery={searchQuery}
            filteredHistory={filteredHistory}
            selectedEntry={selectedEntry}
            {...clipboardHandlers}
          />
        </div>
      )}
    </main>
  );
}

export default App;
