import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useClipboardHistory } from '../useClipboardHistory';
import { ClipboardEntry } from '../../types';

// Mock Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// Mock utils
vi.mock('../../utils', () => ({
  isTauriEnvironment: vi.fn(),
}));

const mockInvoke = vi.mocked(await import('@tauri-apps/api/core')).invoke;
const mockIsTauriEnvironment = vi.mocked(await import('../../utils')).isTauriEnvironment;

const mockClipboardHistory: ClipboardEntry[] = [
  {
    id: '1',
    content: 'Hello World',
    original_content: 'Hello World',
    is_cleaned: false,
    timestamp: new Date(Date.now() - 1000).toISOString(),
    char_count: 11,
    line_count: 1,
    has_formatting: false,
    content_type: 'text',
    preview: 'Hello World',
  },
  {
    id: '2',
    content: 'Test clipboard entry',
    original_content: 'Test clipboard entry',
    is_cleaned: false,
    timestamp: new Date(Date.now() - 2000).toISOString(),
    char_count: 20,
    line_count: 1,
    has_formatting: false,
    content_type: 'text',
    preview: 'Test clipboard entry',
  },
  {
    id: '3',
    content: 'Another test entry',
    original_content: 'Another test entry',
    is_cleaned: false,
    timestamp: new Date(Date.now() - 3000).toISOString(),
    char_count: 18,
    line_count: 1,
    has_formatting: false,
    content_type: 'text',
    preview: 'Another test entry',
  },
];

