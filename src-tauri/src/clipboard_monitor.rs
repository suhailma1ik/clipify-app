use crate::clipboard::{ClipboardEntry, ClipboardHistoryState, save_history_to_file};
use clipboard::{ClipboardContext, ClipboardProvider};
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::RwLock;
use tokio::time::{interval, sleep};

#[derive(Debug, Clone)]
pub struct ClipboardMonitor {
    app_handle: AppHandle,
    history_state: ClipboardHistoryState,
    last_content: Arc<RwLock<String>>,
    is_running: Arc<RwLock<bool>>,
}

impl ClipboardMonitor {
    pub fn new(app_handle: AppHandle, history_state: ClipboardHistoryState) -> Self {
        Self {
            app_handle,
            history_state,
            last_content: Arc::new(RwLock::new(String::new())),
            is_running: Arc::new(RwLock::new(false)),
        }
    }

    pub async fn start(&self) -> Result<(), String> {
        let mut is_running = self.is_running.write().await;
        if *is_running {
            return Ok(()); // Already running
        }
        *is_running = true;
        drop(is_running);

        println!("[ClipboardMonitor] Starting continuous clipboard monitoring...");
        
        let monitor = self.clone();
        tokio::spawn(async move {
            monitor.monitor_loop().await;
        });

        Ok(())
    }

    pub async fn stop(&self) {
        let mut is_running = self.is_running.write().await;
        *is_running = false;
        println!("[ClipboardMonitor] Stopping clipboard monitoring...");
    }

    async fn monitor_loop(&self) {
        let mut interval = interval(Duration::from_millis(500)); // Check every 500ms
        
        loop {
            interval.tick().await;
            
            // Check if we should stop
            {
                let is_running = self.is_running.read().await;
                if !*is_running {
                    break;
                }
            }

            if let Err(e) = self.check_clipboard_change().await {
                eprintln!("[ClipboardMonitor] Error checking clipboard: {}", e);
                // Wait a bit longer on error to avoid spam
                sleep(Duration::from_secs(2)).await;
            }
        }
        
        println!("[ClipboardMonitor] Monitor loop stopped");
    }

    async fn check_clipboard_change(&self) -> Result<(), String> {
        // Get current clipboard content
        let current_content = match self.get_clipboard_content() {
            Ok(content) => content,
            Err(_) => return Ok(()), // Ignore clipboard read errors
        };

        // Skip empty content
        if current_content.trim().is_empty() {
            return Ok(());
        }

        // Check if content has changed
        let mut last_content = self.last_content.write().await;
        if *last_content == current_content {
            return Ok(()); // No change
        }

        println!("[ClipboardMonitor] Clipboard content changed, length: {}", current_content.len());
        
        // Update last content
        *last_content = current_content.clone();
        drop(last_content);

        // Add to history
        self.add_to_history(current_content.clone()).await?;

        // Emit event to frontend
        if let Err(e) = self.app_handle.emit("clipboard-content-changed", &current_content) {
            eprintln!("[ClipboardMonitor] Failed to emit clipboard change event: {}", e);
        }

        // Update system tray
        self.update_tray_menu().await?;

        Ok(())
    }

    fn get_clipboard_content(&self) -> Result<String, String> {
        let mut ctx: ClipboardContext = ClipboardProvider::new()
            .map_err(|e| format!("Failed to create clipboard context: {}", e))?;
        
        ctx.get_contents()
            .map_err(|e| format!("Failed to get clipboard contents: {}", e))
    }

    async fn add_to_history(&self, content: String) -> Result<(), String> {
        let entry = ClipboardEntry::new(content, false, None);
        
        {
            let mut history = self.history_state.write().await;
            history.add_entry(entry);
            
            // Save to file
            if let Err(e) = save_history_to_file(&*history) {
                eprintln!("[ClipboardMonitor] Failed to save clipboard history: {}", e);
            }
        }

        Ok(())
    }

