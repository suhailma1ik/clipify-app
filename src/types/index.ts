// Types for clipboard history
export interface ClipboardEntry {
  id: string;
  content: string;
  original_content: string;
  is_cleaned: boolean;
  timestamp: string;
  char_count: number;
  line_count: number;
  has_formatting: boolean;
  content_type: string;
  preview: string;
}

// Props types for components
export interface StatusCardProps {
  trayStatus: string;
  permissionStatus: string;
  onHideToTray: () => void;
  onToggleWindowVisibility: () => void;
  onCheckPermissions: () => void;
}

export interface GlobalShortcutProps {
  shortcutStatus: string;
}

export interface ManualTextCleanupProps {
  originalText: string;
  cleanedText: string;
  isProcessing: boolean;
  onOriginalTextChange: (text: string) => void;
  onProcessClipboardText: () => void;
  onCopyCleanedText: () => void;
}

export interface LiveClipboardProps {
  clipboard: string;
  onRefreshClipboard: () => void;
}

export interface ClipboardHistoryProps {
  clipboardHistory: ClipboardEntry[];
  searchQuery: string;
  filteredHistory: ClipboardEntry[];
  selectedEntry: ClipboardEntry | null;
  showHistory: boolean;
  onSearchQueryChange: (query: string) => void;
  onSelectEntry: (entry: ClipboardEntry | null) => void;
  onToggleHistory: () => void;
  onDeleteEntry: (id: string) => void;
  onClearAllHistory: () => void;
  onRefreshHistory: () => void;
  onPasteFromHistory: (id: string) => void;
}