use tauri::{AppHandle, Emitter, Listener, Manager};
use tauri_plugin_clipboard_manager::ClipboardExt;
use std::collections::HashMap;
use std::sync::Mutex;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use uuid::Uuid;
use std::path::PathBuf;
use std::fs;
use std::io;
use tokio::sync::RwLock;
use std::sync::Arc;
use std::env;

// Environment configuration
#[derive(Debug, Clone)]
pub struct EnvironmentConfig {
    pub environment: String,
    pub api_base_url: String,
    pub oauth_base_url: String,
    pub dev_url: String,
}

impl EnvironmentConfig {
    pub fn from_env() -> Self {
        let environment = env::var("NODE_ENV").unwrap_or_else(|_| "development".to_string());
        
        let (api_base_url, oauth_base_url, dev_url) = if environment == "production" {
            (
                env::var("VITE_PROD_API_BASE_URL").unwrap_or_else(|_| "https://clipify.space".to_string()),
                env::var("VITE_PROD_OAUTH_BASE_URL").unwrap_or_else(|_| "https://clipify.space/api/v1/auth/google/login".to_string()),
                env::var("VITE_PROD_BASE_URL").unwrap_or_else(|_| "https://clipify.space/".to_string()),
            )
        } else {
            (
                env::var("VITE_DEV_API_BASE_URL").unwrap_or_else(|_| "http://localhost:8080".to_string()),
                env::var("VITE_DEV_OAUTH_BASE_URL").unwrap_or_else(|_| "http://localhost:8080/api/v1/auth/google/login".to_string()),
                env::var("VITE_DEV_BASE_URL").unwrap_or_else(|_| "http://localhost:1420".to_string()),
            )
        };
        
        EnvironmentConfig {
            environment,
            api_base_url,
            oauth_base_url,
            dev_url,
        }
    }
}

// Application state for tracking windows
type WindowState = Mutex<HashMap<String, bool>>;

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
    pub preview: String, // First 100 chars for quick display
}

impl ClipboardEntry {
    pub fn new(content: String, is_cleaned: bool, original_content: Option<String>) -> Self {
        let id = Uuid::new_v4().to_string();
        let timestamp = Utc::now();
        let char_count = content.chars().count();
        let line_count = content.lines().count();
        let has_formatting = content.contains('\n') || content.contains('\t') || content.chars().any(|c| c.is_whitespace() && c != ' ');
        
        // Detect content type
        let content_type = if content.starts_with("http://") || content.starts_with("https://") {
            "url".to_string()
        } else if content.contains('@') && content.contains('.') && !content.contains('\n') {
            "email".to_string()
        } else if content.chars().all(|c| c.is_numeric() || c.is_whitespace() || "-+().".contains(c)) {
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
        self.content.to_lowercase().contains(&query_lower) ||
        self.content_type.to_lowercase().contains(&query_lower)
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
            self.entries.iter().filter(|entry| entry.matches_search(query)).collect()
        }
    }
    
    pub fn get_entry_by_id(&self, id: &str) -> Option<&ClipboardEntry> {
        self.entries.iter().find(|e| e.id == id)
    }
}

// Global clipboard history manager
type ClipboardHistoryState = Arc<RwLock<ClipboardHistory>>;

// Storage functions
fn get_history_file_path() -> io::Result<PathBuf> {
    let data_dir = dirs::data_dir()
        .ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, "Could not find data directory"))?;
    
    let clipify_dir = data_dir.join("Clipify");
    
    // Create directory if it doesn't exist
    if !clipify_dir.exists() {
        fs::create_dir_all(&clipify_dir)?;
    }
    
    Ok(clipify_dir.join("clipboard_history.json"))
}

fn save_history_to_file(history: &ClipboardHistory) -> io::Result<()> {
    let file_path = get_history_file_path()?;
    let json_data = serde_json::to_string_pretty(history)
        .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e))?;
    fs::write(file_path, json_data)
}

