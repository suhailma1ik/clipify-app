import { useState, useCallback } from 'react';
import { rephraseService } from '../services/rephraseService';
import { writeToClipboard, statusMessages, getCurrentTimestamp, resetStatusAfterDelay } from '../utils';

interface UseManualRephraseProps {
  hasJwtToken: boolean;
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
  setShowTokenInput: (show: boolean) => void;
  setShortcutStatus: (status: string) => void;
}

export const useManualRephrase = ({
  hasJwtToken,
  showNotification,
  setShowTokenInput,
  setShortcutStatus
}: UseManualRephraseProps) => {
  const [manualText, setManualText] = useState<string>("");
  const [rephrasedText, setRephrasedText] = useState<string>("");
  const [isRephrasingManual, setIsRephrasingManual] = useState<boolean>(false);

  const handleManualRephrase = useCallback(async () => {
    console.log('[useManualRephrase] handleManualRephrase called with text:', manualText);
    
    if (!manualText.trim()) {
      showNotification('Please enter some text to rephrase', 'info');
      return;
    }

    if (!hasJwtToken) {
      showNotification('JWT token is required for rephrasing', 'error');
      setShowTokenInput(true);
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
      setShortcutStatus(statusMessages.error(errorMessage));
      showNotification(
        `Failed to rephrase text: ${errorMessage}`,
        'error'
      );
    } finally {
      setIsRephrasingManual(false);
      resetStatusAfterDelay(setShortcutStatus);
    }
  }, [manualText, showNotification, hasJwtToken, setShowTokenInput, setShortcutStatus]);

  return {
    manualText,
    setManualText,
    rephrasedText,
    setRephrasedText,
    isRephrasingManual,
    handleManualRephrase
  };
};