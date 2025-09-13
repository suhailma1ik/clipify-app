import { getShortcutLabel } from "./platform";

/**
 * Generate status messages for different operations
 */
export const statusMessages = {
  ready: `Global shortcut ${getShortcutLabel()} ready to capture text`,
  rephrasing: "🔄 Rephrasing text...",
  rephrasingManual: "🔄 Rephrasing manual text...",
  success: (timestamp: string) => `✅ Text rephrased and copied! ${timestamp}`,
  successCleaned: (timestamp: string) => `✅ Text cleaned and copied! ${timestamp}`,
  successManual: (timestamp: string) => `✅ Manual text rephrased! ${timestamp}`,
  noText: "⚠️ No text to clean",
  tokenRequired: "❌ JWT token required for rephrasing",
  error: (message: string) => `❌ Failed to rephrase: ${message}`,
  clipboardError: (error: unknown) => `❌ Error reading clipboard: ${error}`,
  shortcutError: (error: unknown) => `❌ Failed to setup shortcut: ${error}`
};

/**
 * Get current timestamp formatted for display
 */
export const getCurrentTimestamp = (): string => {
  return new Date().toLocaleTimeString();
};

/**
 * Reset status to ready state after delay
 */
export const resetStatusAfterDelay = (
  setStatus: (status: string) => void,
  delay: number = 3000
): void => {
  setTimeout(() => {
    setStatus(statusMessages.ready);
  }, delay);
};