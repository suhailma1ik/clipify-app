import { describe, it, expect, beforeEach, vi } from 'vitest';
import { statusMessages, getCurrentTimestamp, resetStatusAfterDelay } from '../statusUtils';

// Mock platform utils
vi.mock('../platform', () => ({
  getShortcutLabel: vi.fn(() => 'Cmd+Shift+C')
}));

describe('statusUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
  });

  describe('statusMessages', () => {
    it('should have correct ready message with shortcut label', () => {
      expect(statusMessages.ready).toBe('Global shortcut Cmd+Shift+C ready to capture text');
    });

    it('should have correct rephrasing message', () => {
      expect(statusMessages.rephrasing).toBe('🔄 Rephrasing text...');
    });

    it('should have correct manual rephrasing message', () => {
      expect(statusMessages.rephrasingManual).toBe('🔄 Rephrasing manual text...');
    });

    it('should generate success message with timestamp', () => {
      const timestamp = '12:34:56 PM';
      const result = statusMessages.success(timestamp);
      expect(result).toBe('✅ Text rephrased and copied! 12:34:56 PM');
    });

    it('should generate success cleaned message with timestamp', () => {
      const timestamp = '12:34:56 PM';
      const result = statusMessages.successCleaned(timestamp);
      expect(result).toBe('✅ Text cleaned and copied! 12:34:56 PM');
    });

    it('should generate success manual message with timestamp', () => {
      const timestamp = '12:34:56 PM';
      const result = statusMessages.successManual(timestamp);
      expect(result).toBe('✅ Manual text rephrased! 12:34:56 PM');
    });

    it('should have correct no text message', () => {
      expect(statusMessages.noText).toBe('⚠️ No text to clean');
    });

    it('should have correct token required message', () => {
      expect(statusMessages.tokenRequired).toBe('❌ JWT token required for rephrasing');
    });

    it('should generate error message with custom message', () => {
      const errorMsg = 'Network connection failed';
      const result = statusMessages.error(errorMsg);
      expect(result).toBe('❌ Failed to rephrase: Network connection failed');
    });

    it('should generate clipboard error message', () => {
      const error = new Error('Permission denied');
      const result = statusMessages.clipboardError(error);
      expect(result).toBe('❌ Error reading clipboard: Error: Permission denied');
    });

    it('should generate shortcut error message', () => {
      const error = 'Shortcut already registered';
      const result = statusMessages.shortcutError(error);
      expect(result).toBe('❌ Failed to setup shortcut: Shortcut already registered');
    });

    it('should handle null/undefined errors gracefully', () => {
      expect(statusMessages.clipboardError(null)).toBe('❌ Error reading clipboard: null');
      expect(statusMessages.shortcutError(undefined)).toBe('❌ Failed to setup shortcut: undefined');
    });
  });

  describe('getCurrentTimestamp', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return formatted current time', () => {
      const mockDate = new Date('2024-01-15T14:30:45Z');
      vi.setSystemTime(mockDate);

      const result = getCurrentTimestamp();
      // The exact format depends on locale, but should contain time components
      expect(result).toMatch(/\d{1,2}:\d{2}:\d{2}/);
    });

    it('should return different timestamps for different times', () => {
      vi.setSystemTime(new Date('2024-01-15T10:00:00Z'));
      const timestamp1 = getCurrentTimestamp();

      vi.setSystemTime(new Date('2024-01-15T15:30:00Z'));
      const timestamp2 = getCurrentTimestamp();

      expect(timestamp1).not.toBe(timestamp2);
    });

    it('should return string type', () => {
      const result = getCurrentTimestamp();
      expect(typeof result).toBe('string');
    });
  });

  describe('resetStatusAfterDelay', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should call setStatus with ready message after default delay', () => {
      const mockSetStatus = vi.fn();
      
      resetStatusAfterDelay(mockSetStatus);
      
      // Should not be called immediately
      expect(mockSetStatus).not.toHaveBeenCalled();
      
      // Fast-forward time by 3000ms (default delay)
      vi.advanceTimersByTime(3000);
      
      expect(mockSetStatus).toHaveBeenCalledWith(statusMessages.ready);
      expect(mockSetStatus).toHaveBeenCalledTimes(1);
    });

    it('should call setStatus with ready message after custom delay', () => {
      const mockSetStatus = vi.fn();
      const customDelay = 5000;
      
      resetStatusAfterDelay(mockSetStatus, customDelay);
      
      // Should not be called before the delay
      vi.advanceTimersByTime(4999);
      expect(mockSetStatus).not.toHaveBeenCalled();
      
      // Should be called after the delay
      vi.advanceTimersByTime(1);
      expect(mockSetStatus).toHaveBeenCalledWith(statusMessages.ready);
    });

    it('should handle zero delay', () => {
      const mockSetStatus = vi.fn();
      
      resetStatusAfterDelay(mockSetStatus, 0);
      
      // Should be called immediately with zero delay
      vi.advanceTimersByTime(0);
      expect(mockSetStatus).toHaveBeenCalledWith(statusMessages.ready);
    });

    it('should handle multiple calls with different delays', () => {
      const mockSetStatus1 = vi.fn();
      const mockSetStatus2 = vi.fn();
      
      resetStatusAfterDelay(mockSetStatus1, 1000);
      resetStatusAfterDelay(mockSetStatus2, 2000);
      
      // First callback should fire at 1000ms
      vi.advanceTimersByTime(1000);
      expect(mockSetStatus1).toHaveBeenCalledTimes(1);
      expect(mockSetStatus2).not.toHaveBeenCalled();
      
      // Second callback should fire at 2000ms
      vi.advanceTimersByTime(1000);
      expect(mockSetStatus1).toHaveBeenCalledTimes(1);
      expect(mockSetStatus2).toHaveBeenCalledTimes(1);
    });

    it('should not interfere with other timers', () => {
      const mockSetStatus = vi.fn();
      const mockOtherCallback = vi.fn();
      
      resetStatusAfterDelay(mockSetStatus, 2000);
      setTimeout(mockOtherCallback, 1000);
      
      vi.advanceTimersByTime(1000);
      expect(mockOtherCallback).toHaveBeenCalledTimes(1);
      expect(mockSetStatus).not.toHaveBeenCalled();
      
      vi.advanceTimersByTime(1000);
      expect(mockSetStatus).toHaveBeenCalledTimes(1);
    });
  });
});