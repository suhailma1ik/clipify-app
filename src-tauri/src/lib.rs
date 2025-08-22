use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_clipboard_manager::ClipboardExt;
use std::collections::HashMap;
use std::sync::Mutex;

// Application state for tracking windows
type WindowState = Mutex<HashMap<String, bool>>;

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
    if text.is_empty() {
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
async fn copy_selected_text_to_clipboard(app: AppHandle) -> Result<String, String> {
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
        
        if cleaned_text.is_empty() {
            return Err("Copied text is empty after cleaning".to_string());
        }
        
        // Write cleaned text back to clipboard
        if let Err(e) = app.clipboard().write_text(&cleaned_text) {
            return Err(format!("Failed to write cleaned text to clipboard: {}", e));
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
        .plugin(tauri_plugin_global_shortcut::Builder::new()
            .with_handler(|app, shortcut, event| {
                println!("Global shortcut triggered: {shortcut:?} with event {event:?}");
                let app_handle = app.clone();
                tauri::async_runtime::spawn(async move {
                    match copy_selected_text_to_clipboard(app_handle.clone()).await {
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
                                if let Err(e) = copy_selected_text_to_clipboard(app_handle).await {
                                    eprintln!("Error cleaning clipboard: {}", e);
                                }
                            });
                        }
                        "trigger_shortcut" => {
                            let app_handle = app.clone();
                            tauri::async_runtime::spawn(async move {
                                if let Err(e) = copy_selected_text_to_clipboard(app_handle).await {
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
            check_accessibility_permissions
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}


