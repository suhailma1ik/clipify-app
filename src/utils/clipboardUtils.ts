import { invoke } from "@tauri-apps/api/core";
import { isTauriEnvironment } from './index';

/**
 * Add content to clipboard history
 */
export const addToClipboardHistory = async (
  content: string,
  isCleaned: boolean = false,
  originalContent?: string
): Promise<void> => {
  if (!isTauriEnvironment()) {
    console.warn('Clipboard history not available in browser environment');
    return;
  }
  
  try {
    await invoke('add_to_clipboard_history', {
      content,
      is_cleaned: isCleaned,
      original_content: originalContent || content
    });
  } catch (error) {
    console.error('Failed to add to clipboard history:', error);
    throw error;
  }
};

/**
 * Setup global shortcut for clipboard monitoring
 */
export const setupGlobalShortcut = async (): Promise<void> => {
  if (!isTauriEnvironment()) {
    console.warn('Global shortcuts not available in browser environment');
    return;
  }
  
  try {
    await invoke('setup_global_shortcut');
    console.log('Global shortcut setup completed');
  } catch (error) {
    console.error('Failed to setup global shortcut:', error);
    throw error;
  }
};

/**
 * Write text to clipboard
 */
export const writeToClipboard = async (text: string): Promise<void> => {
  try {
    if (isTauriEnvironment()) {
      const { writeText } = await import('@tauri-apps/plugin-clipboard-manager');
      await writeText(text);
    } else {
      // Browser fallback using native clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
    }
  } catch (error) {
    console.error('Failed to write to clipboard:', error);
    throw error;
  }
};