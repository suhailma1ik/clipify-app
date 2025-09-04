import { useState, useCallback } from 'react';
import { rephraseService } from '../services/rephraseService';
import { writeToClipboard, statusMessages, getCurrentTimestamp, resetStatusAfterDelay } from '../utils';
import { useAuthErrorHandler } from './useAuthErrorHandler';

interface UseManualRephraseProps {
  isAuthenticated: boolean;
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
  setShortcutStatus: (status: string) => void;
}

export const useManualRephrase = ({
  isAuthenticated,
  showNotification,
  setShortcutStatus
}: UseManualRephraseProps) => {
  const [manualText, setManualText] = useState<string>("");
  const [rephrasedText, setRephrasedText] = useState<string>("");
  const [isRephrasingManual, setIsRephrasingManual] = useState<boolean>(false);
  const { handleError, isAuthError } = useAuthErrorHandler();

  const handleManualRephrase = useCallback(async () => {
    console.log('[useManualRephrase] handleManualRephrase called with text:', manualText);
    
    if (!manualText.trim()) {
      showNotification('Please enter some text to rephrase', 'info');
      return;
    }

    if (!isAuthenticated) {
      showNotification('Authentication is required for rephrasing', 'error');
      return;
    }

    try {
      setIsRephrasingManual(true);
      setShortcutStatus(statusMessages.rephrasingManual);

      const response = await rephraseService.rephrase(
        manualText,
        'formal',
        'Business communication',
        'Colleagues',
        false
      );

      setRephrasedText(response.rephrased_text);
      await writeToClipboard(response.rephrased_text);

      setShortcutStatus(statusMessages.successManual(getCurrentTimestamp()));
      showNotification('Text rephrased and copied to clipboard!', 'success');

    } catch (error) {
      console.error('[useManualRephrase] Failed to rephrase manual text:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Handle authentication errors
      if (error instanceof Error && isAuthError(error)) {
        await handleError(error, 'useManualRephrase');
        showNotification('Authentication expired. Please log in again.', 'error');
      } else {
        setShortcutStatus(statusMessages.error(errorMessage));
        showNotification(
          `Failed to rephrase text: ${errorMessage}`,
          'error'
        );
      }
    } finally {
      setIsRephrasingManual(false);
      resetStatusAfterDelay(setShortcutStatus);
    }
  }, [manualText, showNotification, isAuthenticated, setShortcutStatus]);

  return {
    manualText,
    setManualText,
    rephrasedText,
    setRephrasedText,
    isRephrasingManual,
    handleManualRephrase
  };
};