    async fn update_tray_menu(&self) -> Result<(), String> {
        let app_handle = &self.app_handle;
        let mut menu_builder = tauri::menu::MenuBuilder::new(app_handle);

        // Get recent clipboard entries (up to 10)
        let history = self.history_state.read().await;
        let recent_entries = history.get_entries().iter().take(10).collect::<Vec<_>>();
        
        // Add recent clipboard items to menu if any exist
        if !recent_entries.is_empty() {
            for (index, entry) in recent_entries.iter().enumerate() {
                let preview = if entry.preview.len() > 50 {
                    format!("{}...", &entry.preview[..47])
                } else {
                    entry.preview.clone()
                };
                
                let menu_text = format!("📋 {}", preview.replace('\n', " ").replace('\t', " "));
                let menu_item = tauri::menu::MenuItem::with_id(
                    app_handle, 
                    &format!("clipboard_item_{}", entry.id), 
                    &menu_text, 
                    true, 
                    None::<&str>
                ).map_err(|e| format!("Failed to create clipboard item: {}", e))?;
                
                menu_builder = menu_builder.item(&menu_item);
            }
            
            // Add separator after clipboard items
            let history_separator = tauri::menu::PredefinedMenuItem::separator(app_handle)
                .map_err(|e| format!("Failed to create history separator: {}", e))?;
            menu_builder = menu_builder.item(&history_separator);
        }
        
        // Create standard menu items
        let show_hide = tauri::menu::MenuItem::with_id(&self.app_handle, "show_hide", "Show/Hide Clipify", true, None::<&str>)
            .map_err(|e| format!("Failed to create show/hide item: {}", e))?;
        let separator1 = tauri::menu::PredefinedMenuItem::separator(&self.app_handle)
            .map_err(|e| format!("Failed to create separator: {}", e))?;
        let cleanup_clipboard = tauri::menu::MenuItem::with_id(&self.app_handle, "cleanup_clipboard", "🧹 Cleanup Clipboard", true, None::<&str>)
            .map_err(|e| format!("Failed to create cleanup item: {}", e))?;
        
        #[cfg(target_os = "macos")]
        let trigger_label = "⌨️ Clean Clipboard (Cmd+Shift+C)";
        #[cfg(not(target_os = "macos"))]
        let trigger_label = "⌨️ Clean Clipboard (Ctrl+Shift+C)";
        
        let trigger_shortcut = tauri::menu::MenuItem::with_id(app_handle, "trigger_shortcut", trigger_label, true, None::<&str>)
            .map_err(|e| format!("Failed to create trigger item: {}", e))?;
        let separator2 = tauri::menu::PredefinedMenuItem::separator(app_handle)
            .map_err(|e| format!("Failed to create separator: {}", e))?;
        let clear_history = tauri::menu::MenuItem::with_id(app_handle, "clear_history", "🗑️ Clear History", true, None::<&str>)
            .map_err(|e| format!("Failed to create clear history item: {}", e))?;
        let separator3 = tauri::menu::PredefinedMenuItem::separator(app_handle)
            .map_err(|e| format!("Failed to create separator: {}", e))?;
        let settings = tauri::menu::MenuItem::with_id(app_handle, "settings", "⚙️ Settings", true, None::<&str>)
            .map_err(|e| format!("Failed to create settings item: {}", e))?;
        let about = tauri::menu::MenuItem::with_id(app_handle, "about", "ℹ️ About Clipify", true, None::<&str>)
            .map_err(|e| format!("Failed to create about item: {}", e))?;
        let separator4 = tauri::menu::PredefinedMenuItem::separator(app_handle)
             .map_err(|e| format!("Failed to create separator: {}", e))?;
        let quit = tauri::menu::MenuItem::with_id(app_handle, "quit", "🚪 Quit", true, None::<&str>)
            .map_err(|e| format!("Failed to create quit item: {}", e))?;

        let menu = menu_builder
            .item(&show_hide)
            .item(&separator1)
            .item(&cleanup_clipboard)
            .item(&trigger_shortcut)
            .item(&separator2)
            .item(&clear_history)
            .item(&separator3)
            .item(&settings)
            .item(&about)
            .item(&separator4)
            .item(&quit)
            .build()
            .map_err(|e| format!("Failed to build menu: {}", e))?;

        // Update the tray icon with new menu
        if let Some(tray) = app_handle.tray_by_id("clipify-tray") {
            tray.set_menu(Some(menu))
                .map_err(|e| format!("Failed to update tray menu: {}", e))?;
        }

        Ok(())
    }
}

// Global clipboard monitor state
pub type ClipboardMonitorState = Arc<RwLock<Option<ClipboardMonitor>>>;