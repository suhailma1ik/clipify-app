import React from 'react';
import { appStyles, buttons } from '../styles/AppStyles';

interface ManualRephraseSectionProps {
  manualText: string;
  setManualText: (text: string) => void;
  rephrasedText: string;
  isRephrasingManual: boolean;
  onRephrase: () => void;
}

const ManualRephraseSection: React.FC<ManualRephraseSectionProps> = ({
  manualText,
  setManualText,
  rephrasedText,
  isRephrasingManual,
  onRephrase
}) => {
  return (
    <div style={appStyles.card}>
      <div style={{
        ...appStyles.rowBetween,
        marginBottom: '16px'
      }}>
        <div style={appStyles.rowCenter}>
          <div style={appStyles.iconBox}>
            <span style={appStyles.iconLarge}>✏️</span>
          </div>
          <div>
            <h3 style={appStyles.h3Title}>Manual Rephrase</h3>
            <p style={appStyles.mutedText}>Paste your text here and click to rephrase it</p>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <textarea
          value={manualText}
          onChange={(e) => setManualText(e.target.value)}
          placeholder="Paste your text here to rephrase it..."
          style={{
            ...appStyles.input,
            minHeight: '120px',
            resize: 'vertical',
            fontFamily: 'inherit'
          }}
        />
      </div>

      <div style={appStyles.rowBetween}>
        <div style={{ flex: 1 }}>
          {rephrasedText && (
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ ...appStyles.mutedText, marginBottom: '8px' }}>Rephrased Text:</h4>
              <div style={{
                padding: '12px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #e9ecef',
                fontFamily: 'inherit'
              }}>
                {rephrasedText}
              </div>
            </div>
          )}
        </div>

        <div style={appStyles.rowGap12}>
          <button
            onClick={onRephrase}
            disabled={isRephrasingManual || !manualText.trim()}
            style={buttons.primary({
              large: true,
              disabled: isRephrasingManual || !manualText.trim()
            })}
          >
            {isRephrasingManual ? (
              <>
                <span style={{ animation: 'spin 1s linear infinite' }}>⏳</span>
                Rephrasing...
              </>
            ) : (
              <>
                <span>🔄</span>
                Rephrase Text
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManualRephraseSection;