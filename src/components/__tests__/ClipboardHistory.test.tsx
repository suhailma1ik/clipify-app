import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ClipboardHistory from '../ClipboardHistory';
import { ClipboardEntry } from '../../types';

// Mock utility functions
vi.mock('../../utils', () => ({
  formatTimestamp: vi.fn((timestamp: string) => `Formatted: ${timestamp}`),
  getContentTypeIcon: vi.fn((contentType: string) => `Icon: ${contentType}`),
}));

const mockFormatTimestamp = vi.mocked(await import('../../utils')).formatTimestamp;
const mockGetContentTypeIcon = vi.mocked(await import('../../utils')).getContentTypeIcon;

const mockClipboardEntry: ClipboardEntry = {
  id: '1',
  content: 'Test clipboard content',
  original_content: 'Original test content',
  is_cleaned: true,
  timestamp: '2023-01-01T12:00:00Z',
  char_count: 20,
  line_count: 1,
  has_formatting: false,
  content_type: 'text',
  preview: 'Test clipboard content',
};

const mockClipboardEntry2: ClipboardEntry = {
  id: '2',
  content: 'Another clipboard entry',
  original_content: 'Another clipboard entry',
  is_cleaned: false,
  timestamp: '2023-01-01T11:00:00Z',
  char_count: 23,
  line_count: 1,
  has_formatting: true,
  content_type: 'rich_text',
  preview: 'Another clipboard entry',
};

const defaultProps = {
  clipboardHistory: [mockClipboardEntry, mockClipboardEntry2],
  searchQuery: '',
  filteredHistory: [mockClipboardEntry, mockClipboardEntry2],
  selectedEntry: null,
  onSearchQueryChange: vi.fn(),
  onSelectEntry: vi.fn(),
  onDeleteEntry: vi.fn(),
  onClearAllHistory: vi.fn(),
  onRefreshHistory: vi.fn(),
  onPasteFromHistory: vi.fn(),
};

