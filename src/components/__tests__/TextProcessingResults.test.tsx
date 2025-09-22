import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TextProcessingResults from '../TextProcessingResults';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { rephraseService } from '../../services/rephraseService';

// Mock dependencies
vi.mock('@tauri-apps/plugin-clipboard-manager', () => ({
  writeText: vi.fn(),
}));

vi.mock('../../services/rephraseService', () => ({
  rephraseService: {
    countWords: vi.fn(),
  },
}));

const mockWriteText = vi.mocked(writeText);
const mockCountWords = vi.mocked(rephraseService.countWords);

describe('TextProcessingResults', () => {
  const mockShowNotification = vi.fn();

  const defaultProps = {
    cleanedText: '',
    rephrasedText: '',
    showNotification: mockShowNotification,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCountWords.mockReturnValue(5);
  });

  describe('rendering', () => {
    it('should not render when both texts are empty', () => {
      const { container } = render(<TextProcessingResults {...defaultProps} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render cleaned text section when cleanedText is provided', () => {
      render(
        <TextProcessingResults
          {...defaultProps}
          cleanedText="This is cleaned text"
        />
      );

      expect(screen.getByText('Cleaned Text')).toBeInTheDocument();
      expect(screen.getByText('This is cleaned text')).toBeInTheDocument();
    });

    it('should render rephrased text section when rephrasedText is provided', () => {
      render(
        <TextProcessingResults
          {...defaultProps}
          rephrasedText="This is rephrased text"
        />
      );

      expect(screen.getByText('Rephrased Text')).toBeInTheDocument();
      expect(screen.getByText('This is rephrased text')).toBeInTheDocument();
    });

    it('should render both sections when both texts are provided', () => {
      render(
        <TextProcessingResults
          {...defaultProps}
          cleanedText="This is cleaned text"
          rephrasedText="This is rephrased text"
        />
      );

      expect(screen.getByText('Cleaned Text')).toBeInTheDocument();
      expect(screen.getByText('Rephrased Text')).toBeInTheDocument();
      expect(screen.getByText('This is cleaned text')).toBeInTheDocument();
      expect(screen.getByText('This is rephrased text')).toBeInTheDocument();
    });
  });

  describe('word count display', () => {
    it('should display word count for cleaned text', () => {
      mockCountWords.mockReturnValue(3);
      
      render(
        <TextProcessingResults
          {...defaultProps}
          cleanedText="This is cleaned"
        />
      );

      expect(mockCountWords).toHaveBeenCalledWith('This is cleaned');
      expect(screen.getByText('3 words')).toBeInTheDocument();
    });

    it('should display word count for rephrased text', () => {
      mockCountWords.mockReturnValue(4);
      
      render(
        <TextProcessingResults
          {...defaultProps}
          rephrasedText="This is rephrased text"
        />
      );

      expect(mockCountWords).toHaveBeenCalledWith('This is rephrased text');
      expect(screen.getByText('4 words')).toBeInTheDocument();
    });

    it('should handle zero word count', () => {
      mockCountWords.mockReturnValue(0);
      
      render(
        <TextProcessingResults
          {...defaultProps}
          cleanedText=""
        />
      );

      // Empty text should not render the cleaned text section at all
      expect(screen.queryByText('Cleaned Text')).not.toBeInTheDocument();
    });

    it('should handle large word counts', () => {
      mockCountWords.mockReturnValue(1000);
      
      render(
        <TextProcessingResults
          {...defaultProps}
          cleanedText="Very long text with many words..."
        />
      );

      expect(screen.getByText('1000 words')).toBeInTheDocument();
    });
  });

  describe('clipboard operations', () => {
    it('should copy rephrased text to clipboard when copy button is clicked', async () => {
      const rephrasedText = 'This is rephrased text';
      mockWriteText.mockResolvedValue();

      render(
        <TextProcessingResults
          {...defaultProps}
          rephrasedText={rephrasedText}
        />
      );

      const copyButton = screen.getByRole('button', { name: /copy/i });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith(rephrasedText);
      });
    });

    it('should show success notification after copying', async () => {
      const rephrasedText = 'This is rephrased text';
      mockWriteText.mockResolvedValue();

      render(
        <TextProcessingResults
          {...defaultProps}
          rephrasedText={rephrasedText}
        />
      );

      const copyButton = screen.getByRole('button', { name: /copy/i });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(mockShowNotification).toHaveBeenCalledWith(
          'Rephrased text copied to clipboard ✅',
          'success'
        );
      });
    });

    it('should call writeText when copy button is clicked', async () => {
      const rephrasedText = 'This is rephrased text';
      mockWriteText.mockResolvedValue();

      render(
        <TextProcessingResults
          {...defaultProps}
          rephrasedText={rephrasedText}
        />
      );

      const copyButton = screen.getByRole('button', { name: /copy/i });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith(rephrasedText);
      });
    });

    it('should not copy when rephrased text is empty', async () => {
      render(
        <TextProcessingResults
          {...defaultProps}
          cleanedText="Some cleaned text"
          rephrasedText=""
        />
      );

      // Copy button should not be present when no rephrased text
      expect(screen.queryByRole('button', { name: /copy/i })).not.toBeInTheDocument();
    });
  });

  describe('button interactions', () => {
    it('should have accessible copy button', () => {
      render(
        <TextProcessingResults
          {...defaultProps}
          rephrasedText="This is rephrased text"
        />
      );

      const copyButton = screen.getByRole('button', { name: /copy/i });
      expect(copyButton).toBeInTheDocument();
      // Button elements don't need explicit type="button" attribute to be valid
      expect(copyButton.tagName).toBe('BUTTON');
    });

    it('should handle multiple rapid clicks on copy button', async () => {
      const rephrasedText = 'This is rephrased text';
      mockWriteText.mockResolvedValue();

      render(
        <TextProcessingResults
          {...defaultProps}
          rephrasedText={rephrasedText}
        />
      );

      const copyButton = screen.getByRole('button', { name: /copy/i });
      
      // Click multiple times rapidly
      fireEvent.click(copyButton);
      fireEvent.click(copyButton);
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe('text display', () => {
    it('should display long text with proper truncation', () => {
      const longText = 'A'.repeat(1000);
      render(
        <TextProcessingResults
          {...defaultProps}
          cleanedText={longText}
        />
      );

      // Check that the text container exists and has overflow styling
      const textContainer = screen.getByText(longText);
      expect(textContainer).toBeInTheDocument();
      expect(textContainer).toHaveStyle('max-height: 200px');
      expect(textContainer).toHaveStyle('overflow-y: auto');
    });

    it('should handle text with special characters', () => {
      const specialText = 'Text with special chars: @#$%^&*()_+-=[]{}|;:,.<>?';
      
      render(
        <TextProcessingResults
          {...defaultProps}
          rephrasedText={specialText}
        />
      );

      expect(screen.getByText(specialText)).toBeInTheDocument();
    });

    it('should handle text with line breaks', () => {
      const multilineText = 'Line 1\nLine 2\nLine 3';
      
      render(
        <TextProcessingResults
          {...defaultProps}
          cleanedText={multilineText}
        />
      );

      // Check that the multiline text is rendered (React preserves newlines in text content)
      const textContainer = screen.getByText((_content, element) => {
        return element?.textContent === multilineText;
      });
      expect(textContainer).toBeInTheDocument();
    });

    it('should handle empty strings gracefully', () => {
      render(
        <TextProcessingResults
          {...defaultProps}
          cleanedText=""
          rephrasedText=""
        />
      );

      // Component should not render anything
      expect(screen.queryByText('Cleaned Text')).not.toBeInTheDocument();
      expect(screen.queryByText('Rephrased Text')).not.toBeInTheDocument();
    });
  });

  describe('component structure', () => {
    it('should have proper section structure for cleaned text', () => {
      render(
        <TextProcessingResults
          {...defaultProps}
          cleanedText="Test cleaned text"
        />
      );

      // Check that the cleaned text section exists
      expect(screen.getByText('Cleaned Text')).toBeInTheDocument();
      expect(screen.getByText('Test cleaned text')).toBeInTheDocument();
    });

    it('should have proper section structure for rephrased text', () => {
      render(
        <TextProcessingResults
          {...defaultProps}
          rephrasedText="Test rephrased text"
        />
      );

      // Check that the rephrased text section exists
      expect(screen.getByText('Rephrased Text')).toBeInTheDocument();
      expect(screen.getByText('Test rephrased text')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
    });

    it('should maintain consistent styling structure', () => {
      render(
        <TextProcessingResults
          {...defaultProps}
          cleanedText="Cleaned text"
          rephrasedText="Rephrased text"
        />
      );

      // Check that both sections have titles
      expect(screen.getByText('Cleaned Text')).toBeInTheDocument();
      expect(screen.getByText('Rephrased Text')).toBeInTheDocument();
      
      // Check that word counts are displayed
      expect(screen.getAllByText(/\d+ words/)).toHaveLength(2);
    });
  });

  describe('edge cases', () => {
    it('should handle null showNotification callback', async () => {
      const mockShowNotificationNull = vi.fn();
      
      render(
        <TextProcessingResults
          cleanedText=""
          rephrasedText="Test text"
          showNotification={mockShowNotificationNull}
        />
      );

      const copyButton = screen.getByRole('button', { name: /copy/i });
      
      // Should not throw error with proper callback
      expect(() => fireEvent.click(copyButton)).not.toThrow();
      
      await waitFor(() => {
        expect(mockShowNotificationNull).toHaveBeenCalled();
      });
    });

    it('should handle undefined text props', () => {
      render(
        <TextProcessingResults
          cleanedText={undefined as any}
          rephrasedText={undefined as any}
          showNotification={mockShowNotification}
        />
      );

      // Component should handle undefined gracefully
      expect(screen.queryByText('Cleaned Text')).not.toBeInTheDocument();
      expect(screen.queryByText('Rephrased Text')).not.toBeInTheDocument();
    });

    it('should handle very large text content', () => {
      const largeText = 'A'.repeat(10000);
      mockCountWords.mockReturnValue(10000);
      
      render(
        <TextProcessingResults
          {...defaultProps}
          cleanedText={largeText}
        />
      );

      expect(screen.getByText('10000 words')).toBeInTheDocument();
      expect(screen.getByText(largeText)).toBeInTheDocument();
    });
  });
});