import { useCallback } from 'react';
import { rephraseService } from '../services/rephraseService';
import { getApiClient } from '../services/apiClient';
import { writeToClipboard, statusMessages, getCurrentTimestamp, resetStatusAfterDelay } from '../utils';

interface UseAutoRephraseProps {
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
  setShortcutStatus: (status: string) => void;
}

export const useAutoRephrase = ({
  showNotification,
  setShortcutStatus
}: UseAutoRephraseProps) => {
  
  const setupAutoRephraseListener = useCallback(async () => {
    try {
      const { listen } = await import('@tauri-apps/api/event');

      const unlisten = await listen('auto-rephrase-request', async (event) => {
        const text = event.payload as string;
        console.log('[useAutoRephrase] Auto-rephrase request received:', { textLength: text.length });

        if (!text || text.trim().length === 0) {
          console.log('[useAutoRephrase] No text to rephrase');
          return;
        }

        try {
          setShortcutStatus(statusMessages.rephrasing);

          // Get current JWT token dynamically from API client
          let currentJwtToken: string | null = null;
          try {
            currentJwtToken = getApiClient().getJwtToken();
          } catch (error) {
            console.error('[useAutoRephrase] Failed to get API client:', error);
            setShortcutStatus(statusMessages.tokenRequired);
            showNotification('API client not initialized', 'error');
            return;
          }

          if (!currentJwtToken) {
            console.log('[useAutoRephrase] JWT token not available for auto-rephrase');
            setShortcutStatus(statusMessages.tokenRequired);
            showNotification('JWT token is required for rephrasing shortcut', 'error');
            return;
          }

          const response = await rephraseService.rephrase(
            text,
            'formal',
            'Business communication',
            'Colleagues',
            false
          );

          await writeToClipboard(response.rephrased_text);

          setShortcutStatus(statusMessages.success(getCurrentTimestamp()));

          console.log('[useAutoRephrase] Text successfully rephrased:', {
            originalLength: text.length,
            rephrasedLength: response.rephrased_text.length
          });

          showNotification('Text rephrased and copied to clipboard!', 'success');

        } catch (error) {
          console.error('[useAutoRephrase] Failed to rephrase text:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          setShortcutStatus(statusMessages.error(errorMessage));

          showNotification(
            `Failed to rephrase text: ${errorMessage}`,
            'error'
          );
        } finally {
          resetStatusAfterDelay(setShortcutStatus);
        }
      });

      console.log('[useAutoRephrase] Auto-rephrase event listener setup complete');
      return unlisten;
    } catch (error) {
      console.error('[useAutoRephrase] Failed to setup auto-rephrase listener:', error);
    }
  }, [showNotification, setShortcutStatus]);

  return { setupAutoRephraseListener };
};