fn load_history_from_file() -> io::Result<ClipboardHistory> {
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

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn show_main_window(app: AppHandle) -> Result<(), String> {
    match app.get_webview_window("main") {
        Some(window) => {
            window.show().map_err(|e| e.to_string())?;
            window.set_focus().map_err(|e| e.to_string())?;
            window.unminimize().map_err(|e| e.to_string())?;
            Ok(())
        }
        None => Err("Main window not found".to_string())
    }
}

#[tauri::command]
fn hide_main_window(app: AppHandle) -> Result<(), String> {
    match app.get_webview_window("main") {
        Some(window) => {
            window.hide().map_err(|e| e.to_string())?;
            Ok(())
        }
        None => Err("Main window not found".to_string())
    }
}

#[tauri::command]
fn toggle_window_visibility(app: AppHandle) -> Result<(), String> {
    match app.get_webview_window("main") {
        Some(window) => {
            if window.is_visible().map_err(|e| e.to_string())? {
                window.hide().map_err(|e| e.to_string())?;
            } else {
                window.show().map_err(|e| e.to_string())?;
                window.set_focus().map_err(|e| e.to_string())?;
                window.unminimize().map_err(|e| e.to_string())?;
            }
            Ok(())
        }
        None => Err("Main window not found".to_string())
    }
}

// Clipboard History Commands
#[tauri::command]
async fn get_clipboard_history(history_state: tauri::State<'_, ClipboardHistoryState>) -> Result<Vec<ClipboardEntry>, String> {
    let history = history_state.read().await;
    Ok(history.get_entries().clone())
}

#[tauri::command]
async fn add_to_clipboard_history(
    content: String,
    is_cleaned: bool,
    original_content: Option<String>,
    history_state: tauri::State<'_, ClipboardHistoryState>
) -> Result<(), String> {
    let entry = ClipboardEntry::new(content, is_cleaned, original_content);
    
    {
        let mut history = history_state.write().await;
        history.add_entry(entry);
        
        // Save to file
        if let Err(e) = save_history_to_file(&*history) {
            eprintln!("Failed to save clipboard history: {}", e);
        }
    }
    
    Ok(())
}

#[tauri::command]
async fn remove_from_clipboard_history(
    id: String,
    history_state: tauri::State<'_, ClipboardHistoryState>
) -> Result<bool, String> {
    let removed = {
        let mut history = history_state.write().await;
        let removed = history.remove_entry(&id);
        
        // Save to file
        if let Err(e) = save_history_to_file(&*history) {
            eprintln!("Failed to save clipboard history: {}", e);
        }
        
        removed
    };
    
    Ok(removed)
}

#[tauri::command]
async fn clear_clipboard_history(history_state: tauri::State<'_, ClipboardHistoryState>) -> Result<(), String> {
    {
        let mut history = history_state.write().await;
        history.clear();
        
        // Save to file
        if let Err(e) = save_history_to_file(&*history) {
            eprintln!("Failed to save clipboard history: {}", e);
        }
    }
    
    Ok(())
}

#[tauri::command]
async fn search_clipboard_history(
    query: String,
    history_state: tauri::State<'_, ClipboardHistoryState>
) -> Result<Vec<ClipboardEntry>, String> {
    let history = history_state.read().await;
    let results = history.search(&query)
        .into_iter()
        .cloned()
        .collect();
    Ok(results)
}

#[tauri::command]
async fn get_clipboard_entry_by_id(
    id: String,
    history_state: tauri::State<'_, ClipboardHistoryState>
) -> Result<Option<ClipboardEntry>, String> {
    let history = history_state.read().await;
    Ok(history.get_entry_by_id(&id).cloned())
}

#[tauri::command]
async fn paste_from_history(
    id: String,
    app: AppHandle,
    history_state: tauri::State<'_, ClipboardHistoryState>
) -> Result<String, String> {
    let content = {
        let history = history_state.read().await;
        match history.get_entry_by_id(&id) {
            Some(entry) => entry.content.clone(),
            None => return Err("Entry not found".to_string())
        }
    };
    
    // Copy to clipboard
    if let Err(e) = app.clipboard().write_text(&content) {
        return Err(format!("Failed to copy to clipboard: {}", e));
    }
    
    Ok(content)
}

#[tauri::command]
fn check_accessibility_permissions() -> Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        
        // Try to check if we have accessibility permissions
        let output = Command::new("osascript")
            .arg("-e")
            .arg("tell application \"System Events\" to get name of first process")
            .output();
            
        match output {
            Ok(result) => {
                if result.status.success() {
                    Ok("Accessibility permissions are granted".to_string())
                } else {
                    let error = String::from_utf8_lossy(&result.stderr);
                    if error.contains("not allowed assistive") || error.contains("accessibility") {
                        Err("Accessibility permissions required. Please go to System Preferences > Security & Privacy > Privacy > Accessibility and add Clipify to the list of allowed applications.".to_string())
                    } else {
                        Err(format!("Permission check failed: {}", error))
                    }
                }
            }
            Err(e) => Err(format!("Failed to check permissions: {}", e))
        }
    }
    
    #[cfg(not(target_os = "macos"))]
    {
        Ok("Permission check not implemented for this platform".to_string())
    }
}

