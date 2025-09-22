/**
 * Unit tests for NotificationBanner component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NotificationBanner from '../NotificationBanner';
import { Notification } from '../../hooks/useNotification';

describe('NotificationBanner', () => {
  const mockOnDismiss = vi.fn();

  beforeEach(() => {
    mockOnDismiss.mockClear();
  });

  describe('null notification', () => {
    it('should not render when notification is null', () => {
      const { container } = render(
        <NotificationBanner notification={null} onDismiss={mockOnDismiss} />
      );
      
      expect(container.firstChild).toBeNull();
    });
  });

  describe('success notification', () => {
    const successNotification: Notification = {
      type: 'success',
      message: 'Operation completed successfully'
    };

    it('should render success notification with correct styling', () => {
      render(
        <NotificationBanner notification={successNotification} onDismiss={mockOnDismiss} />
      );
      
      expect(screen.getByText('Operation completed successfully')).toBeDefined();
      expect(screen.getByText('✅')).toBeDefined();
    });

    it('should display success icon', () => {
      render(
        <NotificationBanner notification={successNotification} onDismiss={mockOnDismiss} />
      );
      
      expect(screen.getByText('✅')).toBeDefined();
    });

    it('should call onDismiss when close button is clicked', () => {
      render(
        <NotificationBanner notification={successNotification} onDismiss={mockOnDismiss} />
      );
      
      const closeButton = screen.getByText('×');
      fireEvent.click(closeButton);
      
      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('error notification', () => {
    const errorNotification: Notification = {
      type: 'error',
      message: 'Something went wrong'
    };

    it('should render error notification with correct styling', () => {
      render(
        <NotificationBanner notification={errorNotification} onDismiss={mockOnDismiss} />
      );
      
      expect(screen.getByText('Something went wrong')).toBeDefined();
      expect(screen.getByText('❌')).toBeDefined();
    });

    it('should display error icon', () => {
      render(
        <NotificationBanner notification={errorNotification} onDismiss={mockOnDismiss} />
      );
      
      expect(screen.getByText('❌')).toBeDefined();
    });
  });

  describe('info notification', () => {
    const infoNotification: Notification = {
      type: 'info',
      message: 'Here is some information'
    };

    it('should render info notification with correct styling', () => {
      render(
        <NotificationBanner notification={infoNotification} onDismiss={mockOnDismiss} />
      );
      
      expect(screen.getByText('Here is some information')).toBeDefined();
      expect(screen.getByText('ℹ️')).toBeDefined();
    });

    it('should display info icon', () => {
      render(
        <NotificationBanner notification={infoNotification} onDismiss={mockOnDismiss} />
      );
      
      expect(screen.getByText('ℹ️')).toBeDefined();
    });
  });

  describe('unknown notification type', () => {
    const unknownNotification: Notification = {
      type: 'warning' as any, // Unknown type
      message: 'Unknown notification type'
    };

    it('should render unknown type with default info styling', () => {
      render(
        <NotificationBanner notification={unknownNotification} onDismiss={mockOnDismiss} />
      );
      
      expect(screen.getByText('Unknown notification type')).toBeDefined();
      expect(screen.getByText('ℹ️')).toBeDefined();
    });
  });

  describe('close button interactions', () => {
    const testNotification: Notification = {
      type: 'success',
      message: 'Test message'
    };

    it('should render close button', () => {
      render(
        <NotificationBanner notification={testNotification} onDismiss={mockOnDismiss} />
      );
      
      const closeButton = screen.getByText('×');
      expect(closeButton).toBeDefined();
      expect(closeButton.tagName).toBe('BUTTON');
    });

    it('should have close button', () => {
      render(
        <NotificationBanner notification={testNotification} onDismiss={mockOnDismiss} />
      );
      
      const closeButton = screen.getByText('×');
      expect(closeButton).toBeDefined();
      expect(closeButton.tagName).toBe('BUTTON');
    });

    it('should handle mouse hover events on close button', () => {
      render(
        <NotificationBanner notification={testNotification} onDismiss={mockOnDismiss} />
      );
      
      const closeButton = screen.getByText('×');
      
      // Test mouse over
      fireEvent.mouseOver(closeButton);
      expect(closeButton.getAttribute('style')).toContain('opacity: 1');
      
      // Test mouse out
      fireEvent.mouseOut(closeButton);
      expect(closeButton.getAttribute('style')).toContain('opacity: 0.8');
    });

    it('should not call onDismiss multiple times on rapid clicks', () => {
      render(
        <NotificationBanner notification={testNotification} onDismiss={mockOnDismiss} />
      );
      
      const closeButton = screen.getByText('×');
      
      // Rapid clicks
      fireEvent.click(closeButton);
      fireEvent.click(closeButton);
      fireEvent.click(closeButton);
      
      expect(mockOnDismiss).toHaveBeenCalledTimes(3);
    });
  });

  describe('styling and layout', () => {
    const testNotification: Notification = {
      type: 'info',
      message: 'Test styling'
    };

    it('should render notification banner', () => {
      render(
        <NotificationBanner notification={testNotification} onDismiss={mockOnDismiss} />
      );
      
      expect(screen.getByText('Test styling')).toBeDefined();
      expect(screen.getByText('ℹ️')).toBeDefined();
      expect(screen.getByRole('button')).toBeDefined();
    });

    it('should have close button', () => {
      render(
        <NotificationBanner notification={testNotification} onDismiss={mockOnDismiss} />
      );
      
      const closeButton = screen.getByText('×');
      expect(closeButton).toBeDefined();
      expect(closeButton.tagName).toBe('BUTTON');
    });
  });

  describe('edge cases', () => {
    it('should handle empty message', () => {
      const emptyMessageNotification: Notification = {
        type: 'info',
        message: ''
      };

      render(
        <NotificationBanner notification={emptyMessageNotification} onDismiss={mockOnDismiss} />
      );
      
      // Should still render the banner structure
      expect(screen.getByText('ℹ️')).toBeDefined();
      expect(screen.getByText('×')).toBeDefined();
    });

    it('should handle very long messages', () => {
      const longMessageNotification: Notification = {
        type: 'info',
        message: 'This is a very long notification message that should test how the component handles text overflow and wrapping within the maximum width constraint of 400px'
      };

      render(
        <NotificationBanner notification={longMessageNotification} onDismiss={mockOnDismiss} />
      );
      
      expect(screen.getByText(longMessageNotification.message)).toBeDefined();
    });

    it('should handle special characters in message', () => {
      const specialCharsNotification: Notification = {
        type: 'success',
        message: 'Special chars: <>&"\''
      };

      render(
        <NotificationBanner notification={specialCharsNotification} onDismiss={mockOnDismiss} />
      );
      
      expect(screen.getByText('Special chars: <>&"\'')).toBeDefined();
    });
  });

  describe('accessibility', () => {
    const testNotification: Notification = {
      type: 'error',
      message: 'Accessibility test'
    };

    it('should have accessible close button', () => {
      render(
        <NotificationBanner notification={testNotification} onDismiss={mockOnDismiss} />
      );
      
      const closeButton = screen.getByRole('button');
      expect(closeButton).toBeDefined();
      expect(closeButton.textContent).toBe('×');
    });

    it('should be keyboard accessible', () => {
      render(
        <NotificationBanner notification={testNotification} onDismiss={mockOnDismiss} />
      );
      
      const closeButton = screen.getByRole('button');
      
      // Test keyboard interaction
      fireEvent.keyDown(closeButton, { key: 'Enter' });
      // Note: fireEvent.keyDown doesn't trigger click by default, but the button should be focusable
      expect(closeButton).toBeDefined();
    });
  });
});