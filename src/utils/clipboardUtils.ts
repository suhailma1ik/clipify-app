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
 * Setup global shortcut for clipboard monitoring using Tauri v2 API
 * This function now uses the frontend API instead of backend commands
 */
export const setupGlobalShortcut = async (): Promise<void> => {
  if (!isTauriEnvironment()) {
    console.warn('Global shortcuts not available in browser environment');
    return;
  }
  
  try {
    // Use Tauri v2 frontend API
    const { isRegistered, register } = await import('@tauri-apps/plugin-global-shortcut');
    
    // First check if shortcut is already registered
    const alreadyRegistered = await isRegistered('CommandOrControl+Shift+C');
    if (alreadyRegistered) {
      console.log('Global shortcut already registered');
      return;
    }

    // Check accessibility permissions first
    try {
      await invoke('check_accessibility_permissions');
      console.log('Accessibility permissions verified');
    } catch (error) {
      throw new Error('Accessibility permissions required. Please grant permissions through the UI.');
    }

    // Register the global shortcut using Tauri v2 API
    await register('CommandOrControl+Shift+C', (event) => {
      console.log('Global shortcut triggered:', event);
      if (event.state === 'Pressed') {
        // Trigger the clipboard copy and clean functionality
        invoke('trigger_clipboard_copy').catch(err => {
          console.error('Failed to copy selected text:', err);
        });
      }
    });
    
    console.log('Global shortcut registered successfully using Tauri v2 API');
  } catch (error) {
    console.error('Failed to register global shortcut:', error);
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