#[tauri::command]
fn quit_application(app: AppHandle) {
    app.exit(0);
}

// Function to clean and beautify text according to Clipify specifications
fn cleanup_text(text: &str) -> String {
    // Handle null, undefined, or empty text
    if text.is_empty() || text.trim().is_empty() {
        return String::new();
    }
    
    text
        // Convert all line endings to Unix format
        .replace("\r\n", "\n")  // Convert Windows line endings
        .replace("\r", "\n")    // Convert Mac line endings
        // Replace multiple spaces/tabs with single space
        .chars()
        .collect::<Vec<char>>()
        .windows(2)
        .fold(String::new(), |mut acc, window| {
            if window.len() == 2 {
                let current = window[0];
                let next = window[1];
                
                // Add current character if it's not a redundant space/tab
                if !(current == ' ' && (next == ' ' || next == '\t')) &&
                   !(current == '\t' && (next == ' ' || next == '\t')) {
                    acc.push(if current == '\t' { ' ' } else { current });
                }
            }
            acc
        })
        // Handle the last character
        .chars().chain(text.chars().last())
        .collect::<String>()
        // Replace multiple line breaks with double
        .split('\n')
        .map(|line| line.trim())
        .collect::<Vec<&str>>()
        .join("\n")
        // Limit to max 2 consecutive line breaks
        .split("\n\n\n")
        .collect::<Vec<&str>>()
        .join("\n\n")
        .trim()
        .to_string()
}

