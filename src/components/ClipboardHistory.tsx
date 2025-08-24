import React from 'react';
import { ClipboardHistoryProps } from '../types';
import { commonStyles, formatTimestamp, getContentTypeIcon, addHoverEffect, removeHoverEffect } from '../utils';

const ClipboardHistory: React.FC<ClipboardHistoryProps> = ({
  clipboardHistory,
  searchQuery,
  filteredHistory,
  selectedEntry,
  showHistory,
  onSearchQueryChange,
  onSelectEntry,
  onToggleHistory,
  onDeleteEntry,
  onClearAllHistory,
  onRefreshHistory,
  onPasteFromHistory
}) => {
  return (
    <div style={commonStyles.card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{
            background: 'linear-gradient(45deg, #e91e63, #ad1457)',
            borderRadius: '12px',
            padding: '10px',
            marginRight: '16px',
            boxShadow: '0 4px 15px rgba(233, 30, 99, 0.4)'
          }}>
            <span style={{ fontSize: '24px' }}>📚</span>
          </div>
          <div>
            <h2 style={{ margin: 0, color: '#2d3748', fontSize: '22px', fontWeight: '800' }}>Clipboard History</h2>
            <p style={{ margin: 0, color: '#718096', fontSize: '14px' }}>Last 10 copied items • Flycut-style interface</p>
          </div>
        </div>
        <button
          onClick={onToggleHistory}
          style={{
            padding: '10px 20px',
            background: showHistory ? 'linear-gradient(45deg, #f44336, #d32f2f)' : 'linear-gradient(45deg, #e91e63, #ad1457)',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            boxShadow: '0 3px 10px rgba(233, 30, 99, 0.3)',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => addHoverEffect(e.target as HTMLElement)}
          onMouseOut={(e) => removeHoverEffect(e.target as HTMLElement)}
        >
          {showHistory ? '📘 Hide History' : '📖 Show History'}
        </button>
      </div>

      {showHistory && (
        <>
          {/* Search and Controls */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', alignItems: 'center' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type="text"
                placeholder="🔍 Search clipboard history..."
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e91e63',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  outline: 'none',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  transition: 'all 0.2s ease'
                }}
                onFocus={(e) => {
                  e.target.style.boxShadow = '0 0 0 3px rgba(233, 30, 99, 0.1)';
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 1)';
                }}
                onBlur={(e) => {
                  e.target.style.boxShadow = 'none';
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
                }}
              />
            </div>
            <button
              onClick={onClearAllHistory}
              style={{
                padding: '12px 20px',
                background: 'linear-gradient(45deg, #ff5722, #d84315)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                boxShadow: '0 3px 10px rgba(255, 87, 34, 0.3)',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => addHoverEffect(e.target as HTMLElement)}
              onMouseOut={(e) => removeHoverEffect(e.target as HTMLElement)}
            >
              🗑️ Clear All
            </button>
            <button
              onClick={onRefreshHistory}
              style={{
                padding: '12px 20px',
                background: 'linear-gradient(45deg, #2196f3, #1976d2)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                boxShadow: '0 3px 10px rgba(33, 150, 243, 0.3)',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => addHoverEffect(e.target as HTMLElement)}
              onMouseOut={(e) => removeHoverEffect(e.target as HTMLElement)}
            >
              🔄 Refresh
            </button>
          </div>

          {/* Two-Panel Layout */}
          <div className="two-panel-layout" style={{
            display: 'flex',
            gap: '20px',
            height: '500px',
            border: '2px solid #e91e63',
            borderRadius: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            overflow: 'hidden'
          }}>
            {/* Left Panel - History Items (30%) */}
            <div className="left-panel panel-transition" style={{
              width: '30%',
              borderRight: '2px solid rgba(233, 30, 99, 0.2)',
              overflowY: 'auto',
              backgroundColor: 'rgba(255, 255, 255, 0.9)'
            }}>
              {filteredHistory.length === 0 ? (
                <div style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: '#a0aec0',
                  fontSize: '14px'
                }}>
                  <span style={{ fontSize: '32px', display: 'block', marginBottom: '12px' }}>📋</span>
                  {searchQuery ? 'No matches' : 'No history'}
                </div>
              ) : (
                filteredHistory.map((entry, index) => (
                  <div
                    key={entry.id}
                    className="history-item-hover"
                    onClick={() => onSelectEntry(entry)}
                    style={{
                      padding: '12px',
                      borderBottom: '1px solid rgba(233, 30, 99, 0.1)',
                      cursor: 'pointer',
                      backgroundColor: selectedEntry?.id === entry.id ? 'rgba(233, 30, 99, 0.15)' : 'transparent'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedEntry?.id !== entry.id) {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(233, 30, 99, 0.08)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedEntry?.id !== entry.id) {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '14px' }}>{getContentTypeIcon(entry.content_type)}</span>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '600',
                        color: '#718096'
                      }}>
                        #{index + 1} • {formatTimestamp(entry.timestamp)}
                      </span>
                      {entry.is_cleaned && (
                        <span style={{
                          fontSize: '8px',
                          padding: '1px 4px',
                          background: '#4caf50',
                          color: 'white',
                          borderRadius: '6px',
                          fontWeight: '600'
                        }}>
                          ✓
                        </span>
                      )}
                    </div>
                    
                    <div style={{
                      fontSize: '12px',
                      fontFamily: '"SF Mono", monospace',
                      lineHeight: '1.3',
                      color: '#2d3748',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}>
                      {entry.preview}
                    </div>
                    
                    <div style={{
                      marginTop: '6px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{ fontSize: '10px', color: '#a0aec0' }}>
                        {entry.char_count} chars
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPasteFromHistory(entry.id);
                        }}
                        style={{
                          padding: '2px 6px',
                          background: 'linear-gradient(45deg, #4caf50, #388e3c)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '10px',
                          fontWeight: '600',
                          transition: 'transform 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          (e.target as HTMLElement).style.transform = 'scale(1.1)';
                        }}
                        onMouseLeave={(e) => {
                          (e.target as HTMLElement).style.transform = 'scale(1)';
                        }}
                      >
                        📋
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* Right Panel - Detailed Content (70%) */}
            <div className="right-panel panel-transition" style={{
              width: '70%',
              padding: '20px',
              overflowY: 'auto',
              backgroundColor: 'rgba(255, 255, 255, 0.95)'
            }}>
              {selectedEntry ? (
                <div className="content-fade-in">
                  {/* Header */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '20px',
                    paddingBottom: '12px',
                    borderBottom: '2px solid rgba(233, 30, 99, 0.1)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        background: selectedEntry.is_cleaned ? 'linear-gradient(45deg, #4caf50, #388e3c)' : 'linear-gradient(45deg, #ff9800, #f57c00)',
                        borderRadius: '10px',
                        padding: '8px',
                        minWidth: '40px',
                        textAlign: 'center'
                      }}>
                        <span style={{ fontSize: '20px' }}>{getContentTypeIcon(selectedEntry.content_type)}</span>
                      </div>
                      <div>
                        <h3 style={{ margin: 0, color: '#2d3748', fontSize: '18px', fontWeight: '700' }}>
                          {selectedEntry.content_type.toUpperCase()} Content
                        </h3>
                        <p style={{ margin: 0, color: '#718096', fontSize: '12px' }}>
                          {selectedEntry.char_count} characters • {selectedEntry.line_count} lines • {formatTimestamp(selectedEntry.timestamp)}
                        </p>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => onPasteFromHistory(selectedEntry.id)}
                        className="hover-lift"
                        style={{
                          padding: '8px 16px',
                          background: 'linear-gradient(45deg, #4caf50, #388e3c)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        📋 Copy to Clipboard
                      </button>
                      <button
                        onClick={() => onDeleteEntry(selectedEntry.id)}
                        className="hover-lift"
                        style={{
                          padding: '8px 12px',
                          background: 'linear-gradient(45deg, #f44336, #d32f2f)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '600'
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  
                  {/* Content Display */}
                  <div style={{ marginBottom: '24px' }}>
                    <h4 style={{ margin: '0 0 12px 0', color: '#2d3748', fontSize: '16px', fontWeight: '700' }}>
                      📄 Current Content:
                    </h4>
                    <div style={{
                      background: 'linear-gradient(135deg, #f8f9fa, #fff)',
                      border: '2px solid #e9ecef',
                      borderRadius: '10px',
                      padding: '16px',
                      fontSize: '14px',
                      fontFamily: '"SF Mono", "Monaco", "Cascadia Code", monospace',
                      lineHeight: '1.6',
                      color: '#2d3748',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}>
                      {selectedEntry.content}
                    </div>
                  </div>
                  
                  {/* Original Content (if different) */}
                  {selectedEntry.is_cleaned && selectedEntry.original_content !== selectedEntry.content && (
                    <div>
                      <h4 style={{ margin: '0 0 12px 0', color: '#ff9800', fontSize: '16px', fontWeight: '700' }}>
                        📝 Original Content:
                      </h4>
                      <div style={{
                        background: 'linear-gradient(135deg, #fff3e0, #fff)',
                        border: '2px solid #ffcc02',
                        borderRadius: '10px',
                        padding: '16px',
                        fontSize: '14px',
                        fontFamily: '"SF Mono", "Monaco", "Cascadia Code", monospace',
                        lineHeight: '1.6',
                        color: '#666',
                        maxHeight: '150px',
                        overflowY: 'auto',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                      }}>
                        {selectedEntry.original_content}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: '#a0aec0',
                  textAlign: 'center'
                }}>
                  <span style={{ fontSize: '64px', marginBottom: '16px' }}>👈</span>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '700' }}>Select an Item</h3>
                  <p style={{ margin: 0, fontSize: '14px' }}>
                    Click on any clipboard history item from the left panel to view its detailed content here.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Statistics */}
          <div style={{
            marginTop: '16px',
            padding: '12px',
            background: 'rgba(233, 30, 99, 0.05)',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12px',
            color: '#718096'
          }}>
            <span>
              📊 {filteredHistory.length} of {clipboardHistory.length} entries shown
              {searchQuery && <span> • Searching for "{searchQuery}"</span>}
            </span>
            {selectedEntry && (
              <span style={{ color: '#e91e63', fontWeight: '600' }}>
                👁️ Viewing: {selectedEntry.content_type} • {selectedEntry.char_count} chars
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ClipboardHistory;