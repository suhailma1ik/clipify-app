use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

// Application state for tracking windows
pub type WindowState = Mutex<HashMap<String, bool>>;

#[tauri::command]
pub fn show_main_window(app: AppHandle) -> Result<(), String> {
    match app.get_webview_window("main") {
        Some(window) => {
            window.show().map_err(|e| e.to_string())?;
            window.set_focus().map_err(|e| e.to_string())?;
            window.unminimize().map_err(|e| e.to_string())?;
            Ok(())
        }
        None => Err("Main window not found".to_string()),
    }
}

#[tauri::command]
pub fn hide_main_window(app: AppHandle) -> Result<(), String> {
    match app.get_webview_window("main") {
        Some(window) => {
            window.hide().map_err(|e| e.to_string())?;
            Ok(())
        }
        None => Err("Main window not found".to_string()),
    }
}

#[tauri::command]
pub fn toggle_window_visibility(app: AppHandle) -> Result<(), String> {
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
        None => Err("Main window not found".to_string()),
    }
}
