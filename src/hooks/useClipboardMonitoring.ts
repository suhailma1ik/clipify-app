import { useCallback } from 'react';
import { 
  setupGlobalShortcut,
  statusMessages
} from '../utils';

interface UseClipboardMonitoringProps {
  setCleanedText: (text: string) => void;
  loadClipboardHistory: () => Promise<void>;
  setShortcutStatus: (status: string) => void;
}

export const useClipboardMonitoring = ({
  setCleanedText,
  loadClipboardHistory,
  setShortcutStatus
}: UseClipboardMonitoringProps) => {

  const setupClipboardMonitoring = useCallback(async () => {
    try {
      // Setup global shortcut (Cmd+Shift+C) - this is handled by Rust backend
      await setupGlobalShortcut();
      console.log('[useClipboardMonitoring] Global shortcut setup complete - clipboard monitoring is now event-driven');

      // Setup event listener for clipboard updates from the global shortcut
      const { listen } = await import('@tauri-apps/api/event');
      
      const unlisten = await listen('clipboard-updated', async (event) => {
        const cleanedText = event.payload as string;
        console.log('[useClipboardMonitoring] Clipboard updated via global shortcut:', { 
          textLength: cleanedText.length 
        });

        if (cleanedText && cleanedText.trim() !== "") {
          setCleanedText(cleanedText);
          
          try {
            // Reload clipboard history since it was updated by the backend
            await loadClipboardHistory();
            console.log('[useClipboardMonitoring] Clipboard history reloaded');
          } catch (error) {
            console.error('[useClipboardMonitoring] Failed to reload clipboard history:', error);
          }
        }
      });

      console.log('[useClipboardMonitoring] Event-driven clipboard monitoring setup complete');
      
      return () => {
        unlisten();
        console.log('[useClipboardMonitoring] Clipboard monitoring cleanup complete');
      };
    } catch (error) {
      console.error('[useClipboardMonitoring] Failed to setup clipboard monitoring:', error);
      setShortcutStatus(statusMessages.shortcutError(error));
    }
  }, [setCleanedText, loadClipboardHistory, setShortcutStatus]);

  return { 
    setupClipboardMonitoring
  };
};