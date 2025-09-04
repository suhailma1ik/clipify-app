/**
 * Deep Link Tester Component
 * For testing and debugging deep link functionality
 */

import React, { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';

interface DeepLinkEvent {
  id: string;
  url: string;
  timestamp: number;
  source: string;
  processed: boolean;
  error?: string;
}

export const DeepLinkTester: React.FC = () => {
  const [events, setEvents] = useState<DeepLinkEvent[]>([]);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | null = null;

    const setupListener = async () => {
      try {
        // Listen for deep link events
        unlisten = await listen('deep-link-received', (event) => {
          console.log('Deep link received:', event.payload);
          const url = event.payload as string;
          
          const newEvent: DeepLinkEvent = {
            id: `dl_${Date.now()}`,
            url,
            timestamp: Date.now(),
            source: 'runtime',
            processed: false,
          };
          
          setEvents(prev => [newEvent, ...prev.slice(0, 9)]); // Keep last 10 events
        });
        
        setIsListening(true);
        console.log('Deep link listener setup complete');
      } catch (error) {
        console.error('Failed to setup deep link listener:', error);
      }
    };

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
        setIsListening(false);
      }
    };
  }, []);

  const loadExistingEvents = async () => {
    try {
      const existingEvents = await invoke<DeepLinkEvent[]>('get_all_deep_link_events');
      setEvents(existingEvents.slice(0, 10)); // Show last 10 events
    } catch (error) {
      console.error('Failed to load existing events:', error);
    }
  };

  const clearEvents = async () => {
    try {
      await invoke('clear_deep_link_events');
      setEvents([]);
    } catch (error) {
      console.error('Failed to clear events:', error);
    }
  };

  const testDeepLink = () => {
    // This would normally be triggered by an external source
    const testUrl = 'clipify://auth?token=test_token&user_id=test_user&email=test@example.com&plan=free';
    console.log('Testing deep link:', testUrl);
    
    // Simulate a deep link event
    const testEvent: DeepLinkEvent = {
      id: `test_${Date.now()}`,
      url: testUrl,
      timestamp: Date.now(),
      source: 'manual',
      processed: false,
    };
    
    setEvents(prev => [testEvent, ...prev.slice(0, 9)]);
  };

  return (
    <div className="deep-link-tester">
      <div className="tester-header">
        <h3>Deep Link Tester</h3>
        <div className="status">
          <span className={`status-indicator ${isListening ? 'listening' : 'not-listening'}`}>
            {isListening ? '🟢' : '🔴'}
          </span>
          <span>{isListening ? 'Listening' : 'Not Listening'}</span>
        </div>
      </div>

      <div className="tester-actions">
        <button onClick={loadExistingEvents} className="action-btn">
          Load Events
        </button>
        <button onClick={testDeepLink} className="action-btn test-btn">
          Test Deep Link
        </button>
        <button onClick={clearEvents} className="action-btn clear-btn">
          Clear Events
        </button>
      </div>

      <div className="events-list">
        <h4>Recent Deep Link Events ({events.length})</h4>
        {events.length === 0 ? (
          <div className="no-events">
            <p>No deep link events received yet.</p>
            <p>Try clicking "Test Deep Link" or opening a clipify:// URL externally.</p>
          </div>
        ) : (
          <div className="events">
            {events.map((event) => (
              <div key={event.id} className={`event ${event.processed ? 'processed' : 'pending'}`}>
                <div className="event-header">
                  <span className="event-source">{event.source}</span>
                  <span className="event-time">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                  <span className={`event-status ${event.processed ? 'processed' : 'pending'}`}>
                    {event.processed ? '✅' : '⏳'}
                  </span>
                </div>
                <div className="event-url">{event.url}</div>
                {event.error && (
                  <div className="event-error">Error: {event.error}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="help-section">
        <details>
          <summary>How to test deep links</summary>
          <div className="help-content">
            <p><strong>Method 1:</strong> Click "Test Deep Link" button above</p>
            <p><strong>Method 2:</strong> Open Terminal and run:</p>
            <code>open "clipify://auth?token=test&user_id=123&email=test@example.com"</code>
            <p><strong>Method 3:</strong> Create an HTML file with:</p>
            <code>&lt;a href="clipify://auth?token=test"&gt;Test Link&lt;/a&gt;</code>
          </div>
        </details>
      </div>

      <style>{`
        .deep-link-tester {
          padding: 20px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          background: #fafafa;
          margin: 20px 0;
        }

        .tester-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .tester-header h3 {
          margin: 0;
          color: #333;
        }

        .status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
        }

        .status-indicator.listening {
          color: #22c55e;
        }

        .status-indicator.not-listening {
          color: #ef4444;
        }

        .tester-actions {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
        }

        .action-btn {
          padding: 8px 16px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: white;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }

        .action-btn:hover {
          background: #f3f4f6;
        }

        .test-btn {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .test-btn:hover {
          background: #2563eb;
        }

        .clear-btn {
          background: #ef4444;
          color: white;
          border-color: #ef4444;
        }

        .clear-btn:hover {
          background: #dc2626;
        }

        .events-list h4 {
          margin: 0 0 12px 0;
          color: #374151;
        }

        .no-events {
          padding: 20px;
          text-align: center;
          color: #6b7280;
          background: white;
          border-radius: 6px;
          border: 1px dashed #d1d5db;
        }

        .no-events p {
          margin: 8px 0;
        }

        .events {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .event {
          padding: 12px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-size: 14px;
        }

        .event.processed {
          border-color: #22c55e;
          background: #f0fdf4;
        }

        .event.pending {
          border-color: #f59e0b;
          background: #fffbeb;
        }

        .event-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
          font-size: 12px;
        }

        .event-source {
          background: #e5e7eb;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 500;
        }

        .event-time {
          color: #6b7280;
        }

        .event-status.processed {
          color: #22c55e;
        }

        .event-status.pending {
          color: #f59e0b;
        }

        .event-url {
          font-family: monospace;
          background: #f3f4f6;
          padding: 6px;
          border-radius: 4px;
          word-break: break-all;
          font-size: 12px;
        }

        .event-error {
          margin-top: 6px;
          color: #dc2626;
          font-size: 12px;
          background: #fef2f2;
          padding: 4px 6px;
          border-radius: 4px;
        }

        .help-section {
          margin-top: 20px;
          border-top: 1px solid #e5e7eb;
          padding-top: 16px;
        }

        .help-section summary {
          cursor: pointer;
          color: #6b7280;
          font-size: 14px;
          margin-bottom: 8px;
        }

        .help-content {
          font-size: 13px;
          color: #6b7280;
          line-height: 1.5;
        }

        .help-content p {
          margin: 8px 0;
        }

        .help-content code {
          background: #f3f4f6;
          padding: 2px 4px;
          border-radius: 3px;
          font-family: monospace;
          font-size: 12px;
          display: block;
          margin: 4px 0;
          padding: 8px;
        }
      `}</style>
    </div>
  );
};

export default DeepLinkTester;