describe('useClipboardHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsTauriEnvironment.mockReturnValue(true);
    mockInvoke.mockResolvedValue(mockClipboardHistory);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useClipboardHistory());

      expect(result.current.clipboardHistory).toEqual([]);
      expect(result.current.searchQuery).toBe('');
      expect(result.current.filteredHistory).toEqual([]);
      expect(result.current.selectedEntry).toBeNull();
      expect(result.current.showHistory).toBe(false);
    });
  });

  describe('loadClipboardHistory', () => {
    it('should load clipboard history successfully', async () => {
      const { result } = renderHook(() => useClipboardHistory());

      await act(async () => {
        await result.current.loadClipboardHistory();
      });

      expect(mockInvoke).toHaveBeenCalledWith('get_clipboard_history');
      expect(result.current.clipboardHistory).toEqual(mockClipboardHistory);
      expect(result.current.filteredHistory).toEqual(mockClipboardHistory);
    });

    it('should handle loading errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockInvoke.mockRejectedValueOnce(new Error('Failed to load'));

      const { result } = renderHook(() => useClipboardHistory());

      await act(async () => {
        await result.current.loadClipboardHistory();
      });

      expect(consoleSpy).toHaveBeenCalledWith('Failed to load clipboard history:', expect.any(Error));
      expect(result.current.clipboardHistory).toEqual([]);

      consoleSpy.mockRestore();
    });

    it('should warn in browser environment', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockIsTauriEnvironment.mockReturnValue(false);

      const { result } = renderHook(() => useClipboardHistory());

      await act(async () => {
        await result.current.loadClipboardHistory();
      });

      expect(consoleSpy).toHaveBeenCalledWith('Clipboard history not available in browser environment');
      expect(mockInvoke).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('searchClipboardHistory', () => {
    it('should search clipboard history in Tauri environment', async () => {
      const searchResults = [mockClipboardHistory[0]];
      mockIsTauriEnvironment.mockReturnValue(true);
      mockInvoke
        .mockResolvedValueOnce(mockClipboardHistory) // First call for loadClipboardHistory
        .mockResolvedValueOnce(searchResults); // Second call for searchClipboardHistory

      const { result } = renderHook(() => useClipboardHistory());

      // First load the history
      await act(async () => {
        await result.current.loadClipboardHistory();
      });

      // Then search
      await act(async () => {
        await result.current.searchClipboardHistory('Hello');
      });

      expect(mockInvoke).toHaveBeenCalledWith('search_clipboard_history', { query: 'Hello' });
      expect(result.current.filteredHistory).toEqual(searchResults);
    });

    it('should reset to full history when search query is empty', async () => {
      const { result } = renderHook(() => useClipboardHistory());

      // Load history first
      await act(async () => {
        await result.current.loadClipboardHistory();
      });

      // Search with empty query
      await act(async () => {
        await result.current.searchClipboardHistory('');
      });

      expect(result.current.filteredHistory).toEqual(mockClipboardHistory);
    });

    it('should handle search errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockInvoke.mockRejectedValueOnce(new Error('Search failed'));

      const { result } = renderHook(() => useClipboardHistory());

      await act(async () => {
        await result.current.searchClipboardHistory('test');
      });

      expect(consoleSpy).toHaveBeenCalledWith('Failed to search clipboard history:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('should perform local filtering in browser environment', async () => {
      mockIsTauriEnvironment.mockReturnValue(false);

      const { result } = renderHook(() => useClipboardHistory());

      // Manually set clipboard history for browser environment
      act(() => {
        result.current.clipboardHistory.push(...mockClipboardHistory);
      });

      await act(async () => {
        await result.current.searchClipboardHistory('Hello');
      });

      expect(mockInvoke).not.toHaveBeenCalledWith('search_clipboard_history', expect.any(Object));
      expect(result.current.filteredHistory).toEqual([mockClipboardHistory[0]]);
    });
  });

  describe('clearClipboardHistory', () => {
    it('should clear clipboard history successfully', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useClipboardHistory());

      // Load history first
      await act(async () => {
        await result.current.loadClipboardHistory();
      });

      // Clear history
      await act(async () => {
        await result.current.clearAllHistory();
      });

      expect(mockInvoke).toHaveBeenCalledWith('clear_clipboard_history');
      expect(result.current.clipboardHistory).toEqual([]);
      expect(result.current.filteredHistory).toEqual([]);
    });

    it('should handle clear errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockInvoke.mockRejectedValueOnce(new Error('Clear failed'));

      const { result } = renderHook(() => useClipboardHistory());

      await act(async () => {
        await result.current.clearAllHistory();
      });

      expect(consoleSpy).toHaveBeenCalledWith('Failed to clear history:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('should warn in browser environment', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockIsTauriEnvironment.mockReturnValue(false);

      const { result } = renderHook(() => useClipboardHistory());

      await act(async () => {
        await result.current.clearAllHistory();
      });

      expect(consoleSpy).toHaveBeenCalledWith('Clear history not available in browser environment');
      expect(mockInvoke).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('state management', () => {
    it('should update search query', () => {
      const { result } = renderHook(() => useClipboardHistory());

      act(() => {
        result.current.setSearchQuery('test query');
      });

      expect(result.current.searchQuery).toBe('test query');
    });

    it('should update selected entry', () => {
      const { result } = renderHook(() => useClipboardHistory());

      act(() => {
        result.current.setSelectedEntry(mockClipboardHistory[0]);
      });

      expect(result.current.selectedEntry).toEqual(mockClipboardHistory[0]);
    });

    it('should toggle show history', () => {
      const { result } = renderHook(() => useClipboardHistory());

      act(() => {
        result.current.setShowHistory(true);
      });

      expect(result.current.showHistory).toBe(true);

      act(() => {
        result.current.setShowHistory(false);
      });

      expect(result.current.showHistory).toBe(false);
    });
  });

  describe('pasteFromHistory', () => {
    it('should paste from history in Tauri environment', async () => {
      mockIsTauriEnvironment.mockReturnValue(true);
      mockInvoke.mockResolvedValue('Hello World');

      const { result } = renderHook(() => useClipboardHistory());

      let pastedContent: string | undefined;
      await act(async () => {
        pastedContent = await result.current.pasteFromHistory('1');
      });

      expect(mockInvoke).toHaveBeenCalledWith('paste_from_history', { id: '1' });
      expect(pastedContent).toBe('Hello World');
    });

    it('should throw error when pasting in browser environment', async () => {
      mockIsTauriEnvironment.mockReturnValue(false);
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { result } = renderHook(() => useClipboardHistory());

      await act(async () => {
        await expect(result.current.pasteFromHistory('1')).rejects.toThrow(
          'Paste from history not available in browser environment'
        );
      });

      expect(consoleSpy).toHaveBeenCalledWith('Paste from history not available in browser environment');
      expect(mockInvoke).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle errors when pasting from history', async () => {
      mockIsTauriEnvironment.mockReturnValue(true);
      mockInvoke.mockRejectedValue(new Error('Paste failed'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useClipboardHistory());

      await act(async () => {
        await expect(result.current.pasteFromHistory('1')).rejects.toThrow('Paste failed');
      });

      expect(consoleSpy).toHaveBeenCalledWith('Failed to paste from history:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });
});