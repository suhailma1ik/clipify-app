import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTextProcessing } from '../useTextProcessing';
import { rephraseService } from '../../services/rephraseService';

// Mock dependencies
vi.mock('@tauri-apps/plugin-clipboard-manager', () => ({
  writeText: vi.fn(),
}));

vi.mock('../../services/rephraseService', () => ({
  rephraseService: {
    rephrase: vi.fn(),
  },
  isRephraseError: vi.fn(),
}));

const mockWriteText = vi.mocked(await import('@tauri-apps/plugin-clipboard-manager')).writeText;
const mockRephraseService = vi.mocked(rephraseService);
const mockIsRephraseError = vi.mocked(await import('../../services/rephraseService')).isRephraseError;

// Mock clipboard API
const mockClipboard = {
  readText: vi.fn(),
};

Object.defineProperty(navigator, 'clipboard', {
  value: mockClipboard,
  writable: true,
});

describe('useTextProcessing', () => {
  const mockShowNotification = vi.fn();
  const mockLoadClipboardHistory = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => 
        useTextProcessing(mockShowNotification, mockLoadClipboardHistory)
      );

      expect(result.current.cleanedText).toBe('');
      expect(result.current.rephrasedText).toBe('');
      expect(result.current.isProcessing).toBe(false);
      expect(result.current.isRephrasing).toBe(false);
    });
  });

  describe('processClipboardText', () => {
    it('should process clipboard text successfully', async () => {
      const clipboardText = 'Hello world, this is a test message';
      mockClipboard.readText.mockResolvedValue(clipboardText);
      mockRephraseService.rephrase.mockResolvedValue({
        rephrased_text: 'Hello world, this is a professional test message',
      });

      const { result } = renderHook(() => 
        useTextProcessing(mockShowNotification, mockLoadClipboardHistory)
      );

      await act(async () => {
        await result.current.processClipboardText();
      });

      expect(result.current.cleanedText).toBe(clipboardText);
      expect(mockRephraseService.rephrase).toHaveBeenCalledWith(
        clipboardText,
        'formal',
        'Business communication',
        'Colleagues',
        false
      );
    });

    it('should handle short text without rephrasing', async () => {
      const shortText = 'Hi';
      mockClipboard.readText.mockResolvedValue(shortText);

      const { result } = renderHook(() => 
        useTextProcessing(mockShowNotification, mockLoadClipboardHistory)
      );

      await act(async () => {
        await result.current.processClipboardText();
      });

      expect(result.current.cleanedText).toBe(shortText);
      expect(mockRephraseService.rephrase).not.toHaveBeenCalled();
    });

    it('should handle clipboard read errors', async () => {
      mockClipboard.readText.mockRejectedValue(new Error('Clipboard access denied'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => 
        useTextProcessing(mockShowNotification, mockLoadClipboardHistory)
      );

      await act(async () => {
        await result.current.processClipboardText();
      });

      expect(consoleSpy).toHaveBeenCalledWith('Failed to read clipboard:', expect.any(Error));
      expect(result.current.isProcessing).toBe(false);

      consoleSpy.mockRestore();
    });

    it('should not process same text twice', async () => {
      const clipboardText = 'Same text content';
      mockClipboard.readText.mockResolvedValue(clipboardText);
      mockRephraseService.rephrase.mockResolvedValue({
        rephrased_text: 'Same professional text content',
      });

      const { result } = renderHook(() => 
        useTextProcessing(mockShowNotification, mockLoadClipboardHistory)
      );

      // First call
      await act(async () => {
        await result.current.processClipboardText();
      });

      // Second call with same text
      await act(async () => {
        await result.current.processClipboardText();
      });

      expect(mockRephraseService.rephrase).toHaveBeenCalledTimes(1);
    });
  });

  describe('auto-rephrase functionality', () => {
    it('should rephrase text and update clipboard', async () => {
      const originalText = 'This is a test message for rephrasing';
      const rephrasedText = 'This is a professional test message for rephrasing';
      
      mockClipboard.readText.mockResolvedValue(originalText);
      mockRephraseService.rephrase.mockResolvedValue({
        rephrased_text: rephrasedText,
      });

      const { result } = renderHook(() => 
        useTextProcessing(mockShowNotification, mockLoadClipboardHistory)
      );

      await act(async () => {
        await result.current.processClipboardText();
      });

      expect(mockWriteText).toHaveBeenCalledWith(rephrasedText);
      expect(result.current.rephrasedText).toBe(rephrasedText);
      // Note: Notification is now handled by useAutoRephrase hook to prevent duplicates
      expect(mockShowNotification).not.toHaveBeenCalledWith(
        'Rephrased text copied to clipboard ✅',
        'success'
      );
      expect(mockLoadClipboardHistory).toHaveBeenCalled();
    });

    it('should handle rephrase errors with error object', async () => {
      const originalText = 'This is a test message for rephrasing';
      const error = new Error('API rate limit exceeded');
      
      mockClipboard.readText.mockResolvedValue(originalText);
      mockRephraseService.rephrase.mockRejectedValue(error);
      mockIsRephraseError.mockReturnValue(true);

      const { result } = renderHook(() => 
        useTextProcessing(mockShowNotification, mockLoadClipboardHistory)
      );

      await act(async () => {
        await result.current.processClipboardText();
      });

      expect(mockShowNotification).toHaveBeenCalledWith(
        'Rephrase failed ❌ API rate limit exceeded',
        'error'
      );
      expect(result.current.isRephrasing).toBe(false);
    });

    it('should handle unknown rephrase errors', async () => {
      const originalText = 'This is a test message for rephrasing';
      const error = new Error('Unknown error');
      
      mockClipboard.readText.mockResolvedValue(originalText);
      mockRephraseService.rephrase.mockRejectedValue(error);
      mockIsRephraseError.mockReturnValue(false);

      const { result } = renderHook(() => 
        useTextProcessing(mockShowNotification, mockLoadClipboardHistory)
      );

      await act(async () => {
        await result.current.processClipboardText();
      });

      expect(mockShowNotification).toHaveBeenCalledWith(
        'Rephrase failed ❌ Unknown error',
        'error'
      );
    });

    it('should debounce rephrase requests', async () => {
      const originalText = 'This is a test message for rephrasing';
      
      mockClipboard.readText.mockResolvedValue(originalText);
      mockRephraseService.rephrase.mockResolvedValue({
        rephrased_text: 'Professional message',
      });

      const { result } = renderHook(() => 
        useTextProcessing(mockShowNotification, mockLoadClipboardHistory)
      );

      // First call
      await act(async () => {
        await result.current.processClipboardText();
      });

      // Advance time by less than 500ms
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Second call should be debounced
      await act(async () => {
        await result.current.processClipboardText();
      });

      expect(mockRephraseService.rephrase).toHaveBeenCalledTimes(1);
    });
  });

  describe('copyRephrasedText', () => {
    it('should copy rephrased text to clipboard', async () => {
      const { result } = renderHook(() => 
        useTextProcessing(mockShowNotification, mockLoadClipboardHistory)
      );

      // Set rephrased text
      act(() => {
        result.current.setRephrasedText('This is rephrased text');
      });

      await act(async () => {
        await result.current.copyRephrasedText();
      });

      expect(mockWriteText).toHaveBeenCalledWith('This is rephrased text');
      expect(mockShowNotification).toHaveBeenCalledWith(
        'Rephrased text copied to clipboard ✅',
        'success'
      );
    });

    it('should not copy if no rephrased text exists', async () => {
      const { result } = renderHook(() => 
        useTextProcessing(mockShowNotification, mockLoadClipboardHistory)
      );

      await act(async () => {
        await result.current.copyRephrasedText();
      });

      expect(mockWriteText).not.toHaveBeenCalled();
      expect(mockShowNotification).not.toHaveBeenCalled();
    });
  });

  describe('clearTexts', () => {
    it('should clear all text states', () => {
      const { result } = renderHook(() => 
        useTextProcessing(mockShowNotification, mockLoadClipboardHistory)
      );

      // Set some text
      act(() => {
        result.current.setCleanedText('Cleaned text');
        result.current.setRephrasedText('Rephrased text');
      });

      expect(result.current.cleanedText).toBe('Cleaned text');
      expect(result.current.rephrasedText).toBe('Rephrased text');

      // Clear texts
      act(() => {
        result.current.clearTexts();
      });

      expect(result.current.cleanedText).toBe('');
      expect(result.current.rephrasedText).toBe('');
    });
  });

  describe('state setters', () => {
    it('should update cleaned text', () => {
      const { result } = renderHook(() => 
        useTextProcessing(mockShowNotification, mockLoadClipboardHistory)
      );

      act(() => {
        result.current.setCleanedText('New cleaned text');
      });

      expect(result.current.cleanedText).toBe('New cleaned text');
    });

    it('should update rephrased text', () => {
      const { result } = renderHook(() => 
        useTextProcessing(mockShowNotification, mockLoadClipboardHistory)
      );

      act(() => {
        result.current.setRephrasedText('New rephrased text');
      });

      expect(result.current.rephrasedText).toBe('New rephrased text');
    });
  });

  describe('processing states', () => {
    it('should set processing state during clipboard processing', async () => {
      mockClipboard.readText.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('test'), 100))
      );

      const { result } = renderHook(() => 
        useTextProcessing(mockShowNotification, mockLoadClipboardHistory)
      );

      const processPromise = act(async () => {
        await result.current.processClipboardText();
      });

      // Should be processing initially
      expect(result.current.isProcessing).toBe(true);

      await processPromise;

      // Should not be processing after completion
      expect(result.current.isProcessing).toBe(false);
    });

    it('should set rephrasing state during auto-rephrase', async () => {
      const originalText = 'This is a test message for rephrasing';
      
      mockClipboard.readText.mockResolvedValue(originalText);
      mockRephraseService.rephrase.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ rephrased_text: 'Professional message' }), 100))
      );

      const { result } = renderHook(() => 
        useTextProcessing(mockShowNotification, mockLoadClipboardHistory)
      );

      const processPromise = act(async () => {
        await result.current.processClipboardText();
      });

      // Advance time to trigger rephrase
      act(() => {
        vi.advanceTimersByTime(50);
      });

      // Should be rephrasing
      expect(result.current.isRephrasing).toBe(true);

      await processPromise;

      // Should not be rephrasing after completion
      expect(result.current.isRephrasing).toBe(false);
    });
  });
});