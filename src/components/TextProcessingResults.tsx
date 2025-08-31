import React from 'react';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { appStyles, buttons, badges } from '../styles/AppStyles';
import { rephraseService } from '../services/rephraseService';
import { NotificationType } from '../hooks/useNotification';

interface TextProcessingResultsProps {
  cleanedText: string;
  rephrasedText: string;
  showNotification: (message: string, type: NotificationType) => void;
}

const TextProcessingResults: React.FC<TextProcessingResultsProps> = ({
  cleanedText,
  rephrasedText,
  showNotification
}) => {
  if (!cleanedText && !rephrasedText) return null;

  const handleCopyRephrasedText = async () => {
    if (rephrasedText) {
      await writeText(rephrasedText);
      showNotification('Rephrased text copied to clipboard ✅', 'success');
    }
  };

  return (
    <div style={appStyles.card}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '16px'
      }}>
        <div style={appStyles.iconBox}>
          <span style={appStyles.iconLarge}>🔄</span>
        </div>
        <div>
          <h3 style={appStyles.h3Title}>Text Processing Results</h3>
          <p style={appStyles.mutedText}>Compare original cleaned text with AI-rephrased version</p>
        </div>
      </div>

      <div style={appStyles.grid(Boolean(cleanedText && rephrasedText))}>
        {cleanedText && (
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px'
            }}>
              <span style={appStyles.iconSmall}>🧹</span>
              <h4 style={appStyles.h4Title}>Cleaned Text</h4>
              <span style={badges.primary}>
                {rephraseService.countWords(cleanedText)} words
              </span>
            </div>
            <div style={appStyles.monospaceBlock}>
              {cleanedText}
            </div>
          </div>
        )}

        {rephrasedText && (
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px'
            }}>
              <span style={appStyles.iconSmall}>✨</span>
              <h4 style={appStyles.h4Title}>Rephrased Text</h4>
              <span style={badges.primary}>
                {rephraseService.countWords(rephrasedText)} words
              </span>
              <button
                onClick={handleCopyRephrasedText}
                style={buttons.smallPrimary}
              >
                Copy
              </button>
            </div>
            <div style={appStyles.monospaceBlock}>
              {rephrasedText}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TextProcessingResults;
