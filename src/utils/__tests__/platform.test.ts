import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { isMac, getPrimaryModifierKey, getShortcutLabel } from '../platform';

// Mock navigator for platform detection
const mockNavigator = (userAgent: string = 'Mozilla/5.0') => {
  Object.defineProperty(global, 'navigator', {
    value: { userAgent },
    writable: true,
    configurable: true
  });
};

describe('Platform Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up global mocks
    if ('navigator' in global) {
      delete (global as any).navigator;
    }
  });

  describe('isMac', () => {
    it('should return false when navigator is undefined', () => {
      expect(isMac()).toBe(false);
    });

    it('should return true for Mac user agents', () => {
      mockNavigator('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)');
      expect(isMac()).toBe(true);
    });

    it('should return false for Windows user agents', () => {
      mockNavigator('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
      expect(isMac()).toBe(false);
    });

    it('should return false for Linux user agents', () => {
      mockNavigator('Mozilla/5.0 (X11; Linux x86_64)');
      expect(isMac()).toBe(false);
    });

    it('should handle empty user agent', () => {
      mockNavigator('');
      expect(isMac()).toBe(false);
    });
  });

  describe('getPrimaryModifierKey', () => {
    it('should return "Cmd" on Mac', () => {
      mockNavigator('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)');
      expect(getPrimaryModifierKey()).toBe('Cmd');
    });

    it('should return "Ctrl" on Windows', () => {
      mockNavigator('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
      expect(getPrimaryModifierKey()).toBe('Ctrl');
    });

    it('should return "Ctrl" on Linux', () => {
      mockNavigator('Mozilla/5.0 (X11; Linux x86_64)');
      expect(getPrimaryModifierKey()).toBe('Ctrl');
    });

    it('should return "Ctrl" when navigator is undefined', () => {
      expect(getPrimaryModifierKey()).toBe('Ctrl');
    });
  });

  describe('getShortcutLabel', () => {
    it('should return "Cmd+Shift+C" on Mac', () => {
      mockNavigator('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)');
      expect(getShortcutLabel()).toBe('Cmd+Shift+C');
    });

    it('should return "Ctrl+Shift+C" on Windows', () => {
      mockNavigator('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
      expect(getShortcutLabel()).toBe('Ctrl+Shift+C');
    });

    it('should return "Ctrl+Shift+C" on Linux', () => {
      mockNavigator('Mozilla/5.0 (X11; Linux x86_64)');
      expect(getShortcutLabel()).toBe('Ctrl+Shift+C');
    });

    it('should return "Ctrl+Shift+C" when navigator is undefined', () => {
      expect(getShortcutLabel()).toBe('Ctrl+Shift+C');
    });
  });
});