describe('ClipboardHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFormatTimestamp.mockImplementation((timestamp: string) => `Formatted: ${timestamp}`);
    mockGetContentTypeIcon.mockImplementation((contentType: string) => `Icon: ${contentType}`);
  });

  describe('rendering', () => {
    it('should render clipboard history header', () => {
      render(<ClipboardHistory {...defaultProps} />);
      
      expect(screen.getByText('📋 Clipboard History')).toBeInTheDocument();
    });

    it('should render search input', () => {
      render(<ClipboardHistory {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('🔍 Search clipboard history...');
      expect(searchInput).toBeInTheDocument();
    });

    it('should render clipboard entries', () => {
      render(<ClipboardHistory {...defaultProps} />);
      
      expect(screen.getByText('Test clipboard content')).toBeInTheDocument();
      expect(screen.getByText('Another clipboard entry')).toBeInTheDocument();
    });

    it('should render entry metadata', () => {
      render(<ClipboardHistory {...defaultProps} />);
      
      expect(screen.getByText('20 chars')).toBeInTheDocument();
      expect(screen.getByText('23 chars')).toBeInTheDocument();
    });

    it('should show cleaned badge for cleaned entries', () => {
      render(<ClipboardHistory {...defaultProps} />);
      
      expect(screen.getByText('✨ CLEANED')).toBeInTheDocument();
    });

    it('should render paste buttons for each entry', () => {
      render(<ClipboardHistory {...defaultProps} />);
      
      const pasteButtons = screen.getAllByText('📋');
      expect(pasteButtons.length).toBeGreaterThan(0);
    });
  });

  describe('search functionality', () => {
    it('should call onSearchQueryChange when search input changes', () => {
      render(<ClipboardHistory {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('🔍 Search clipboard history...');
      fireEvent.change(searchInput, { target: { value: 'test query' } });
      
      expect(defaultProps.onSearchQueryChange).toHaveBeenCalledWith('test query');
    });

    it('should display search query in input', () => {
      const propsWithSearch = {
        ...defaultProps,
        searchQuery: 'test search',
      };
      render(<ClipboardHistory {...propsWithSearch} />);
      
      const searchInput = screen.getByPlaceholderText('🔍 Search clipboard history...');
      expect(searchInput).toHaveValue('test search');
    });

    it('should render filtered results', () => {
      const filteredProps = {
        ...defaultProps,
        filteredHistory: [mockClipboardEntry],
      };
      render(<ClipboardHistory {...filteredProps} />);
      
      expect(screen.getByText('Test clipboard content')).toBeInTheDocument();
      expect(screen.queryByText('Another clipboard entry')).not.toBeInTheDocument();
    });
  });

  describe('entry selection', () => {
    it('should call onSelectEntry when entry is clicked', () => {
      render(<ClipboardHistory {...defaultProps} />);
      
      const entryElement = screen.getByText('Test clipboard content');
      fireEvent.click(entryElement);
      
      expect(defaultProps.onSelectEntry).toHaveBeenCalledWith(mockClipboardEntry);
    });

    it('should show detailed view when entry is selected', () => {
      const propsWithSelection = {
        ...defaultProps,
        selectedEntry: mockClipboardEntry,
      };
      render(<ClipboardHistory {...propsWithSelection} />);
      
      // Should show detailed view
      expect(screen.getByText('📄 Current Content')).toBeInTheDocument();
      expect(screen.getByText('📝 Original Content')).toBeInTheDocument();
    });

    it('should show placeholder when no entry is selected', () => {
      render(<ClipboardHistory {...defaultProps} />);
      
      expect(screen.getByText(/Click on any clipboard history item/)).toBeInTheDocument();
    });
  });

  describe('entry actions', () => {
    it('should call onPasteFromHistory when paste button is clicked', () => {
      render(<ClipboardHistory {...defaultProps} />);
      
      const pasteButtons = screen.getAllByText('📋');
      fireEvent.click(pasteButtons[0]);
      
      expect(defaultProps.onPasteFromHistory).toHaveBeenCalledWith('1');
    });

    it('should call onDeleteEntry when delete button is clicked in detail view', () => {
      const propsWithSelection = {
        ...defaultProps,
        selectedEntry: mockClipboardEntry,
      };
      render(<ClipboardHistory {...propsWithSelection} />);
      
      const deleteButton = screen.getByText('🗑️ Delete');
      fireEvent.click(deleteButton);
      
      expect(defaultProps.onDeleteEntry).toHaveBeenCalledWith('1');
    });

    it('should call onRefreshHistory when refresh button is clicked', () => {
      render(<ClipboardHistory {...defaultProps} />);
      
      const refreshButton = screen.getByText('🔄 Refresh');
      fireEvent.click(refreshButton);
      
      expect(defaultProps.onRefreshHistory).toHaveBeenCalled();
    });

    it('should call onClearAllHistory when clear all button is clicked', () => {
      render(<ClipboardHistory {...defaultProps} />);
      
      const clearButton = screen.getByText('🗑️ Clear All');
      fireEvent.click(clearButton);
      
      expect(defaultProps.onClearAllHistory).toHaveBeenCalled();
    });
  });

  describe('statistics display', () => {
    it('should show total entries count', () => {
      render(<ClipboardHistory {...defaultProps} />);
      
      expect(screen.getByText(/2 of 2 entries/)).toBeInTheDocument();
    });

    it('should show filtered entries count when searching', () => {
      const filteredProps = {
        ...defaultProps,
        searchQuery: 'test',
        filteredHistory: [mockClipboardEntry],
      };
      render(<ClipboardHistory {...filteredProps} />);
      
      expect(screen.getByText(/1 of 2 entries/)).toBeInTheDocument();
      expect(screen.getByText(/Searching for.*test/)).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle empty clipboard history', () => {
      const emptyProps = {
        ...defaultProps,
        clipboardHistory: [],
        filteredHistory: [],
      };
      render(<ClipboardHistory {...emptyProps} />);
      
      expect(screen.getByText(/0 of 0 entries/)).toBeInTheDocument();
    });

    it('should handle very long content', () => {
      const longContentEntry: ClipboardEntry = {
        ...mockClipboardEntry,
        content: 'A'.repeat(1000),
        preview: 'A'.repeat(100) + '...',
        char_count: 1000,
      };
      const longContentProps = {
        ...defaultProps,
        clipboardHistory: [longContentEntry],
        filteredHistory: [longContentEntry],
      };
      render(<ClipboardHistory {...longContentProps} />);
      
      expect(screen.getByText('1000 chars')).toBeInTheDocument();
    });

    it('should handle entries with special characters', () => {
      const specialEntry: ClipboardEntry = {
        ...mockClipboardEntry,
        content: 'Special chars: !@#$%',
        preview: 'Special chars: !@#$%',
      };
      const specialProps = {
        ...defaultProps,
        clipboardHistory: [specialEntry],
        filteredHistory: [specialEntry],
      };
      render(<ClipboardHistory {...specialProps} />);
      
      expect(screen.getByText('Special chars: !@#$%')).toBeInTheDocument();
    });

    it('should handle entries with multiple lines', () => {
      const multilineEntry: ClipboardEntry = {
        ...mockClipboardEntry,
        content: 'Multiline content',
        line_count: 3,
        preview: 'Multiline content',
      };
      const multilineProps = {
        ...defaultProps,
        clipboardHistory: [multilineEntry],
        filteredHistory: [multilineEntry],
      };
      render(<ClipboardHistory {...multilineProps} />);
      
      expect(screen.getByText('Multiline content')).toBeInTheDocument();
    });
  });

  describe('utility function integration', () => {
    it('should call formatTimestamp for entry timestamps', () => {
      render(<ClipboardHistory {...defaultProps} />);
      
      expect(mockFormatTimestamp).toHaveBeenCalledWith('2023-01-01T12:00:00Z');
      expect(mockFormatTimestamp).toHaveBeenCalledWith('2023-01-01T11:00:00Z');
    });

    it('should call getContentTypeIcon for entry content types', () => {
      render(<ClipboardHistory {...defaultProps} />);
      
      expect(mockGetContentTypeIcon).toHaveBeenCalledWith('text');
      expect(mockGetContentTypeIcon).toHaveBeenCalledWith('rich_text');
    });
  });
});