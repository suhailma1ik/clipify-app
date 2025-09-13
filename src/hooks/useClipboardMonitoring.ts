import { useCallback } from "react";
import { setupGlobalShortcut, statusMessages } from "../utils";

interface UseClipboardMonitoringProps {
  setCleanedText: (text: string) => void;
  loadClipboardHistory: () => Promise<void>;
  setShortcutStatus: (status: string) => void;
}

export const useClipboardMonitoring = ({
  setCleanedText,
  loadClipboardHistory,
  setShortcutStatus,
}: UseClipboardMonitoringProps) => {
  const setupClipboardMonitoring = useCallback(async () => {
    try {
      // Setup global shortcut (Cmd+Shift+C) - this is handled by Rust backend
      // Note: This will only succeed if accessibility permissions are granted
      await setupGlobalShortcut();
      console.log(
        "[useClipboardMonitoring] Global shortcut setup complete - clipboard monitoring is now event-driven"
      );

      // Setup event listeners for clipboard updates
      const { listen } = await import("@tauri-apps/api/event");

      // Listen for clipboard updates from the global shortcut (Cmd+Shift+C)
      // Note: Only handle UI updates here, API calls are handled by useAutoRephrase
      const unlistenGlobalShortcut = await listen("clipboard-updated", async (event) => {
        const cleanedText = event.payload as string;
        console.log(
          "[useClipboardMonitoring] Clipboard updated via global shortcut:",
          {
            textLength: cleanedText.length,
          }
        );

        if (cleanedText && cleanedText.trim() !== "") {
          // Update UI with cleaned text (no API call here to avoid duplicates)
          setCleanedText(cleanedText);

          try {
            // Reload clipboard history since it was updated by the backend
            await loadClipboardHistory();
            console.log("[useClipboardMonitoring] Clipboard history reloaded");
          } catch (error) {
            console.error(
              "[useClipboardMonitoring] Failed to reload clipboard history:",
              error
            );
          }
        }
      });

      // Listen for regular clipboard changes (regular Cmd+C operations)
      const unlistenClipboardChanges = await listen("clipboard-content-changed", async (event) => {
        const clipboardContent = event.payload as string;
        console.log(
          "[useClipboardMonitoring] Regular clipboard change detected:",
          {
            textLength: clipboardContent.length,
          }
        );

        try {
          // Reload clipboard history to show the new entry
          await loadClipboardHistory();
          console.log("[useClipboardMonitoring] Clipboard history reloaded after regular clipboard change");
        } catch (error) {
          console.error(
            "[useClipboardMonitoring] Failed to reload clipboard history after regular change:",
            error
          );
        }
      });

      console.log(
        "[useClipboardMonitoring] Event-driven clipboard monitoring setup complete"
      );

      return () => {
        unlistenGlobalShortcut();
        unlistenClipboardChanges();
        console.log(
          "[useClipboardMonitoring] Clipboard monitoring cleanup complete"
        );
      };
    } catch (error) {
      console.error(
        "[useClipboardMonitoring] Failed to setup clipboard monitoring:",
        error
      );
      setShortcutStatus(statusMessages.shortcutError(error));
    }
  }, [setCleanedText, loadClipboardHistory, setShortcutStatus]);

  return {
    setupClipboardMonitoring,
  };
};
