/**
 * Unit tests for Header component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Header from '../Header';

describe('Header', () => {
  describe('default props', () => {
    it('should render with default values when no props provided', () => {
      render(<Header />);
      
      expect(screen.getByText('Clipify Pro')).toBeDefined();
      expect(screen.getByText('👤 Guest User')).toBeDefined();
      expect(screen.getByText('Free Plan')).toBeDefined();
      expect(screen.getByText('0')).toBeDefined(); // clipboardItems
      expect(screen.getByText('0 KB')).toBeDefined(); // storageUsed
      expect(screen.getByText('0/100')).toBeDefined(); // dailyUsage/dailyLimit
    });

    it('should display default usage statistics', () => {
      render(<Header />);
      
      expect(screen.getByText('Items Stored')).toBeDefined();
      expect(screen.getByText('Storage Used')).toBeDefined();
      expect(screen.getByText('Daily Usage')).toBeDefined();
    });

    it('should show progress bar with 0% usage by default', () => {
      render(<Header />);
      
      const progressBar = document.querySelector('.progress-bar');
      expect(progressBar).toBeDefined();
      expect(progressBar?.getAttribute('style')).toContain('width: 0%');
      expect(progressBar?.className).toContain('ok');
    });
  });

  describe('custom props', () => {
    it('should render custom username and user plan', () => {
      render(
        <Header 
          username="John Doe" 
          userPlan="Pro Plan" 
        />
      );
      
      expect(screen.getByText('👤 John Doe')).toBeDefined();
      expect(screen.getByText('Pro Plan')).toBeDefined();
    });

    it('should render custom usage statistics', () => {
      const customUsageStats = {
        clipboardItems: 25,
        storageUsed: '2.5 MB',
        dailyLimit: 500,
        dailyUsage: 150
      };

      render(<Header usageStats={customUsageStats} />);
      
      expect(screen.getByText('25')).toBeDefined();
      expect(screen.getByText('2.5 MB')).toBeDefined();
      expect(screen.getByText('150/500')).toBeDefined();
    });
  });

  describe('user plan badge styling', () => {
    it('should apply success badge class for Pro Plan', () => {
      render(<Header userPlan="Pro Plan" />);
      
      const badge = screen.getByText('Pro Plan');
      expect(badge.className).toContain('badge');
      expect(badge.className).toContain('badge-success');
    });

    it('should apply muted badge class for Free Plan', () => {
      render(<Header userPlan="Free Plan" />);
      
      const badge = screen.getByText('Free Plan');
      expect(badge.className).toContain('badge');
      expect(badge.className).toContain('badge-muted');
    });

    it('should apply muted badge class for other plans', () => {
      render(<Header userPlan="Basic Plan" />);
      
      const badge = screen.getByText('Basic Plan');
      expect(badge.className).toContain('badge');
      expect(badge.className).toContain('badge-muted');
    });
  });

  describe('usage percentage calculation and styling', () => {
    it('should calculate and display correct usage percentage', () => {
      const usageStats = {
        clipboardItems: 10,
        storageUsed: '1 MB',
        dailyLimit: 100,
        dailyUsage: 30
      };

      render(<Header usageStats={usageStats} />);
      
      const progressBar = document.querySelector('.progress-bar');
      expect(progressBar?.getAttribute('style')).toContain('width: 30%');
    });

    it('should apply ok class for usage under 80%', () => {
      const usageStats = {
        clipboardItems: 10,
        storageUsed: '1 MB',
        dailyLimit: 100,
        dailyUsage: 50
      };

      render(<Header usageStats={usageStats} />);
      
      const progressBar = document.querySelector('.progress-bar');
      expect(progressBar?.className).toContain('ok');
      
      const usageText = screen.getByText('50/100');
      expect(usageText.getAttribute('style')).toContain('color: rgb(5, 150, 105)');
    });

    it('should apply warn class for usage over 80%', () => {
      const usageStats = {
        clipboardItems: 10,
        storageUsed: '1 MB',
        dailyLimit: 100,
        dailyUsage: 85
      };

      render(<Header usageStats={usageStats} />);
      
      const progressBar = document.querySelector('.progress-bar');
      expect(progressBar?.className).toContain('warn');
      
      const usageText = screen.getByText('85/100');
      expect(usageText.getAttribute('style')).toContain('color: rgb(217, 119, 6)');
    });

    it('should cap progress bar at 100% for usage over limit', () => {
      const usageStats = {
        clipboardItems: 10,
        storageUsed: '1 MB',
        dailyLimit: 100,
        dailyUsage: 150
      };

      render(<Header usageStats={usageStats} />);
      
      const progressBar = document.querySelector('.progress-bar');
      expect(progressBar?.getAttribute('style')).toContain('width: 100%');
      expect(screen.getByText('150/100')).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle zero daily limit gracefully', () => {
      const usageStats = {
        clipboardItems: 5,
        storageUsed: '500 KB',
        dailyLimit: 0,
        dailyUsage: 10
      };

      render(<Header usageStats={usageStats} />);
      
      expect(screen.getByText('10/0')).toBeDefined();
      // Should handle division by zero
      const progressBar = document.querySelector('.progress-bar');
      expect(progressBar?.getAttribute('style')).toContain('width: 100%'); // Infinity capped at 100%
    });

    it('should handle negative usage values', () => {
      const usageStats = {
        clipboardItems: -5,
        storageUsed: '-100 KB',
        dailyLimit: 100,
        dailyUsage: -10
      };

      render(<Header usageStats={usageStats} />);
      
      expect(screen.getByText('-5')).toBeDefined();
      expect(screen.getByText('-100 KB')).toBeDefined();
      expect(screen.getByText('-10/100')).toBeDefined();
      
      const progressBar = document.querySelector('.progress-bar');
      expect(progressBar?.getAttribute('style')).toContain('width: -10%'); // Component doesn't cap negative values
    });

    it('should handle very large numbers', () => {
      const usageStats = {
        clipboardItems: 999999,
        storageUsed: '999.9 GB',
        dailyLimit: 1000000,
        dailyUsage: 500000
      };

      render(<Header usageStats={usageStats} />);
      
      expect(screen.getByText('999999')).toBeDefined();
      expect(screen.getByText('999.9 GB')).toBeDefined();
      expect(screen.getByText('500000/1000000')).toBeDefined();
    });

    it('should handle empty strings for username and userPlan', () => {
      render(<Header username="" userPlan="" />);
      
      // Check that the user icon exists
      expect(screen.getByText('👤')).toBeDefined();
      
      const badges = document.querySelectorAll('.badge');
      expect(badges[0]).toBeDefined();
      expect(badges[0].textContent).toBe(''); // Empty userPlan
      expect(badges[0].className).toContain('badge-muted'); // Should still apply muted class
    });
  });

  describe('accessibility', () => {
    it('should have proper semantic structure', () => {
      render(<Header />);
      
      const header = screen.getByRole('banner');
      expect(header).toBeDefined();
      
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading.textContent).toBe('Clipify Pro');
    });

    it('should have readable text content', () => {
      render(<Header username="Test User" userPlan="Pro Plan" />);
      
      expect(screen.getByText('👤 Test User')).toBeDefined();
      expect(screen.getByText('Pro Plan')).toBeDefined();
      expect(screen.getByText('Items Stored')).toBeDefined();
      expect(screen.getByText('Storage Used')).toBeDefined();
      expect(screen.getByText('Daily Usage')).toBeDefined();
    });
  });

  describe('visual elements', () => {
    it('should render clipboard icon', () => {
      render(<Header />);
      
      expect(screen.getByText('📋')).toBeDefined();
    });

    it('should render user icon with username', () => {
      render(<Header />);
      
      expect(screen.getByText('👤 Guest User')).toBeDefined();
    });

    it('should apply gradient text class to title', () => {
      render(<Header />);
      
      const title = screen.getByText('Clipify Pro');
      expect(title.className).toContain('gradient-text');
    });

    it('should apply gradient text class to storage used', () => {
      render(<Header />);
      
      const storageUsed = screen.getByText('0 KB');
      expect(storageUsed.className).toContain('gradient-text');
    });
  });
});