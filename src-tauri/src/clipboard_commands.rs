use crate::clipboard::{save_history_to_file, ClipboardEntry, ClipboardHistoryState};
use crate::config::RephraseResponse;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_clipboard_manager::ClipboardExt;

// Clipboard History Commands
#[tauri::command]
pub async fn get_clipboard_history(
    history_state: tauri::State<'_, ClipboardHistoryState>,
) -> Result<Vec<ClipboardEntry>, String> {
    let history = history_state.read().await;
    Ok(history.get_entries().clone())
}

#[tauri::command]
pub async fn add_to_clipboard_history(
    content: String,
    is_cleaned: bool,
    original_content: Option<String>,
    history_state: tauri::State<'_, ClipboardHistoryState>,
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
pub async fn remove_from_clipboard_history(
    id: String,
    history_state: tauri::State<'_, ClipboardHistoryState>,
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
pub async fn clear_clipboard_history(
    history_state: tauri::State<'_, ClipboardHistoryState>,
) -> Result<(), String> {
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
pub async fn search_clipboard_history(
    query: String,
    history_state: tauri::State<'_, ClipboardHistoryState>,
) -> Result<Vec<ClipboardEntry>, String> {
    let history = history_state.read().await;
    let results = history.search(&query).into_iter().cloned().collect();
    Ok(results)
}

#[tauri::command]
pub async fn get_clipboard_entry_by_id(
    id: String,
    history_state: tauri::State<'_, ClipboardHistoryState>,
) -> Result<Option<ClipboardEntry>, String> {
    let history = history_state.read().await;
    Ok(history.get_entry_by_id(&id).cloned())
}

#[tauri::command]
pub async fn paste_from_history(
    id: String,
    app: AppHandle,
    history_state: tauri::State<'_, ClipboardHistoryState>,
) -> Result<String, String> {
    let content = {
        let history = history_state.read().await;
        match history.get_entry_by_id(&id) {
            Some(entry) => entry.content.clone(),
            None => return Err("Entry not found".to_string()),
        }
    };

    // Copy to clipboard
    if let Err(e) = app.clipboard().write_text(&content) {
        return Err(format!("Failed to copy to clipboard: {}", e));
    }

    Ok(content)
}

#[tauri::command]
pub async fn rephrase_text(
    _text: String,
    _jwt_token: String,
    _api_base_url: Option<String>,
) -> Result<RephraseResponse, String> {
    // For now, return an error indicating this should be handled by the frontend
    // The HTTP requests will be made from the frontend using the existing rephraseService
    Err("Rephrase functionality should be called from frontend".to_string())
}

// Add a command to setup global shortcut (called from frontend)
#[tauri::command]
pub async fn setup_global_shortcut() -> Result<(), String> {
    // This is now handled in the main setup, but we keep this command for compatibility
    Ok(())
}

// Function to clean and beautify text according to Clipify specifications
fn cleanup_text(text: &str) -> String {
    // Handle null, undefined, or empty text
    if text.is_empty() || text.trim().is_empty() {
        return String::new();
    }

    text
        // Convert all line endings to Unix format
        .replace("\r\n", "\n") // Convert Windows line endings
        .replace("\r", "\n") // Convert Mac line endings
        // Replace multiple spaces/tabs with single space
        .chars()
        .collect::<Vec<char>>()
        .windows(2)
        .fold(String::new(), |mut acc, window| {
            if window.len() == 2 {
                let current = window[0];
                let next = window[1];

                // Add current character if it's not a redundant space/tab
                if !(current == ' ' && (next == ' ' || next == '\t'))
                    && !(current == '\t' && (next == ' ' || next == '\t'))
                {
                    acc.push(if current == '\t' { ' ' } else { current });
                }
            }
            acc
        })
        // Handle the last character
        .chars()
        .chain(text.chars().last())
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
pub async fn trigger_clipboard_copy(app: AppHandle) -> Result<String, String> {
    let history_state = app.state::<ClipboardHistoryState>();
    copy_selected_text_to_clipboard(app.clone(), history_state).await
}

pub async fn copy_selected_text_to_clipboard(
    app: AppHandle,
    history_state: tauri::State<'_, ClipboardHistoryState>,
) -> Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        use std::time::Duration;
        use tokio::time::sleep;

        // Store the current clipboard content to detect changes
        let _original_clipboard = app.clipboard().read_text().unwrap_or_default();

        // Use the new Rust-based Cmd+C simulation
        let simulate_result = crate::system::simulate_cmd_c().await;

        match simulate_result {
            Ok(_) => {
                // Cmd+C simulation successful, continue with clipboard reading
            }
            Err(e) => {
                let error_msg = format!("Failed to simulate Cmd+C: {}", e);

                // Show notification about copy failure
                if let Err(notif_err) =
                    tauri_plugin_notification::NotificationExt::notification(&app)
                        .builder()
                        .title("⚠️ Copy Failed")
                        .body("Unable to copy selected text. Please ensure accessibility permissions are granted and some text is selected.")
                        .show()
                {
                    eprintln!("Failed to show copy error notification: {}", notif_err);
                }

                return Err(error_msg);
            }
        }

        // Wait and retry reading clipboard with exponential backoff
        let mut new_clipboard = String::new();
        let mut attempts = 0;
        let max_attempts = 3;

        while attempts < max_attempts {
            sleep(Duration::from_millis(100 * (attempts + 1))).await;

            match app.clipboard().read_text() {
                Ok(content) => {
                    new_clipboard = content;
                    break;
                }
                Err(e) if attempts == max_attempts - 1 => {
                    let error_msg = format!("Failed to read clipboard after copy: {}", e);

                    // Show notification about clipboard read failure
                    if let Err(notif_err) =
                        tauri_plugin_notification::NotificationExt::notification(&app)
                            .builder()
                            .title("Clipboard Error")
                            .body("Unable to read clipboard content after copy. Please try again.")
                            .show()
                    {
                        eprintln!("Failed to show clipboard error notification: {}", notif_err);
                    }

                    return Err(error_msg);
                }
                Err(_) => {
                    attempts += 1;
                    continue;
                }
            }
        }

        // Check if clipboard has meaningful content
        if new_clipboard.trim().is_empty() {
            let error_msg =
                "No text was copied. Please select some text first, then use Cmd+Shift+C."
                    .to_string();

            // Show notification with instructions
            if let Err(e) = tauri_plugin_notification::NotificationExt::notification(&app)
                .builder()
                .title("📝 Select Text First")
                .body("Please select some text, then use Cmd+Shift+C to copy and clean it.")
                .show()
            {
                eprintln!("Failed to show instruction notification: {}", e);
            }

            return Err(error_msg);
        }

        // Additional validation: check if we got reasonable text content
        if new_clipboard.len() < 1 {
            let error_msg =
                "Copied text is too short. Please select meaningful text content.".to_string();

            if let Err(e) = tauri_plugin_notification::NotificationExt::notification(&app)
                .builder()
                .title("📝 Select More Text")
                .body("Please select more meaningful text content to clean.")
                .show()
            {
                eprintln!("Failed to show short text notification: {}", e);
            }

            return Err(error_msg);
        }

        println!(
            "Successfully copied selected text, length: {}",
            new_clipboard.len()
        );

        // Use the newly copied text
        let new_text = new_clipboard;

        // Clean the text according to Clipify specifications
        let cleaned_text = cleanup_text(&new_text);

        // Check if cleaned text is empty and return early if so
        if cleaned_text.is_empty() {
            // Emit an event to notify the frontend about empty text
            if let Err(e) = app.emit("clipboard-updated", "") {
                println!(
                    "Failed to emit clipboard update event for empty text: {}",
                    e
                );
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

    #[cfg(target_os = "windows")]
    {
        use std::time::Duration;
        use tokio::time::sleep;

        // Store the current clipboard content to detect changes
        let _original_clipboard = app.clipboard().read_text().unwrap_or_default();

        // Use the Windows-specific Ctrl+C simulation
        let simulate_result = crate::system::simulate_cmd_c().await;

        match simulate_result {
            Ok(_) => {
                // Ctrl+C simulation successful, continue with clipboard reading
            }
            Err(e) => {
                let error_msg = format!("Failed to simulate Ctrl+C: {}", e);

                // Show notification about copy failure
                if let Err(notif_err) =
                    tauri_plugin_notification::NotificationExt::notification(&app)
                        .builder()
                        .title("⚠️ Copy Failed")
                        .body("Unable to copy selected text. Please ensure some text is selected.")
                        .show()
                {
                    eprintln!("Failed to show copy error notification: {}", notif_err);
                }

                return Err(error_msg);
            }
        }

        // Wait and retry reading clipboard with exponential backoff
        let mut new_clipboard = String::new();
        let mut attempts = 0;
        let max_attempts = 3;

        while attempts < max_attempts {
            sleep(Duration::from_millis(100 * (attempts + 1))).await;

            match app.clipboard().read_text() {
                Ok(content) => {
                    new_clipboard = content;
                    break;
                }
                Err(e) if attempts == max_attempts - 1 => {
                    let error_msg = format!("Failed to read clipboard after copy: {}", e);

                    // Show notification about clipboard read failure
                    if let Err(notif_err) =
                        tauri_plugin_notification::NotificationExt::notification(&app)
                            .builder()
                            .title("Clipboard Error")
                            .body("Unable to read clipboard content after copy. Please try again.")
                            .show()
                    {
                        eprintln!("Failed to show clipboard error notification: {}", notif_err);
                    }

                    return Err(error_msg);
                }
                Err(_) => {
                    attempts += 1;
                    continue;
                }
            }
        }

        // Check if clipboard has meaningful content
        if new_clipboard.trim().is_empty() {
            let error_msg =
                "No text was copied. Please select some text first, then use Ctrl+Shift+C."
                    .to_string();

            // Show notification with instructions
            if let Err(e) = tauri_plugin_notification::NotificationExt::notification(&app)
                .builder()
                .title("📝 Select Text First")
                .body("Please select some text, then use Ctrl+Shift+C to copy and clean it.")
                .show()
            {
                eprintln!("Failed to show instruction notification: {}", e);
            }

            return Err(error_msg);
        }

        // Additional validation: check if we got reasonable text content
        if new_clipboard.len() < 1 {
            let error_msg =
                "Copied text is too short. Please select meaningful text content.".to_string();

            if let Err(e) = tauri_plugin_notification::NotificationExt::notification(&app)
                .builder()
                .title("📝 Select More Text")
                .body("Please select more meaningful text content to clean.")
                .show()
            {
                eprintln!("Failed to show short text notification: {}", e);
            }

            return Err(error_msg);
        }

        println!(
            "Successfully copied selected text, length: {}",
            new_clipboard.len()
        );

        // Use the newly copied text
        let new_text = new_clipboard;

        // Clean the text according to Clipify specifications
        let cleaned_text = cleanup_text(&new_text);

        // Check if cleaned text is empty and return early if so
        if cleaned_text.is_empty() {
            // Emit an event to notify the frontend about empty text
            if let Err(e) = app.emit("clipboard-updated", "") {
                println!(
                    "Failed to emit clipboard update event for empty text: {}",
                    e
                );
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

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        // For other platforms, we'll need to implement platform-specific solutions
        // For now, just return an error
        Err("Global shortcut copy is currently only supported on macOS and Windows".to_string())
    }
}
