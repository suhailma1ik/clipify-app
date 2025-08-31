use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fs;
use std::io;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;

// Clipboard history data structures
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClipboardEntry {
    pub id: String,
    pub content: String,
    pub original_content: String,
    pub is_cleaned: bool,
    pub timestamp: DateTime<Utc>,
    pub char_count: usize,
    pub line_count: usize,
    pub has_formatting: bool,
    pub content_type: String, // "text", "url", "email", etc.
    pub preview: String,      // First 100 chars for quick display
}

impl ClipboardEntry {
    pub fn new(content: String, is_cleaned: bool, original_content: Option<String>) -> Self {
        let id = Uuid::new_v4().to_string();
        let timestamp = Utc::now();
        let char_count = content.chars().count();
        let line_count = content.lines().count();
        let has_formatting = content.contains('\n')
            || content.contains('\t')
            || content.chars().any(|c| c.is_whitespace() && c != ' ');

        // Detect content type
        let content_type = if content.starts_with("http://") || content.starts_with("https://") {
            "url".to_string()
        } else if content.contains('@') && content.contains('.') && !content.contains('\n') {
            "email".to_string()
        } else if content
            .chars()
            .all(|c| c.is_numeric() || c.is_whitespace() || "-+().".contains(c))
        {
            "phone".to_string()
        } else {
            "text".to_string()
        };

        // Create preview (first 100 chars)
        let preview = if content.len() > 100 {
            format!("{}...", &content[..97])
        } else {
            content.clone()
        };

        ClipboardEntry {
            id,
            content: content.clone(),
            original_content: original_content.unwrap_or_else(|| content.clone()),
            is_cleaned,
            timestamp,
            char_count,
            line_count,
            has_formatting,
            content_type,
            preview,
        }
    }

    pub fn matches_search(&self, query: &str) -> bool {
        let query_lower = query.to_lowercase();
        self.content.to_lowercase().contains(&query_lower)
            || self.content_type.to_lowercase().contains(&query_lower)
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ClipboardHistory {
    pub entries: Vec<ClipboardEntry>,
    pub max_entries: usize,
}

impl ClipboardHistory {
    pub fn new(max_entries: usize) -> Self {
        ClipboardHistory {
            entries: Vec::new(),
            max_entries,
        }
    }

    pub fn add_entry(&mut self, entry: ClipboardEntry) {
        // Remove duplicate if content already exists
        self.entries.retain(|e| e.content != entry.content);

        // Add new entry at the beginning (most recent first)
        self.entries.insert(0, entry);

        // Maintain max entries limit
        if self.entries.len() > self.max_entries {
            self.entries.truncate(self.max_entries);
        }
    }

    pub fn remove_entry(&mut self, id: &str) -> bool {
        let original_len = self.entries.len();
        self.entries.retain(|e| e.id != id);
        self.entries.len() != original_len
    }

    pub fn clear(&mut self) {
        self.entries.clear();
    }

    pub fn get_entries(&self) -> &Vec<ClipboardEntry> {
        &self.entries
    }

    pub fn search(&self, query: &str) -> Vec<&ClipboardEntry> {
        if query.is_empty() {
            self.entries.iter().collect()
        } else {
            self.entries
                .iter()
                .filter(|entry| entry.matches_search(query))
                .collect()
        }
    }

    pub fn get_entry_by_id(&self, id: &str) -> Option<&ClipboardEntry> {
        self.entries.iter().find(|e| e.id == id)
    }
}

// Global clipboard history manager
pub type ClipboardHistoryState = Arc<RwLock<ClipboardHistory>>;

// Storage functions
pub fn get_history_file_path() -> io::Result<PathBuf> {
    let data_dir = dirs::data_dir()
        .ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, "Could not find data directory"))?;

    // Use the proper Tauri app data directory
    let clipify_dir = data_dir.join("com.suhailmalik.clipify");

    // Create directory if it doesn't exist
    if !clipify_dir.exists() {
        fs::create_dir_all(&clipify_dir)?;
    }

    Ok(clipify_dir.join("clipboard_history.json"))
}

pub fn save_history_to_file(history: &ClipboardHistory) -> io::Result<()> {
    let file_path = get_history_file_path()?;
    let json_data = serde_json::to_string_pretty(history)
        .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e))?;
    fs::write(file_path, json_data)
}

pub fn load_history_from_file() -> io::Result<ClipboardHistory> {
    let file_path = get_history_file_path()?;

    if !file_path.exists() {
        return Ok(ClipboardHistory::new(10)); // Default max 10 entries
    }

    let json_data = fs::read_to_string(file_path)?;
    let mut history: ClipboardHistory = serde_json::from_str(&json_data)
        .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e))?;

    // Ensure max_entries is set to 10 if not present in old files
    if history.max_entries == 0 {
        history.max_entries = 10;
    }

    Ok(history)
}
