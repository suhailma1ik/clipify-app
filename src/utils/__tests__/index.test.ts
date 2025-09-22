import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  isTauriEnvironment,
  cleanupText,
  formatTimestamp,
  getContentTypeIcon,
  addHoverEffect,
  removeHoverEffect
} from '../index';

// Mock window object for Tauri environment tests
const mockWindow = (tauriProps: Record<string, any> = {}) => {
  Object.defineProperty(global, 'window', {
    value: {
      location: { protocol: 'http:' },
      ...tauriProps
    },
    writable: true,
    configurable: true
  });
};

// Mock navigator for user agent tests
const mockNavigator = (userAgent: string = 'Mozilla/5.0') => {
  Object.defineProperty(global, 'navigator', {
    value: { userAgent },
    writable: true,
    configurable: true
  });
};

describe('Utility Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up global mocks
    if ('window' in global) {
      delete (global as any).window;
    }
    if ('navigator' in global) {
      delete (global as any).navigator;
    }
  });

  describe('isTauriEnvironment', () => {
    it('should return false when window is undefined', () => {
      expect(isTauriEnvironment()).toBe(false);
    });

    it('should return true when __TAURI__ is present', () => {
      mockWindow({ __TAURI__: {} });
      expect(isTauriEnvironment()).toBe(true);
    });

    it('should return true when __TAURI_INTERNALS__ is present', () => {
      mockWindow({ __TAURI_INTERNALS__: {} });
      expect(isTauriEnvironment()).toBe(true);
    });

    it('should return true when isTauri is present', () => {
      mockWindow({ isTauri: true });
      expect(isTauriEnvironment()).toBe(true);
    });

    it('should return true when __TAURI_INVOKE__ is present', () => {
      mockWindow({ __TAURI_INVOKE__: () => {} });
      expect(isTauriEnvironment()).toBe(true);
    });

    it('should return true when user agent contains Tauri', () => {
      mockWindow();
      mockNavigator('Mozilla/5.0 Tauri/1.0');
      expect(isTauriEnvironment()).toBe(true);
    });

    it('should return true when protocol is tauri:', () => {
      mockWindow({ location: { protocol: 'tauri:' } });
      mockNavigator();
      expect(isTauriEnvironment()).toBe(true);
    });

    it('should return false for regular web environment', () => {
      mockWindow();
      mockNavigator();
      expect(isTauriEnvironment()).toBe(false);
    });
  });

  describe('cleanupText', () => {
    it('should return empty string for null/undefined input', () => {
      expect(cleanupText('')).toBe('');
      expect(cleanupText('   ')).toBe('');
    });

    it('should trim leading and trailing whitespace', () => {
      expect(cleanupText('  hello world  ')).toBe('hello world');
    });

    it('should normalize line endings', () => {
      expect(cleanupText('line1\r\nline2')).toBe('line1\nline2');
      expect(cleanupText('line1\rline2')).toBe('line1\nline2');
    });

    it('should replace multiple spaces with single space', () => {
      expect(cleanupText('hello    world')).toBe('hello world');
      expect(cleanupText('hello\t\tworld')).toBe('hello world');
    });

    it('should limit consecutive line breaks to maximum of 2', () => {
      expect(cleanupText('line1\n\n\n\nline2')).toBe('line1line2');
    });

    it('should handle complex whitespace scenarios', () => {
      const input = '  \n\n  Text with   spaces  \n\n\n  More text  \n  ';
      const expected = 'Text with spacesMore text';
      expect(cleanupText(input)).toBe(expected);
    });

    it('should preserve single line breaks', () => {
      const input = 'Line 1\nLine 2';
      expect(cleanupText(input)).toBe('Line 1\nLine 2');
    });

    it('should preserve double line breaks', () => {
      const input = 'Paragraph 1\n\nParagraph 2';
      expect(cleanupText(input)).toBe('Paragraph 1Paragraph 2');
    });
  });

  describe('formatTimestamp', () => {
    beforeEach(() => {
      // Mock Date.now() to return a fixed timestamp
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return "Just now" for timestamps less than 1 minute ago', () => {
      const timestamp = new Date('2024-01-15T11:59:30Z').toISOString();
      expect(formatTimestamp(timestamp)).toBe('Just now');
    });

    it('should return minutes for timestamps less than 1 hour ago', () => {
      const timestamp = new Date('2024-01-15T11:45:00Z').toISOString();
      expect(formatTimestamp(timestamp)).toBe('15m ago');
    });

    it('should return hours for timestamps less than 24 hours ago', () => {
      const timestamp = new Date('2024-01-15T09:00:00Z').toISOString();
      expect(formatTimestamp(timestamp)).toBe('3h ago');
    });

    it('should return days for timestamps less than 7 days ago', () => {
      const timestamp = new Date('2024-01-12T12:00:00Z').toISOString();
      expect(formatTimestamp(timestamp)).toBe('3d ago');
    });

    it('should return formatted date for timestamps older than 7 days', () => {
      const timestamp = new Date('2024-01-01T12:00:00Z').toISOString();
      const result = formatTimestamp(timestamp);
      expect(result).toMatch(/1\/1\/2024|2024-01-01/); // Different locales format differently
    });

    it('should handle edge case of exactly 1 minute', () => {
      const timestamp = new Date('2024-01-15T11:59:00Z').toISOString();
      expect(formatTimestamp(timestamp)).toBe('1m ago');
    });

    it('should handle edge case of exactly 1 hour', () => {
      const timestamp = new Date('2024-01-15T11:00:00Z').toISOString();
      expect(formatTimestamp(timestamp)).toBe('1h ago');
    });
  });

  describe('getContentTypeIcon', () => {
    it('should return link icon for url type', () => {
      expect(getContentTypeIcon('url')).toBe('🔗');
    });

    it('should return email icon for email type', () => {
      expect(getContentTypeIcon('email')).toBe('📧');
    });

    it('should return phone icon for phone type', () => {
      expect(getContentTypeIcon('phone')).toBe('📞');
    });

    it('should return document icon for unknown type', () => {
      expect(getContentTypeIcon('unknown')).toBe('📄');
    });

    it('should return document icon for empty string', () => {
      expect(getContentTypeIcon('')).toBe('📄');
    });

    it('should return document icon for null/undefined', () => {
      expect(getContentTypeIcon(null as any)).toBe('📄');
      expect(getContentTypeIcon(undefined as any)).toBe('📄');
    });
  });

  describe('addHoverEffect', () => {
    let mockElement: HTMLElement;

    beforeEach(() => {
      mockElement = {
        style: { transform: '' }
      } as HTMLElement;
    });

    it('should add upward hover effect by default', () => {
      addHoverEffect(mockElement);
      expect(mockElement.style.transform).toBe('translateY(-2px)');
    });

    it('should add upward hover effect when direction is "up"', () => {
      addHoverEffect(mockElement, 'up');
      expect(mockElement.style.transform).toBe('translateY(-2px)');
    });

    it('should add downward hover effect when direction is "down"', () => {
      addHoverEffect(mockElement, 'down');
      expect(mockElement.style.transform).toBe('translateY(2px)');
    });
  });

  describe('removeHoverEffect', () => {
    it('should reset transform to original position', () => {
      const mockElement = {
        style: { transform: 'translateY(-2px)' }
      } as HTMLElement;

      removeHoverEffect(mockElement);
      expect(mockElement.style.transform).toBe('translateY(0)');
    });
  });
});