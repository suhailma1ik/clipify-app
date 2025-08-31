import React from 'react';
import { ClipboardHistoryProps } from '../types';
import { formatTimestamp, getContentTypeIcon, commonStyles, addHoverEffect, removeHoverEffect } from '../utils';

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
    <div style={{
      ...commonStyles.card,
      margin: '20px 0',
      padding: '24px',
      borderRadius: '16px',
      background: 'rgba(255, 255, 255, 0.98)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
      transition: 'all 0.3s ease'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        borderBottom: '2px solid rgba(102, 126, 234, 0.15)',
        paddingBottom: '16px'
      }}>
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
            <h3 style={{
              margin: 0,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontSize: '26px',
              fontWeight: '700',
              letterSpacing: '-0.5px'
            }}>📋 Clipboard History</h3>
            <p style={{ margin: 0, color: '#718096', fontSize: '14px' }}>Last 10 copied items • Flycut-style interface</p>
          </div>
        </div>
        <button
          onClick={onToggleHistory}
          style={{
            ...commonStyles.button,
            background: showHistory 
              ? 'linear-gradient(135deg, #e91e63 0%, #ad1457 100%)'
              : 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            transform: 'translateY(0)'
          }}
          onMouseEnter={(e) => {
            addHoverEffect(e.target as HTMLElement);
            (e.target as HTMLElement).style.transform = 'translateY(-2px)';
            (e.target as HTMLElement).style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.2)';
          }}
          onMouseLeave={(e) => {
            removeHoverEffect(e.target as HTMLElement);
            (e.target as HTMLElement).style.transform = 'translateY(0)';
            (e.target as HTMLElement).style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
          }}
        >
          {showHistory ? '🙈 Hide History' : '👁️ Show History'}
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
                  padding: '14px 18px',
                  border: '2px solid rgba(102, 126, 234, 0.2)',
                  borderRadius: '12px',
                  fontSize: '15px',
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.3s ease',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(102, 126, 234, 0.6)';
                  e.target.style.boxShadow = '0 0 0 4px rgba(102, 126, 234, 0.1)';
                  e.target.style.transform = 'translateY(-1px)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(102, 126, 234, 0.2)';
                  e.target.style.boxShadow = 'none';
                  e.target.style.transform = 'translateY(0)';
                }}
              />
            </div>
            <button
              onClick={onClearAllHistory}
              style={{
                padding: '10px 18px',
                background: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                boxShadow: '0 4px 12px rgba(244, 67, 54, 0.25)',
                transition: 'all 0.3s ease',
                transform: 'translateY(0)'
              }}
              onMouseEnter={(e) => {
                addHoverEffect(e.target as HTMLElement);
                (e.target as HTMLElement).style.transform = 'translateY(-2px)';
                (e.target as HTMLElement).style.boxShadow = '0 6px 20px rgba(244, 67, 54, 0.35)';
              }}
              onMouseLeave={(e) => {
                removeHoverEffect(e.target as HTMLElement);
                (e.target as HTMLElement).style.transform = 'translateY(0)';
                (e.target as HTMLElement).style.boxShadow = '0 4px 12px rgba(244, 67, 54, 0.25)';
              }}
            >
              🗑️ Clear All
            </button>
            <button
              onClick={onRefreshHistory}
              style={{
                padding: '10px 18px',
                background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                boxShadow: '0 4px 12px rgba(33, 150, 243, 0.25)',
                transition: 'all 0.3s ease',
                transform: 'translateY(0)'
              }}
              onMouseEnter={(e) => {
                addHoverEffect(e.target as HTMLElement);
                (e.target as HTMLElement).style.transform = 'translateY(-2px)';
                (e.target as HTMLElement).style.boxShadow = '0 6px 20px rgba(33, 150, 243, 0.35)';
              }}
              onMouseLeave={(e) => {
                removeHoverEffect(e.target as HTMLElement);
                (e.target as HTMLElement).style.transform = 'translateY(0)';
                (e.target as HTMLElement).style.boxShadow = '0 4px 12px rgba(33, 150, 243, 0.25)';
              }}
            >
              🔄 Refresh
            </button>
          </div>

          {/* Two-Panel Layout */}
          <div className="two-panel-layout" style={{
            display: 'flex',
            gap: '20px',
            height: '520px',
            border: '2px solid rgba(102, 126, 234, 0.2)',
            borderRadius: '16px',
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(15px)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            overflow: 'hidden'
          }}>
            {/* Left Panel - History Items (30%) */}
            <div className="left-panel panel-transition" style={{
              width: '30%',
              borderRight: '2px solid rgba(102, 126, 234, 0.2)',
              padding: '18px',
              overflowY: 'auto',
              backgroundColor: 'rgba(248, 250, 252, 0.9)',
              backdropFilter: 'blur(10px)'
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
                      padding: '14px',
                      margin: '10px 0',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      border: '1px solid rgba(102, 126, 234, 0.2)',
                      backgroundColor: selectedEntry?.id === entry.id 
                        ? 'rgba(102, 126, 234, 0.12)' 
                        : 'rgba(255, 255, 255, 0.9)',
                      transition: 'all 0.3s ease',
                      backdropFilter: 'blur(10px)',
                      boxShadow: selectedEntry?.id === entry.id 
                        ? '0 4px 16px rgba(102, 126, 234, 0.2)'
                        : '0 2px 8px rgba(0, 0, 0, 0.05)',
                      transform: 'translateY(0)'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedEntry?.id !== entry.id) {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(102, 126, 234, 0.08)';
                        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                        (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(102, 126, 234, 0.15)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedEntry?.id !== entry.id) {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
                        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                        (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '18px' }}>{getContentTypeIcon(entry.content_type)}</span>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#64748b',
                        flex: 1
                      }}>
                        #{index + 1} • {formatTimestamp(entry.timestamp)}
                      </span>
                      {entry.is_cleaned && (
                        <span style={{
                          fontSize: '9px',
                          padding: '3px 6px',
                          background: 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)',
                          color: 'white',
                          borderRadius: '8px',
                          fontWeight: '600',
                          boxShadow: '0 2px 6px rgba(76, 175, 80, 0.3)'
                        }}>
                          ✨ CLEANED
                        </span>
                      )}
                    </div>
                    
                    <div style={{
                      fontSize: '13px',
                      fontFamily: '"SF Mono", monospace',
                      lineHeight: '1.4',
                      color: '#374151',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      marginBottom: '8px'
                    }}>
                      {entry.preview}
                    </div>
                    
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{ 
                        fontSize: '11px', 
                        color: '#6b7280',
                        fontWeight: '500',
                        background: 'rgba(102, 126, 234, 0.1)',
                        padding: '2px 6px',
                        borderRadius: '6px'
                      }}>
                        {entry.char_count} chars
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPasteFromHistory(entry.id);
                        }}
                        style={{
                          padding: '4px 8px',
                          background: 'linear-gradient(135deg, #e91e63 0%, #ad1457 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '10px',
                          fontWeight: '600',
                          transition: 'all 0.3s ease',
                          transform: 'translateY(0)',
                          boxShadow: '0 2px 6px rgba(233, 30, 99, 0.3)'
                        }}
                        onMouseEnter={(e) => {
                          (e.target as HTMLElement).style.transform = 'translateY(-1px) scale(1.05)';
                          (e.target as HTMLElement).style.boxShadow = '0 4px 12px rgba(233, 30, 99, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          (e.target as HTMLElement).style.transform = 'translateY(0) scale(1)';
                          (e.target as HTMLElement).style.boxShadow = '0 2px 6px rgba(233, 30, 99, 0.3)';
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
              padding: '24px',
              overflowY: 'auto',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)'
            }}>
              {selectedEntry ? (
                <div className="content-fade-in">
                  {/* Header */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '24px',
                    paddingBottom: '16px',
                    borderBottom: '2px solid rgba(102, 126, 234, 0.15)',
                    background: 'rgba(102, 126, 234, 0.05)',
                    padding: '20px',
                    borderRadius: '16px',
                    boxShadow: '0 4px 16px rgba(102, 126, 234, 0.1)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        background: selectedEntry.is_cleaned ? 'linear-gradient(45deg, #4caf50, #388e3c)' : 'linear-gradient(45deg, #667eea, #764ba2)',
                        borderRadius: '12px',
                        padding: '12px',
                        minWidth: '48px',
                        textAlign: 'center',
                        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                      }}>
                        <span style={{ fontSize: '24px' }}>{getContentTypeIcon(selectedEntry.content_type)}</span>
                      </div>
                      <div>
                        <h3 style={{ 
                          margin: 0, 
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          fontSize: '20px', 
                          fontWeight: '700',
                          letterSpacing: '-0.3px'
                        }}>
                          {selectedEntry.content_type.toUpperCase()} Content
                        </h3>
                        <p style={{ margin: '6px 0 0 0', color: '#64748b', fontSize: '13px', fontWeight: '500' }}>
                          {selectedEntry.char_count} characters • {selectedEntry.line_count} lines • {formatTimestamp(selectedEntry.timestamp)}
                        </p>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <button
                        onClick={() => onPasteFromHistory(selectedEntry.id)}
                        style={{
                          padding: '12px 24px',
                          background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '600',
                          boxShadow: '0 4px 16px rgba(76, 175, 80, 0.3)',
                          transition: 'all 0.3s ease',
                          transform: 'translateY(0)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                        onMouseEnter={(e) => {
                          addHoverEffect(e.target as HTMLElement);
                          (e.target as HTMLElement).style.transform = 'translateY(-2px)';
                          (e.target as HTMLElement).style.boxShadow = '0 6px 24px rgba(76, 175, 80, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          removeHoverEffect(e.target as HTMLElement);
                          (e.target as HTMLElement).style.transform = 'translateY(0)';
                          (e.target as HTMLElement).style.boxShadow = '0 4px 16px rgba(76, 175, 80, 0.3)';
                        }}
                      >
                        📋 Copy to Clipboard
                      </button>
                      <button
                        onClick={() => onDeleteEntry(selectedEntry.id)}
                        style={{
                          padding: '12px 24px',
                          background: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '600',
                          boxShadow: '0 4px 16px rgba(244, 67, 54, 0.3)',
                          transition: 'all 0.3s ease',
                          transform: 'translateY(0)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                        onMouseEnter={(e) => {
                          addHoverEffect(e.target as HTMLElement);
                          (e.target as HTMLElement).style.transform = 'translateY(-2px)';
                          (e.target as HTMLElement).style.boxShadow = '0 6px 24px rgba(244, 67, 54, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          removeHoverEffect(e.target as HTMLElement);
                          (e.target as HTMLElement).style.transform = 'translateY(0)';
                          (e.target as HTMLElement).style.boxShadow = '0 4px 16px rgba(244, 67, 54, 0.3)';
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                  
                  {/* Content Display */}
                  <div style={{ marginBottom: '24px' }}>
                    <h4 style={{ 
                      margin: '0 0 16px 0', 
                      color: '#374151', 
                      fontSize: '16px', 
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      📄 Current Content
                    </h4>
                    <div style={{
                      background: 'linear-gradient(135deg, #f8fafc, #fff)',
                      border: '2px solid rgba(102, 126, 234, 0.2)',
                      borderRadius: '16px',
                      padding: '20px',
                      fontSize: '14px',
                      fontFamily: '"SF Mono", "Monaco", "Cascadia Code", monospace',
                      lineHeight: '1.6',
                      color: '#374151',
                      maxHeight: '220px',
                      overflowY: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      backdropFilter: 'blur(5px)',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)'
                    }}>
                      {selectedEntry.content}
                    </div>
                  </div>
                  
                  {/* Original Content (if different) */}
                  {selectedEntry.is_cleaned && selectedEntry.original_content !== selectedEntry.content && (
                    <div>
                      <h4 style={{ 
                        margin: '0 0 16px 0', 
                        color: '#f59e0b', 
                        fontSize: '16px', 
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        📝 Original Content
                      </h4>
                      <div style={{
                        background: 'linear-gradient(135deg, #fef3c7, #fff)',
                        border: '2px solid rgba(245, 158, 11, 0.3)',
                        borderRadius: '16px',
                        padding: '20px',
                        fontSize: '14px',
                        fontFamily: '"SF Mono", "Monaco", "Cascadia Code", monospace',
                        lineHeight: '1.6',
                        color: '#78716c',
                        maxHeight: '180px',
                        overflowY: 'auto',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        backdropFilter: 'blur(5px)',
                        boxShadow: '0 4px 16px rgba(245, 158, 11, 0.1)'
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
                  color: '#64748b',
                  textAlign: 'center'
                }}>
                  <span style={{ 
                    fontSize: '64px', 
                    marginBottom: '24px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}>👈</span>
                  <h3 style={{ 
                    margin: '0 0 12px 0', 
                    fontSize: '20px', 
                    fontWeight: '700',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}>Select an Item</h3>
                  <p style={{ 
                    margin: 0, 
                    fontSize: '15px',
                    lineHeight: '1.5',
                    maxWidth: '300px',
                    marginLeft: 'auto',
                    marginRight: 'auto'
                  }}>
                    Click on any clipboard history item from the left panel to view its detailed content here.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Statistics */}
          <div style={{
            marginTop: '24px',
            padding: '20px',
            background: 'rgba(248, 250, 252, 0.9)',
            borderRadius: '16px',
            border: '1px solid rgba(102, 126, 234, 0.2)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12px',
            color: '#718096',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)'
          }}>
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              color: '#475569',
              background: 'rgba(102, 126, 234, 0.1)',
              padding: '4px 12px',
              borderRadius: '8px',
              fontWeight: '500'
            }}>
              📊 {filteredHistory.length} of {clipboardHistory.length} entries shown
              {searchQuery && <span> • Searching for "{searchQuery}"</span>}
            </span>
            {selectedEntry && (
              <span style={{ 
                color: '#e91e63', 
                fontWeight: '600',
                background: 'rgba(233, 30, 99, 0.1)',
                padding: '4px 12px',
                borderRadius: '8px',
                fontSize: '13px'
              }}>
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