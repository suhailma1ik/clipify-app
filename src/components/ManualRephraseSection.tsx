import React from 'react';

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
    <div className="card card-hover">
      <div className="row-between mb-16">
        <div className="row-center gap-12">
          <div className="btn-icon" style={{ borderRadius: 10, background: "var(--color-surface-2)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-sm)" }}>
            <span style={{ fontSize: 20 }}>✏️</span>
          </div>
          <div>
            <h3>Manual Rephrase</h3>
            <p className="text-muted">Paste your text here and click to rephrase it</p>
          </div>
        </div>
      </div>

      <div className="mb-16">
        <textarea
          className="input"
          value={manualText}
          onChange={(e) => setManualText(e.target.value)}
          placeholder="Paste your text here to rephrase it..."
          style={{ minHeight: 120, resize: 'vertical' }}
        />
      </div>

      <div className="row-between">
        <div style={{ flex: 1 }}>
          {rephrasedText && (
            <div className="mb-16">
              <h4 className="text-muted" style={{ marginBottom: 8 }}>Rephrased Text:</h4>
              <div className="surface text-mono" style={{ padding: 12 }}>
                {rephrasedText}
              </div>
            </div>
          )}
        </div>

        <div className="row-center gap-12">
          <button
            className="btn btn-primary btn-lg"
            onClick={onRephrase}
            disabled={isRephrasingManual || !manualText.trim()}
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