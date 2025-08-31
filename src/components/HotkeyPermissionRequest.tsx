import React from 'react';

interface HotkeyPermissionRequestProps {
  onGrantPermission: () => void;
  onDenyPermission: () => void;
  isRequesting?: boolean;
}

export const HotkeyPermissionRequest: React.FC<HotkeyPermissionRequestProps> = ({
  onGrantPermission,
  onDenyPermission,
  isRequesting = false
}) => {
  return (
    <div className="permission-request-overlay">
      <div className="permission-request-modal">
        <div className="permission-header">
          <h2>🔐 Hotkey Permission Required</h2>
          <p className="permission-subtitle">
            Clipify needs permission to register system-wide hotkeys
          </p>
        </div>

        <div className="permission-content">
          <div className="permission-explanation">
            <h3>Why does Clipify need hotkey access?</h3>
            <ul className="permission-reasons">
              <li>
                <span className="reason-icon">⌨️</span>
                <div>
                  <strong>Global Shortcut (Cmd+Shift+C)</strong>
                  <p>Allows you to quickly clean and rephrase text from any application without switching windows.</p>
                </div>
              </li>
              <li>
                <span className="reason-icon">🚀</span>
                <div>
                  <strong>Seamless Workflow</strong>
                  <p>Select text anywhere on your system, press the shortcut, and get professionally cleaned text instantly.</p>
                </div>
              </li>
              <li>
                <span className="reason-icon">🔒</span>
                <div>
                  <strong>Privacy & Security</strong>
                  <p>Hotkeys are processed locally. No text is sent to external services without your explicit action.</p>
                </div>
              </li>
            </ul>
          </div>

          <div className="permission-details">
            <h4>What happens when you grant permission:</h4>
            <div className="permission-flow">
              <div className="flow-step">
                <span className="step-number">1</span>
                <span>Select text in any application</span>
              </div>
              <div className="flow-step">
                <span className="step-number">2</span>
                <span>Press Cmd+Shift+C</span>
              </div>
              <div className="flow-step">
                <span className="step-number">3</span>
                <span>Text is cleaned and copied to clipboard</span>
              </div>
              <div className="flow-step">
                <span className="step-number">4</span>
                <span>Optionally rephrased (if JWT token is configured)</span>
              </div>
            </div>
          </div>

          <div className="permission-note">
            <p>
              <strong>macOS Users:</strong> After clicking "Grant Permission", you'll be taken to System Preferences 
              where you need to add Clipify to the Accessibility list. This allows the app to register global shortcuts.
            </p>
            <p style={{ marginTop: '8px', fontSize: '13px', opacity: '0.8' }}>
              You can revoke these permissions at any time in System Preferences or app settings.
            </p>
          </div>
        </div>

        <div className="permission-actions">
          <button 
            className="btn-deny" 
            onClick={onDenyPermission}
            disabled={isRequesting}
          >
            Not Now
          </button>
          <button 
            className="btn-grant" 
            onClick={onGrantPermission}
            disabled={isRequesting}
          >
            {isRequesting ? 'Registering...' : 'Grant Permission'}
          </button>
        </div>
      </div>

      <style>{`
        .permission-request-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
        }

        .permission-request-modal {
          background: white;
          border-radius: 12px;
          padding: 32px;
          max-width: 600px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .permission-header {
          text-align: center;
          margin-bottom: 24px;
        }

        .permission-header h2 {
          margin: 0 0 8px 0;
          color: #1a1a1a;
          font-size: 24px;
          font-weight: 600;
        }

        .permission-subtitle {
          margin: 0;
          color: #666;
          font-size: 16px;
        }

        .permission-content {
          margin-bottom: 32px;
        }

        .permission-explanation h3 {
          margin: 0 0 16px 0;
          color: #1a1a1a;
          font-size: 18px;
          font-weight: 600;
        }

        .permission-reasons {
          list-style: none;
          padding: 0;
          margin: 0 0 24px 0;
        }

        .permission-reasons li {
          display: flex;
          align-items: flex-start;
          margin-bottom: 16px;
          padding: 16px;
          background: #f8f9fa;
          border-radius: 8px;
          border-left: 4px solid #007bff;
        }

        .reason-icon {
          font-size: 24px;
          margin-right: 12px;
          flex-shrink: 0;
        }

        .permission-reasons strong {
          display: block;
          margin-bottom: 4px;
          color: #1a1a1a;
          font-weight: 600;
        }

        .permission-reasons p {
          margin: 0;
          color: #666;
          font-size: 14px;
          line-height: 1.4;
        }

        .permission-details h4 {
          margin: 0 0 12px 0;
          color: #1a1a1a;
          font-size: 16px;
          font-weight: 600;
        }

        .permission-flow {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 24px;
        }

        .flow-step {
          display: flex;
          align-items: center;
          padding: 8px 12px;
          background: #e3f2fd;
          border-radius: 6px;
          font-size: 14px;
        }

        .step-number {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          background: #007bff;
          color: white;
          border-radius: 50%;
          font-size: 12px;
          font-weight: 600;
          margin-right: 12px;
          flex-shrink: 0;
        }

        .permission-note {
          padding: 16px;
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          border-radius: 8px;
          margin-top: 16px;
        }

        .permission-note p {
          margin: 0;
          color: #856404;
          font-size: 14px;
          line-height: 1.4;
        }

        .permission-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .btn-deny,
        .btn-grant {
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          min-width: 120px;
        }

        .btn-deny {
          background: #f8f9fa;
          color: #6c757d;
          border: 1px solid #dee2e6;
        }

        .btn-deny:hover:not(:disabled) {
          background: #e9ecef;
          color: #495057;
        }

        .btn-grant {
          background: #007bff;
          color: white;
        }

        .btn-grant:hover:not(:disabled) {
          background: #0056b3;
        }

        .btn-deny:disabled,
        .btn-grant:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 640px) {
          .permission-request-modal {
            padding: 24px;
            margin: 16px;
          }

          .permission-actions {
            flex-direction: column;
          }

          .btn-deny,
          .btn-grant {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};