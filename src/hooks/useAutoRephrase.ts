import { useCallback, useRef } from 'react';
import { rephraseService } from '../services/rephraseService';
import { getApiClient } from '../services/apiClient';
import { writeToClipboard, statusMessages, getCurrentTimestamp, resetStatusAfterDelay } from '../utils';
import { getAuthErrorHandler } from '../services/authErrorHandler';

interface UseAutoRephraseProps {
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
  setShortcutStatus: (status: string) => void;
}

export const useAutoRephrase = ({
  showNotification,
  setShortcutStatus
}: UseAutoRephraseProps) => {
  const authErrorHandler = getAuthErrorHandler();
  const lastRequestTimeRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);
  
  // Debounce delay in milliseconds (prevent multiple calls within this window)
  const DEBOUNCE_DELAY = 1000;
  
  const setupAutoRephraseListener = useCallback(async () => {
    try {
      const { listen } = await import('@tauri-apps/api/event');

      const unlisten = await listen('auto-rephrase-request', async (event) => {
        const text = event.payload as string;
        const currentTime = Date.now();
        
        console.log('[useAutoRephrase] Auto-rephrase request received:', { 
          textLength: text.length,
          timeSinceLastRequest: currentTime - lastRequestTimeRef.current,
          isProcessing: isProcessingRef.current
        });

        if (!text || text.trim().length === 0) {
          console.log('[useAutoRephrase] No text to rephrase');
          return;
        }

        // Debouncing: Check if we're already processing or if it's too soon
        if (isProcessingRef.current) {
          console.log('[useAutoRephrase] Request ignored - already processing');
          return;
        }

        if (currentTime - lastRequestTimeRef.current < DEBOUNCE_DELAY) {
          console.log('[useAutoRephrase] Request ignored - too soon since last request');
          return;
        }

        // Update tracking variables
        lastRequestTimeRef.current = currentTime;
        isProcessingRef.current = true;

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
            console.log('[useAutoRephrase] Authentication token not available for auto-rephrase');
            setShortcutStatus(statusMessages.tokenRequired);
            showNotification('Authentication is required for rephrasing shortcut', 'error');
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
          
          // Handle authentication errors
          if (error instanceof Error && authErrorHandler.isAuthError(error)) {
            await authErrorHandler.handleAuthError(error, 'useAutoRephrase');
            showNotification('Authentication expired. Please log in again.', 'error');
          } else {
            setShortcutStatus(statusMessages.error(errorMessage));
            showNotification(
              `Failed to rephrase text: ${errorMessage}`,
              'error'
            );
          }
        } finally {
          // Reset processing flag to allow future requests
          isProcessingRef.current = false;
          resetStatusAfterDelay(setShortcutStatus);
        }
      });

      console.log('[useAutoRephrase] Auto-rephrase event listener setup complete');
      return unlisten;
    } catch (error) {
      console.error('[useAutoRephrase] Failed to setup auto-rephrase listener:', error);
    }
  }, [showNotification, setShortcutStatus, DEBOUNCE_DELAY]);

  return { setupAutoRephraseListener };
};