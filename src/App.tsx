import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isPermissionGranted, requestPermission } from "@tauri-apps/plugin-notification";
import { readText, writeText } from "@tauri-apps/plugin-clipboard-manager";
import "./App.css";

// Import components and utilities
import {
  Header,
  StatusCards,
  GlobalShortcut,
  ManualTextCleanup,
  LiveClipboard,
  ClipboardHistory,
  Footer
} from './components';
import { ClipboardEntry } from './types';
import { cleanupText, commonStyles } from './utils';

function App() {
  const [originalText, setOriginalText] = useState<string>("");
  const [cleanedText, setCleanedText] = useState<string>("");
  const [clipboard, setClipboard] = useState<string>("");
  const [shortcutStatus, setShortcutStatus] = useState<string>("Global shortcut Cmd+Shift+C ready to capture text");
  const [isProcessing, setIsProcessing] = useState(false);
  const [trayStatus, setTrayStatus] = useState<string>("System tray active");
  const [permissionStatus, setPermissionStatus] = useState<string>("Checking permissions...");
  const lastValueRef = useRef<string>("");
  
  // Clipboard history state
  const [clipboardHistory, setClipboardHistory] = useState<ClipboardEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filteredHistory, setFilteredHistory] = useState<ClipboardEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<ClipboardEntry | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Clipboard history functions
  async function loadClipboardHistory() {
    try {
      const history = await invoke<ClipboardEntry[]>('get_clipboard_history');
      setClipboardHistory(history);
      setFilteredHistory(history);
    } catch (error) {
      console.error('Failed to load clipboard history:', error);
    }
  }

  async function searchClipboardHistory(query: string) {
    try {
      if (query.trim() === '') {
        setFilteredHistory(clipboardHistory);
      } else {
        const results = await invoke<ClipboardEntry[]>('search_clipboard_history', { query });
        setFilteredHistory(results);
      }
    } catch (error) {
      console.error('Failed to search clipboard history:', error);
    }
  }

  async function deleteHistoryEntry(id: string) {
    try {
      await invoke('remove_from_clipboard_history', { id });
      await loadClipboardHistory();
    } catch (error) {
      console.error('Failed to delete history entry:', error);
    }
  }

  async function clearAllHistory() {
    try {
      await invoke('clear_clipboard_history');
      setClipboardHistory([]);
      setFilteredHistory([]);
      setSelectedEntry(null);
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  }

  async function pasteFromHistory(id: string) {
    try {
      const content = await invoke<string>('paste_from_history', { id });
      setClipboard(content);
      // Also update the manual text editor
      setOriginalText(content);
      setCleanedText(cleanupText(content));
    } catch (error) {
      console.error('Failed to paste from history:', error);
    }
  }



  // System tray and window management functions
  async function hideToTray() {
    try {
      await invoke('hide_main_window');
      setTrayStatus("✅ App minimized to system tray");
    } catch (error) {
      console.error("Error hiding to tray:", error);
      setTrayStatus(`❌ Error hiding to tray: ${error}`);
    }
  }

  // async function showFromTray() {
  //   try {
  //     await invoke('show_main_window');
  //     setTrayStatus("✅ App restored from system tray");
  //   } catch (error) {
  //     console.error("Error showing from tray:", error);
  //     setTrayStatus(`❌ Error showing from tray: ${error}`);
  //   }
  // }

  // Check accessibility permissions
  async function checkPermissions() {
    try {
      const result = await invoke('check_accessibility_permissions');
      setPermissionStatus(`✅ ${result}`);
    } catch (error) {
      setPermissionStatus(`❌ ${error}`);
    }
  }

  async function toggleWindowVisibility() {
    try {
      await invoke('toggle_window_visibility');
      const window = getCurrentWindow();
      const visible = await window.isVisible();
      setTrayStatus(visible ? "✅ Window shown" : "✅ Window hidden to tray");
    } catch (error) {
      console.error("Error toggling window visibility:", error);
      setTrayStatus(`❌ Error toggling visibility: ${error}`);
    }
  }


  // Handler functions for components
  const handleOriginalTextChange = (text: string) => {
    setOriginalText(text);
    if (text) {
      setCleanedText(cleanupText(text));
    }
  };

  async function processClipboardText() {
    setIsProcessing(true);
    try {
      const text = await readText();
      if (text) {
        setOriginalText(text);
        const cleaned = cleanupText(text);
        setCleanedText(cleaned);
        
        // Automatically copy cleaned text back to clipboard
        await writeText(cleaned);
        
        setShortcutStatus(`✅ Text cleaned and copied! ${new Date().toLocaleTimeString()}`);
        setTimeout(() => {
          setShortcutStatus("Global shortcut Cmd+Shift+C ready to capture text");
        }, 3000);
      }
    } catch (error) {
      setShortcutStatus(`❌ Error processing text: ${error}`);
      setTimeout(() => {
        setShortcutStatus("Global shortcut Cmd+Shift+C ready to capture text");
      }, 3000);
    }
    setIsProcessing(false);
  }

  async function copyCleanedText() {
    if (cleanedText) {
      await writeText(cleanedText);
      setShortcutStatus(`✅ Cleaned text copied to clipboard!`);
      setTimeout(() => {
        setShortcutStatus("Global shortcut Cmd+Shift+C ready to capture text");
      }, 2000);
    }
  }

  const handleRefreshClipboard = async () => {
    setClipboard((await readText()) ?? "");
  };

  useEffect(() => {
    let mounted = true;
    
    // Load clipboard history on mount
    loadClipboardHistory();
    
    // Monitor clipboard for changes
    const readOnce = async () => {
      try {
        const text = (await readText()) ?? "";
        if (mounted && text !== lastValueRef.current) {
          lastValueRef.current = text;
          setClipboard(text);
        }
      } catch (e) {
        // ignore read errors
      }
    };

    // Initial read
    readOnce();
    // Poll clipboard periodically
    const id = setInterval(readOnce, 500);
    
    // Listen for clipboard updates from global shortcut
    const unlistenClipboard = listen<string>('clipboard-updated', async (event) => {
      setOriginalText(event.payload);
      const cleaned = cleanupText(event.payload);
      setCleanedText(cleaned);
      
      // Auto-copy cleaned text back to clipboard
      await writeText(cleaned);
      
      setShortcutStatus(`✅ Text automatically cleaned via Cmd+Shift+C: ${new Date().toLocaleTimeString()}`);
      
      // Update clipboard display
      setClipboard(cleaned);
      lastValueRef.current = cleaned;
      
      // Reload clipboard history to show new entries
      await loadClipboardHistory();
      
      // Reset status after 3 seconds
      setTimeout(() => {
        setShortcutStatus("Global shortcut Cmd+Shift+C ready to capture text");
      }, 3000);
    });
    
    // Request notification permissions
    const setupPermissions = async () => {
      let permission = await isPermissionGranted();
      if (!permission) {
        await requestPermission();
      }
    };
    setupPermissions();
    
    // Check accessibility permissions
    checkPermissions();
    
    return () => {
      mounted = false;
      clearInterval(id);
      unlistenClipboard.then(fn => fn());
    };
  }, []);

  // Search effect
  useEffect(() => {
    searchClipboardHistory(searchQuery);
  }, [searchQuery, clipboardHistory]);

  return (
    <main className="container" style={commonStyles.container}>
      {/* Header Section */}
      <Header />

      {/* Status Cards Grid */}
      <StatusCards
        trayStatus={trayStatus}
        permissionStatus={permissionStatus}
        onHideToTray={hideToTray}
        onToggleWindowVisibility={toggleWindowVisibility}
        onCheckPermissions={checkPermissions}
      />
      {/* Global Shortcut Status Card */}
      <GlobalShortcut shortcutStatus={shortcutStatus} />

      {/* Manual Text Cleanup Section */}
      <ManualTextCleanup
        originalText={originalText}
        cleanedText={cleanedText}
        isProcessing={isProcessing}
        onOriginalTextChange={handleOriginalTextChange}
        onProcessClipboardText={processClipboardText}
        onCopyCleanedText={copyCleanedText}
      />

      {/* Current Clipboard Section */}
      <LiveClipboard
        clipboard={clipboard}
        onRefreshClipboard={handleRefreshClipboard}
      />
      
      {/* Clipboard History Section */}
      <ClipboardHistory
        clipboardHistory={clipboardHistory}
        searchQuery={searchQuery}
        filteredHistory={filteredHistory}
        selectedEntry={selectedEntry}
        showHistory={showHistory}
        onSearchQueryChange={setSearchQuery}
        onSelectEntry={setSelectedEntry}
        onToggleHistory={() => setShowHistory(!showHistory)}
        onDeleteEntry={deleteHistoryEntry}
        onClearAllHistory={clearAllHistory}
        onRefreshHistory={loadClipboardHistory}
        onPasteFromHistory={pasteFromHistory}
      />
      
      {/* Footer */}
      <Footer />
    </main>
  );
}

export default App;