#[tauri::command]
async fn copy_selected_text_to_clipboard(
    app: AppHandle,
    history_state: tauri::State<'_, ClipboardHistoryState>
) -> Result<String, String> {
    // Get the currently selected text from the system clipboard
    // This simulates copying selected text by sending Cmd+C to the focused application
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        
        // Store current clipboard content to compare later
        let old_clipboard = app.clipboard().read_text().unwrap_or_default();
        
        // Try multiple AppleScript approaches for better compatibility
        let scripts = vec![
            "tell application \"System Events\" to keystroke \"c\" using command down",
            "tell application \"System Events\" to key code 8 using command down", // Alternative key code approach
        ];
        
        let mut copy_success = false;
        let mut last_error = String::new();
        
        for script in scripts {
            let output = Command::new("osascript")
                .arg("-e")
                .arg(script)
                .output();
                
            match output {
                Ok(result) => {
                    if result.status.success() {
                        copy_success = true;
                        break;
                    } else {
                        let error = String::from_utf8_lossy(&result.stderr);
                        last_error = format!("AppleScript error: {}", error);
                        println!("AppleScript failed: {}", error);
                    }
                }
                Err(e) => {
                    last_error = format!("Failed to execute AppleScript: {}", e);
                    println!("Command execution error: {}", e);
                }
            }
        }
        
        if !copy_success {
            return Err(format!("All copy attempts failed. Last error: {}. This might be due to missing accessibility permissions. Please grant accessibility permissions to Clipify in System Preferences > Security & Privacy > Privacy > Accessibility.", last_error));
        }
        
        // Wait for clipboard to be updated with multiple checks
        let mut attempts = 0;
        let max_attempts = 10; // Try for up to 1 second (10 * 100ms)
        let mut new_text = String::new();
        
        while attempts < max_attempts {
            std::thread::sleep(std::time::Duration::from_millis(100));
            
            match app.clipboard().read_text() {
                Ok(clipboard_content) => {
                    if clipboard_content != old_clipboard && !clipboard_content.is_empty() {
                        new_text = clipboard_content;
                        break;
                    }
                }
                Err(e) => {
                    println!("Clipboard read error on attempt {}: {}", attempts + 1, e);
                }
            }
            
            attempts += 1;
        }
        
        if new_text.is_empty() || new_text == old_clipboard {
            return Err("No new text was copied to clipboard. Please ensure text is selected before using the shortcut.".to_string());
        }
        
        // Clean the text according to Clipify specifications
        let cleaned_text = cleanup_text(&new_text);
        
        // Check if cleaned text is empty and return early if so
        if cleaned_text.is_empty() {
            // Emit an event to notify the frontend about empty text
            if let Err(e) = app.emit("clipboard-updated", "") {
                println!("Failed to emit clipboard update event for empty text: {}", e);
            }
            return Ok("".to_string());
        }
        
        // Write cleaned text back to clipboard
        if let Err(e) = app.clipboard().write_text(&cleaned_text) {
            return Err(format!("Failed to write cleaned text to clipboard: {}", e));
        }
        
        // Add to clipboard history
        let original_entry = ClipboardEntry::new(new_text.clone(), false, None);
        let cleaned_entry = ClipboardEntry::new(cleaned_text.clone(), true, Some(new_text.clone()));
        
        {
            let mut history = history_state.write().await;
            // Add both original and cleaned entries to history
            history.add_entry(cleaned_entry);
            if new_text != cleaned_text {
                history.add_entry(original_entry);
            }
            
            // Save to file
            if let Err(e) = save_history_to_file(&*history) {
                eprintln!("Failed to save clipboard history: {}", e);
            }
        }
        
        // Emit an event to notify the frontend
        if let Err(e) = app.emit("clipboard-updated", &cleaned_text) {
            println!("Failed to emit clipboard update event: {}", e);
        }
        
        Ok(cleaned_text)
    }
    
    #[cfg(not(target_os = "macos"))]
    {
        // For other platforms, we'll need to implement platform-specific solutions
        // For now, just return an error
        Err("Global shortcut copy is currently only supported on macOS".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    use tauri::{menu::MenuBuilder, tray::TrayIconBuilder};
    
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_http::init())
        // .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new()
            .with_handler(|app, shortcut, event| {
                println!("Global shortcut triggered: {shortcut:?} with event {event:?}");
                let app_handle = app.clone();
                tauri::async_runtime::spawn(async move {
                    let history_state = app_handle.state::<ClipboardHistoryState>();
                    match copy_selected_text_to_clipboard(app_handle.clone(), history_state).await {
                        Ok(text) => {
                            println!("Successfully copied to clipboard: {}", text);
                            // Send notification
                            if let Err(e) = tauri_plugin_notification::NotificationExt::notification(&app_handle)
                                .builder()
                                .title("Text Copied!")
                                .body(&format!("Cleaned text: {}", 
                                    if text.len() > 50 { 
                                        format!("{}...", &text[..50]) 
                                    } else { 
                                        text 
                                    }
                                ))
                                .show() {
                                eprintln!("Failed to show notification: {}", e);
                            }
                        },
                        Err(e) => {
                            eprintln!("Error copying to clipboard: {}", e);
                        }
                    }
                });
            })
            .build())
        .setup(|app| {
            use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut, GlobalShortcutExt};
            // use tauri_plugin_deep_link::DeepLinkExt;
            
            // Register deep link handler for OAuth callbacks
            // app.deep_link().register("clipify")?;
            
            // Set up deep link event listener
            let app_handle = app.handle().clone();
            app.listen_any("deep-link://new-url", move |event| {
                let url = event.payload();
                println!("Deep link received: {}", url);
                
                // Emit the deep link event to the frontend
                if let Err(e) = app_handle.emit("deep-link", url) {
                    eprintln!("Failed to emit deep link event: {}", e);
                }
                
                // Show and focus the main window when deep link is received
                if let Some(window) = app_handle.get_webview_window("main") {
                    if let Err(e) = window.show() {
                        eprintln!("Failed to show window: {}", e);
                    }
                    if let Err(e) = window.set_focus() {
                        eprintln!("Failed to focus window: {}", e);
                    }
                    if let Err(e) = window.unminimize() {
                        eprintln!("Failed to unminimize window: {}", e);
                    }
                }
            });
            
            // Initialize clipboard history
            let history = load_history_from_file().unwrap_or_else(|e| {
                eprintln!("Failed to load clipboard history: {}", e);
                ClipboardHistory::new(10)
            });
            let history_state = Arc::new(RwLock::new(history));
            app.manage(history_state.clone());
            
            // Register the global shortcut
            let shortcut = Shortcut::new(Some(Modifiers::SUPER | Modifiers::SHIFT), Code::KeyC);
            app.global_shortcut().register(shortcut)
                .map_err(|e| format!("Failed to register global shortcut: {}", e))?;
            
            println!("Global shortcut Cmd+Shift+C registered successfully!");
            
            // Create system tray menu
            let show_hide = tauri::menu::MenuItem::with_id(app, "show_hide", "Show/Hide Clipify", true, None::<&str>)?;
            let separator1 = tauri::menu::PredefinedMenuItem::separator(app)?;
            let cleanup_clipboard = tauri::menu::MenuItem::with_id(app, "cleanup_clipboard", "🧹 Cleanup Clipboard", true, None::<&str>)?;
            let trigger_shortcut = tauri::menu::MenuItem::with_id(app, "trigger_shortcut", "⌨️ Trigger Shortcut (Cmd+Shift+C)", true, None::<&str>)?;
            let separator2 = tauri::menu::PredefinedMenuItem::separator(app)?;
            let settings = tauri::menu::MenuItem::with_id(app, "settings", "⚙️ Settings", true, None::<&str>)?;
            let about = tauri::menu::MenuItem::with_id(app, "about", "ℹ️ About Clipify", true, None::<&str>)?;
            let separator3 = tauri::menu::PredefinedMenuItem::separator(app)?;
            let quit = tauri::menu::MenuItem::with_id(app, "quit", "🚪 Quit", true, None::<&str>)?;
            
            let menu = MenuBuilder::new(app)
                .item(&show_hide)
                .item(&separator1)
                .item(&cleanup_clipboard)
                .item(&trigger_shortcut)
                .item(&separator2)
                .item(&settings)
                .item(&about)
                .item(&separator3)
                .item(&quit)
                .build()?;
            
            // Create system tray
            let _tray = TrayIconBuilder::with_id("clipify-tray")
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .tooltip("Clipify - Professional Text Cleanup Tool")
                .on_menu_event(move |app, event| {
                    match event.id().as_ref() {
                        "show_hide" => {
                            if let Err(e) = toggle_window_visibility(app.clone()) {
                                eprintln!("Error toggling window: {}", e);
                            }
                        }
                        "cleanup_clipboard" => {
                            let app_handle = app.clone();
                            tauri::async_runtime::spawn(async move {
                                let history_state = app_handle.state::<ClipboardHistoryState>();
                                if let Err(e) = copy_selected_text_to_clipboard(app_handle.clone(), history_state).await {
                                    eprintln!("Error cleaning clipboard: {}", e);
                                }
                            });
                        }
                        "trigger_shortcut" => {
                            let app_handle = app.clone();
                            tauri::async_runtime::spawn(async move {
                                let history_state = app_handle.state::<ClipboardHistoryState>();
                                if let Err(e) = copy_selected_text_to_clipboard(app_handle.clone(), history_state).await {
                                    eprintln!("Error triggering shortcut: {}", e);
                                }
                            });
                        }
                        "settings" => {
                            if let Err(e) = show_main_window(app.clone()) {
                                eprintln!("Error showing window for settings: {}", e);
                            }
                        }
                        "about" => {
                            if let Err(e) = tauri_plugin_notification::NotificationExt::notification(app)
                                .builder()
                                .title("About Clipify")
                                .body("Clipify v0.1.0\nProfessional Text Cleanup Tool\nMaking your text clean and professional, one copy at a time ✨")
                                .show() {
                                eprintln!("Failed to show about notification: {}", e);
                            }
                        }
                        "quit" => {
                            quit_application(app.clone());
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    match event {
                        tauri::tray::TrayIconEvent::Click { button, button_state, .. } => {
                            match button {
                                tauri::tray::MouseButton::Left => {
                                    if button_state == tauri::tray::MouseButtonState::Up {
                                        if let Err(e) = toggle_window_visibility(tray.app_handle().clone()) {
                                            eprintln!("Error toggling window from tray click: {}", e);
                                        }
                                    }
                                }
                                _ => {}
                            }
                        }
                        _ => {}
                    }
                })
                .build(app)?;
            
            Ok(())
        })
        .on_window_event(|window, event| {
            match event {
                tauri::WindowEvent::CloseRequested { api, .. } => {
                    // Prevent closing and hide window instead
                    api.prevent_close();
                    if let Err(e) = window.hide() {
                        eprintln!("Error hiding window: {}", e);
                    }
                }
                _ => {}
            }
        })
        .manage(WindowState::default())
        .invoke_handler(tauri::generate_handler![
            copy_selected_text_to_clipboard,
            show_main_window,
            hide_main_window,
            toggle_window_visibility,
            quit_application,
            check_accessibility_permissions,
            get_clipboard_history,
            add_to_clipboard_history,
            remove_from_clipboard_history,
            clear_clipboard_history,
            search_clipboard_history,
            get_clipboard_entry_by_id,
            paste_from_history
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}