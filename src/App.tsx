import { useEffect } from "react";
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
  const { isAuthenticated } = useAuth();

  // Sync JWT tokens from auth service to API client
  useAuthTokenSync();

  // Auto-rephrase functionality (triggered by Cmd+Shift+C global shortcut)
  const { setupAutoRephraseListener } = useAutoRephrase({
    showNotification,
    setShortcutStatus,
  });

  // Manual rephrase functionality (for UI-based rephrasing)
  // const {
  //   manualText,
  //   setManualText,
  //   rephrasedText,
  //   isRephrasingManual,
  //   handleManualRephrase,
  // } = useManualRephrase({
  //   isAuthenticated,
  //   showNotification,
  //   setShortcutStatus,
  // });

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
    <main className="container">
      <Header />
      <NotificationBanner
        notification={notification}
        onDismiss={clearNotification}
      />

      {!isAuthenticated && (
        <AuthManager showUserInfo={true} compact={false} className="card card-hover" />
      )}

      {isAuthenticated && (
        <div className="card card-hover mb-16">
          <div className="row-between">
            <div className="row-center gap-8">
              <span>🟢</span>
              <span className="badge badge-success">Authenticated</span>
            </div>
            <AuthManager showUserInfo={false} compact={true} />
          </div>
        </div>
      )}

      {/* Hotkey Permission Manager */}
      {/* <HotkeyPermissionManager 
        onPermissionGranted={() => {
          console.log('Accessibility permissions granted');
        }}
        onShortcutRegistered={() => {
          console.log('Global shortcut registered successfully');
          // Retry clipboard monitoring setup after shortcut registration
          setupClipboardMonitoring();
        }}
      /> */}
      {/* Manual Text Rephrase Section - Only show when authenticated */}
      {/* {isAuthenticated && (
        <ManualRephraseSection
          manualText={manualText}
          setManualText={setManualText}
          rephrasedText={rephrasedText}
          isRephrasingManual={isRephrasingManual}
          onRephrase={handleManualRephrase}
        />
      )} */}

      {/* Clipboard Monitoring Controls */}
      {/* {isAuthenticated && (
        <div className="card card-hover mt-16">
          <h3>Clipboard Monitoring</h3>
          <div className="row-center gap-12 mb-16">
            <button className="btn btn-primary" onClick={startClipboardMonitoring}>
              Start Monitoring
            </button>
            <button className="btn btn-danger" onClick={stopClipboardMonitoring}>
              Stop Monitoring
            </button>
          </div>
          <p>Start monitoring to automatically track clipboard changes and build history.</p>
        </div>
      )} */}

      {/* Clipboard History */}
      {isAuthenticated && (
        <ClipboardHistory
          clipboardHistory={clipboardHistory}
          searchQuery={searchQuery}
          filteredHistory={filteredHistory}
          selectedEntry={selectedEntry}
          onSearchQueryChange={(query) => {
            setSearchQuery(query);
            searchClipboardHistory(query);
          }}
          onSelectEntry={setSelectedEntry}
          onDeleteEntry={deleteHistoryEntry}
          onClearAllHistory={clearAllHistory}
          onRefreshHistory={loadClipboardHistory}
          onPasteFromHistory={pasteFromHistory}
        />
      )}

      {/* <Footer /> */}
    </main>
  );
}

export default App;
