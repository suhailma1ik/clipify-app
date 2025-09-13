import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ClipboardEntry } from '../types';
import { isTauriEnvironment } from '../utils';

export const useClipboardHistory = () => {
  const [clipboardHistory, setClipboardHistory] = useState<ClipboardEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filteredHistory, setFilteredHistory] = useState<ClipboardEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<ClipboardEntry | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const loadClipboardHistory = useCallback(async () => {
    if (!isTauriEnvironment()) {
      console.warn('Clipboard history not available in browser environment');
      return;
    }
    
    try {
      const history = await invoke<ClipboardEntry[]>('get_clipboard_history');
      setClipboardHistory(history);
      setFilteredHistory(history);
    } catch (error) {
      console.error('Failed to load clipboard history:', error);
    }
  }, []);

  const searchClipboardHistory = useCallback(async (query: string) => {
    if (!isTauriEnvironment()) {
      // Browser fallback: simple local filtering
      if (query.trim() === '') {
        setFilteredHistory(clipboardHistory);
      } else {
        const filtered = clipboardHistory.filter(entry => 
          entry.content.toLowerCase().includes(query.toLowerCase())
        );
        setFilteredHistory(filtered);
      }
      return;
    }
    
    try {
      if (query.trim() === '') {
        setFilteredHistory(clipboardHistory);
      } else {
        const results = await invoke<ClipboardEntry[]>('search_clipboard_history', { query });
        setFilteredHistory(results);
      }
    } catch (error) {
      console.error('Failed to search clipboard history:', error);
    }
  }, [clipboardHistory]);

  const deleteHistoryEntry = useCallback(async (id: string) => {
    if (!isTauriEnvironment()) {
      console.warn('Delete history entry not available in browser environment');
      return;
    }
    
    try {
      await invoke('remove_from_clipboard_history', { id });
      await loadClipboardHistory();
    } catch (error) {
      console.error('Failed to delete history entry:', error);
    }
  }, [loadClipboardHistory]);

  const clearAllHistory = useCallback(async () => {
    if (!isTauriEnvironment()) {
      console.warn('Clear history not available in browser environment');
      return;
    }
    
    try {
      await invoke('clear_clipboard_history');
      setClipboardHistory([]);
      setFilteredHistory([]);
      setSelectedEntry(null);
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  }, []);

  const pasteFromHistory = useCallback(async (id: string) => {
    if (!isTauriEnvironment()) {
      console.warn('Paste from history not available in browser environment');
      throw new Error('Paste from history not available in browser environment');
    }
    
    try {
      const content = await invoke<string>('paste_from_history', { id });
      return content;
    } catch (error) {
      console.error('Failed to paste from history:', error);
      throw error;
    }
  }, []);

  const startClipboardMonitoring = useCallback(async () => {
    if (!isTauriEnvironment()) {
      console.warn('Clipboard monitoring not available in browser environment');
      return;
    }
    
    try {
      await invoke('start_clipboard_monitoring');
      console.log('Clipboard monitoring started successfully');
    } catch (error) {
      console.error('Failed to start clipboard monitoring:', error);
      throw error;
    }
  }, []);

  const stopClipboardMonitoring = useCallback(async () => {
    if (!isTauriEnvironment()) {
      console.warn('Clipboard monitoring not available in browser environment');
      return;
    }
    
    try {
      await invoke('stop_clipboard_monitoring');
      console.log('Clipboard monitoring stopped successfully');
    } catch (error) {
      console.error('Failed to stop clipboard monitoring:', error);
      throw error;
    }
  }, []);

  return {
    clipboardHistory,
    searchQuery,
    setSearchQuery,
    filteredHistory,
    selectedEntry,
    setSelectedEntry,
    showHistory,
    setShowHistory,
    loadClipboardHistory,
    searchClipboardHistory,
    deleteHistoryEntry,
    clearAllHistory,
    pasteFromHistory,
    startClipboardMonitoring,
    stopClipboardMonitoring
  };
};
