use tauri::{Emitter, Manager};
use std::sync::Arc;
use tokio::sync::RwLock;
use serde::{Deserialize, Serialize};

// Module declarations
mod config;
mod clipboard;
mod clipboard_monitor;
mod window;
mod clipboard_commands;
mod system;

// Import system functions
use system::request_input_monitoring_permission;

// Re-export types for external use
pub use config::{EnvironmentConfig, RephraseRequest, RephraseResponse};
pub use clipboard::{ClipboardEntry, ClipboardHistory, ClipboardHistoryState};
pub use clipboard_monitor::ClipboardMonitorState;
pub use window::WindowState;

// Deep link protocol verification types
#[derive(Debug, Serialize, Deserialize)]
pub struct ProtocolRegistrationStatus {
    pub scheme: String,
    pub is_registered: bool,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DeepLinkDiagnostics {
    pub protocols: Vec<ProtocolRegistrationStatus>,
    pub tauri_version: String,
    pub environment: String,
    pub last_error: Option<String>,
    pub event_listener_active: bool,
}

// Deep link event management types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeepLinkEvent {
    pub id: String,
    pub url: String,
    pub timestamp: u64,
    pub source: String, // "startup" | "runtime" | "manual"
    pub processed: bool,
    pub error: Option<String>,
}

#[derive(Debug)]
pub struct DeepLinkEventStore {
    events: Arc<RwLock<Vec<DeepLinkEvent>>>,
    max_events: usize,
}

impl DeepLinkEventStore {
    pub fn new(max_events: usize) -> Self {
        Self {
            events: Arc::new(RwLock::new(Vec::new())),
            max_events,
        }
    }
    
    pub async fn add_event(&self, mut event: DeepLinkEvent) {
        let mut events = self.events.write().await;
        
        // Generate ID if not provided
        if event.id.is_empty() {
            event.id = format!("dl_{}", chrono::Utc::now().timestamp_millis());
        }
        
        // Add timestamp if not provided
        if event.timestamp == 0 {
            event.timestamp = chrono::Utc::now().timestamp_millis() as u64;
        }
        
        events.push(event);
        
        // Maintain max events limit
        if events.len() > self.max_events {
            events.remove(0);
        }
        
        println!("[DeepLinkEventStore] Added event, total events: {}", events.len());
    }
    
    pub async fn get_unprocessed_events(&self) -> Vec<DeepLinkEvent> {
        let events = self.events.read().await;
        events.iter()
            .filter(|event| !event.processed)
            .cloned()
            .collect()
    }
    
    pub async fn mark_processed(&self, event_id: &str) -> bool {
        let mut events = self.events.write().await;
        if let Some(event) = events.iter_mut().find(|e| e.id == event_id) {
            event.processed = true;
            println!("[DeepLinkEventStore] Marked event {} as processed", event_id);
            return true;
        }
        false
    }
    
    pub async fn mark_error(&self, event_id: &str, error: String) -> bool {
        let mut events = self.events.write().await;
        if let Some(event) = events.iter_mut().find(|e| e.id == event_id) {
            event.error = Some(error);
            event.processed = true;
            println!("[DeepLinkEventStore] Marked event {} with error", event_id);
            return true;
        }
        false
    }
    
    pub async fn get_all_events(&self) -> Vec<DeepLinkEvent> {
        let events = self.events.read().await;
        events.clone()
    }
    
    pub async fn clear_events(&self) {
        let mut events = self.events.write().await;
        events.clear();
        println!("[DeepLinkEventStore] Cleared all events");
    }
}

pub type DeepLinkEventStoreState = Arc<DeepLinkEventStore>;

// Import functions from modules
use clipboard_commands::{
    get_clipboard_history, clear_clipboard_history, paste_from_history, 
    trigger_clipboard_copy, rephrase_text,
    add_to_clipboard_history, remove_from_clipboard_history, 
    search_clipboard_history, get_clipboard_entry_by_id, copy_selected_text_to_clipboard,
    start_clipboard_monitoring, stop_clipboard_monitoring
};
use system::{
    check_accessibility_permissions, get_macos_version, get_accessibility_instructions, 
    quit_application, simulate_cmd_c
};
use window::{show_main_window, hide_main_window, toggle_window_visibility};
use clipboard::load_history_from_file;

// Deep link plugin is initialized via tauri_plugin_deep_link::init() in the builder

/**
 * Format deep link URL for display in notifications
 * Truncates long URLs and highlights the important parts
 */
fn format_deep_link_for_notification(url: &str) -> String {
    if url.len() <= 50 {
        return url.to_string();
    }
    
    // Try to parse URL to extract meaningful parts
    if let Ok(parsed_url) = url::Url::parse(url) {
        let scheme = parsed_url.scheme();
        let host = parsed_url.host_str().unwrap_or("");
        let path = parsed_url.path();
        
        // Format based on clipify deep links
        if scheme == "clipify" {
            if path.contains("auth") {
                return format!("clipify://auth (Authentication)");
            } else if !path.is_empty() && path != "/" {
                return format!("clipify://{}", path.trim_start_matches('/'));
            }
        }
        
        // Generic URL formatting
        if host.is_empty() {
            format!("{}://{}", scheme, path)
        } else {
            format!("{}://{}{}", scheme, host, if path.len() > 20 { "..." } else { path })
        }
    } else {
        // Fallback: truncate long URLs
        format!("{}...", &url[..47])
    }
}

/**
 * Verify if a protocol scheme is registered with the operating system
 * This is platform-specific and provides diagnostic information
 */
fn verify_protocol_registration(scheme: &str) -> ProtocolRegistrationStatus {
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        
        // On macOS, check if the protocol is registered by querying the Launch Services database
        let output = Command::new("defaults")
            .args(&["read", "com.apple.LaunchServices/com.apple.launchservices.secure", "LSHandlers"])
            .output();
            
        match output {
            Ok(output) => {
                let output_str = String::from_utf8_lossy(&output.stdout);
                let is_registered = output_str.contains(&format!("LSHandlerURLScheme = \"{}\";", scheme));
                
                ProtocolRegistrationStatus {
                    scheme: scheme.to_string(),
                    is_registered,
                    error: None,
                }
            }
            Err(e) => ProtocolRegistrationStatus {
                scheme: scheme.to_string(),
                is_registered: false,
                error: Some(format!("Failed to check protocol registration: {}", e)),
            }
        }
    }
    
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        
        // On Windows, check the registry for protocol handlers
        // First check if the protocol key exists
        let protocol_check = Command::new("reg")
            .args(&["query", &format!("HKEY_CLASSES_ROOT\\{}", scheme), "/ve"])
            .output();
            
        match protocol_check {
            Ok(output) => {
                if output.status.success() {
                    // Protocol key exists, now check if it has the URL Protocol value
                    let url_protocol_check = Command::new("reg")
                        .args(&["query", &format!("HKEY_CLASSES_ROOT\\{}", scheme), "/v", "URL Protocol"])
                        .output();
                    
                    match url_protocol_check {
                        Ok(url_output) => {
                            let has_url_protocol = url_output.status.success();
                            
                            // Also check if command handler exists
                            let command_check = Command::new("reg")
                                .args(&["query", &format!("HKEY_CLASSES_ROOT\\{}\\shell\\open\\command", scheme), "/ve"])
                                .output();
                            
                            let has_command_handler = command_check.map_or(false, |cmd_output| cmd_output.status.success());
                            
                            let is_fully_registered = has_url_protocol && has_command_handler;
                            
                            ProtocolRegistrationStatus {
                                scheme: scheme.to_string(),
                                is_registered: is_fully_registered,
                                error: if !is_fully_registered {
                                    Some(format!("Protocol partially registered - URL Protocol: {}, Command Handler: {}", 
                                        has_url_protocol, has_command_handler))
                                } else {
                                    None
                                },
                            }
                        }
                        Err(e) => ProtocolRegistrationStatus {
                            scheme: scheme.to_string(),
                            is_registered: false,
                            error: Some(format!("Failed to check URL Protocol value: {}", e)),
                        }
                    }
                } else {
                    ProtocolRegistrationStatus {
                        scheme: scheme.to_string(),
                        is_registered: false,
                        error: Some("Protocol key not found in registry".to_string()),
                    }
                }
            }
            Err(e) => ProtocolRegistrationStatus {
                scheme: scheme.to_string(),
                is_registered: false,
                error: Some(format!("Failed to access Windows registry: {}", e)),
            }
        }
    }
    
    #[cfg(target_os = "linux")]
    {
        use std::process::Command;
        
        // On Linux, check if xdg-mime can find a handler for the protocol
        let output = Command::new("xdg-mime")
            .args(&["query", "default", &format!("x-scheme-handler/{}", scheme)])
            .output();
            
        match output {
            Ok(output) => {
                let output_str = String::from_utf8_lossy(&output.stdout);
                let is_registered = !output_str.trim().is_empty() && !output_str.contains("No default application");
                
                ProtocolRegistrationStatus {
                    scheme: scheme.to_string(),
                    is_registered,
                    error: None,
                }
            }
            Err(e) => ProtocolRegistrationStatus {
                scheme: scheme.to_string(),
                is_registered: false,
                error: Some(format!("Failed to check protocol registration: {}", e)),
            }
        }
    }
    
    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        ProtocolRegistrationStatus {
            scheme: scheme.to_string(),
            is_registered: false,
            error: Some("Protocol verification not supported on this platform".to_string()),
        }
    }
}

/**
 * Tauri command to verify protocol registration for all configured schemes
 */
#[tauri::command]
async fn verify_deep_link_protocols() -> Result<DeepLinkDiagnostics, String> {
    let schemes = vec![
        "clipify".to_string(),
        "clipify-dev".to_string(),
        "appclipify".to_string(),
    ];
    let mut protocols = Vec::new();
    
    for scheme in schemes {
        let status = verify_protocol_registration(&scheme);
        protocols.push(status);
    }
    
    let diagnostics = DeepLinkDiagnostics {
        protocols,
        tauri_version: env!("CARGO_PKG_VERSION").to_string(),
        environment: if cfg!(debug_assertions) { "development".to_string() } else { "production".to_string() },
        last_error: None,
        event_listener_active: true, // This would be set based on actual listener state
    };
    
    Ok(diagnostics)
}

/**
 * Tauri command to get protocol registration status for a specific scheme
 */
#[tauri::command]
async fn check_protocol_registration(scheme: String) -> Result<ProtocolRegistrationStatus, String> {
    Ok(verify_protocol_registration(&scheme))
}

/**
 * Tauri command to manually register a protocol on Windows (requires admin privileges)
 */
#[tauri::command]
async fn register_protocol_windows(scheme: String, app_path: String) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        
        // Create registry entries for the protocol
        let commands = vec![
            // Create main protocol key
            format!("reg add \"HKEY_CLASSES_ROOT\\{}\" /ve /d \"URL:{} Protocol\" /f", scheme, scheme),
            // Add URL Protocol marker
            format!("reg add \"HKEY_CLASSES_ROOT\\{}\" /v \"URL Protocol\" /d \"\" /f", scheme),
            // Set default icon
            format!("reg add \"HKEY_CLASSES_ROOT\\{}\\DefaultIcon\" /ve /d \"{},0\" /f", scheme, app_path),
            // Create command handler
            format!("reg add \"HKEY_CLASSES_ROOT\\{}\\shell\\open\\command\" /ve /d \"\"{}\" \"%1\"\" /f", scheme, app_path),
        ];
        
        for cmd_str in commands {
            let output = Command::new("cmd")
                .args(&["/C", &cmd_str])
                .output()
                .map_err(|e| format!("Failed to execute registry command: {}", e))?;
                
            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                return Err(format!("Registry command failed: {}\nCommand: {}", stderr, cmd_str));
            }
        }
        
        Ok(format!("Successfully registered {} protocol", scheme))
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        Err("Protocol registration is only supported on Windows".to_string())
    }
}

/**
 * Tauri command to get all pending deep link events
 */
#[tauri::command]
async fn get_pending_deep_link_events(
    event_store: tauri::State<'_, DeepLinkEventStoreState>
) -> Result<Vec<DeepLinkEvent>, String> {
    Ok(event_store.get_unprocessed_events().await)
}

/**
 * Tauri command to get all deep link events (processed and unprocessed)
 */
#[tauri::command]
async fn get_all_deep_link_events(
    event_store: tauri::State<'_, DeepLinkEventStoreState>
) -> Result<Vec<DeepLinkEvent>, String> {
    Ok(event_store.get_all_events().await)
}

/**
 * Tauri command to mark a deep link event as processed
 */
#[tauri::command]
async fn mark_deep_link_event_processed(
    event_id: String,
    event_store: tauri::State<'_, DeepLinkEventStoreState>
) -> Result<bool, String> {
    Ok(event_store.mark_processed(&event_id).await)
}

/**
 * Tauri command to mark a deep link event with an error
 */
#[tauri::command]
async fn mark_deep_link_event_error(
    event_id: String,
    error: String,
    event_store: tauri::State<'_, DeepLinkEventStoreState>
) -> Result<bool, String> {
    Ok(event_store.mark_error(&event_id, error).await)
}

/**
 * Tauri command to clear all deep link events
 */
#[tauri::command]
async fn clear_deep_link_events(
    event_store: tauri::State<'_, DeepLinkEventStoreState>
) -> Result<(), String> {
    event_store.clear_events().await;
    Ok(())
}


#[tauri::command]
async fn open_accessibility_settings(app: tauri::AppHandle) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        use tauri_plugin_shell::ShellExt;
        
        // Try multiple methods to open accessibility settings
        // Support both new System Settings (macOS 13+) and legacy System Preferences
        let commands = vec![
            // macOS 13+ (Ventura) and 14+ (Sonoma) - System Settings
            vec!["x-apple.systemsettings:com.apple.settings.PrivacySecurity.extension?Privacy_Accessibility"],
            vec!["x-apple.systemsettings:com.apple.preference.security?Privacy_Accessibility"],
            
            // Legacy System Preferences (macOS 12 and earlier)
            vec!["x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"],
            vec!["/System/Library/PreferencePanes/Security.prefPane"],
            
            // Fallback methods with bundle identifiers
            vec!["-b", "com.apple.systempreferences", "/System/Library/PreferencePanes/Security.prefPane"],
            vec!["-b", "com.apple.SystemSettings"],
            
            // Last resort - open System Settings/Preferences root
            vec!["/System/Applications/System Settings.app"],
            vec!["/Applications/System Preferences.app"],
        ];
        
        let shell = app.shell();
        
        for cmd_args in commands {
            let result = if cmd_args.len() == 1 {
                // Single argument - treat as URL or path to open
                shell.command("open")
                    .args(&cmd_args)
                    .spawn()
            } else {
                // Multiple arguments - pass all to open command
                shell.command("open")
                    .args(&cmd_args)
                    .spawn()
            };
            
            match result {
                Ok(_) => {
                    println!("Successfully opened accessibility settings with command: open {:?}", cmd_args);
                    return Ok(());
                }
                Err(e) => {
                    println!("Failed to open accessibility settings with command open {:?}: {}", cmd_args, e);
                }
            }
        }
        
        Err("Failed to open accessibility settings with any method. Please manually open System Settings > Privacy & Security > Accessibility (macOS 13+) or System Preferences > Security & Privacy > Privacy > Accessibility (macOS 12 and earlier)".to_string())
    }
    
    #[cfg(not(target_os = "macos"))]
    {
        // No accessibility settings are required on non-macOS platforms for global shortcuts.
        // Make this command a no-op to avoid frontend errors on Windows/Linux.
        Ok(())
    }
}


#[tauri::command]
async fn check_accessibility_permissions_and_shortcut_status(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut, GlobalShortcutExt};
    use serde_json::json;
    
    println!("🔍 Checking comprehensive accessibility and shortcut status...");
    
    let mut result = json!({
        "accessibility_granted": false,
        "shortcut_registered": false,
        "can_register_shortcut": false,
        "error_message": null,
        "needs_restart": false
    });
    
    // Check accessibility permissions first
    #[cfg(target_os = "macos")]
    {
        match system::check_accessibility_permissions() {
            Ok(msg) => {
                println!("✅ Accessibility permissions check passed: {}", msg);
                result["accessibility_granted"] = json!(true);
                result["can_register_shortcut"] = json!(true);
            }
            Err(err) => {
                println!("❌ Accessibility permissions check failed: {}", err);
                result["accessibility_granted"] = json!(false);
                result["can_register_shortcut"] = json!(false);
                result["error_message"] = json!(err);
                
                // Check if this might be a restart-required situation
                if err.contains("restart") || err.contains("Unable to verify") {
                    result["needs_restart"] = json!(true);
                }
                
                return Ok(result);
            }
        }
    }
    
    #[cfg(not(target_os = "macos"))]
    {
        result["accessibility_granted"] = json!(true);
        result["can_register_shortcut"] = json!(true);
    }
    
    // Check if shortcut is already registered
    // Use platform-specific modifiers for the status check
    #[cfg(target_os = "macos")]
    let shortcut = Shortcut::new(Some(Modifiers::SUPER | Modifiers::SHIFT), Code::KeyC);
    #[cfg(not(target_os = "macos"))]
    let shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyC);
    let is_registered = app.global_shortcut().is_registered(shortcut);
    result["shortcut_registered"] = json!(is_registered);
    
    println!("✅ Accessibility and shortcut status check completed");
    Ok(result)
}





// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/







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
        // Ensure a single running instance and forward deep-link URLs from secondary invocations
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            println!("[SingleInstance] Received args: {:?}", argv);
            // when defining deep link schemes at runtime, you must also check `argv` here
            // Extract any deep link URLs from the arguments and forward them as runtime events
            let schemes = ["clipify://", "clipify-dev://", "appclipify://"]; 
            for arg in argv {
                if schemes.iter().any(|s| arg.starts_with(s)) {
                    let url_str = arg.clone();
                    println!("[SingleInstance] Forwarding deep link URL: {}", url_str);

                    // Store the deep link event
                    let store = app.state::<DeepLinkEventStoreState>().inner().clone();
                    let app_handle = app.app_handle().clone();
                    let url_str_clone = url_str.clone();
                    tauri::async_runtime::spawn(async move {
                        let event = DeepLinkEvent {
                            id: String::new(),
                            url: url_str_clone.clone(),
                            timestamp: 0,
                            source: "single-instance".to_string(),
                            processed: false,
                            error: None,
                        };
                        store.add_event(event).await;

                        // Show notification for visibility
                        if let Err(e) = tauri_plugin_notification::NotificationExt::notification(&app_handle)
                            .builder()
                            .title("🔗 Deep Link Received (Forwarded)")
                            .body(&format!("Clipify received: {}", format_deep_link_for_notification(&url_str_clone)))
                            .show() {
                            eprintln!("[SingleInstance] Failed to show forwarded deep link notification: {}", e);
                        }

                        // Emit to frontend just like runtime deep links
                        if let Err(e) = app_handle.emit("deep-link-received", &url_str_clone) {
                            eprintln!("[SingleInstance] Failed to emit forwarded deep link event: {}", e);
                        }
                    });
                }
            }
        }))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new()
            .with_handler(|app, shortcut, event| {
                println!("Global shortcut triggered: {shortcut:?} with event {event:?}");
                let app_handle = app.clone();
                tauri::async_runtime::spawn(async move {
                    let history_state = app_handle.state::<ClipboardHistoryState>();
                    match copy_selected_text_to_clipboard(app_handle.clone(), history_state).await {
                        Ok(text) => {
                            if !text.is_empty() {
                                println!("Successfully copied and cleaned text: {} characters", text.len());
                                
                                // Emit event to frontend to trigger auto-rephrase
                                if let Err(e) = app_handle.emit("auto-rephrase-request", &text) {
                                    eprintln!("Failed to emit auto-rephrase event: {}", e);
                                }
                                
                                // Send success notification with cleaned text preview
                                let preview = if text.len() > 100 { 
                                    format!("{}...", &text[..97]) 
                                } else { 
                                    text.clone() 
                                };
                                
                                if let Err(e) = tauri_plugin_notification::NotificationExt::notification(&app_handle)
                                    .builder()
                                    .title("✅ Text Copied & Cleaned!")
                                    .body(&format!("Cleaned text ({} chars): {}", text.len(), preview))
                                    .show() {
                                    eprintln!("Failed to show success notification: {}", e);
                                }
                            } else {
                                println!("Empty text result from clipboard operation");
                                // Show notification for empty result
                                if let Err(e) = tauri_plugin_notification::NotificationExt::notification(&app_handle)
                                    .builder()
                                    .title("ℹ️ No Text to Clean")
                                    .body("The selected text was empty or contained only whitespace.")
                                    .show() {
                                    eprintln!("Failed to show empty text notification: {}", e);
                                }
                            }
                        },
                        Err(e) => {
                            eprintln!("Error in global shortcut handler: {}", e);
                            // The error notifications are already handled in copy_selected_text_to_clipboard
                            // Just log the error here for debugging
                        }
                    }
                });
            })
            .build())
        .setup(|app| {
            // Initialize deep link event store first
            let deep_link_store = Arc::new(DeepLinkEventStore::new(50)); // Store up to 50 events
            app.manage(deep_link_store.clone());
            
            // Set up deep link event handler using the correct Tauri v2 API
            use tauri_plugin_deep_link::DeepLinkExt;
            
            // Check if app was started with a deep link
            let start_urls = app.deep_link().get_current()?;
            if let Some(urls) = start_urls {
                println!("[Tauri] App started with deep link URLs: {:?}", urls);
                // Process startup deep links
                for url in urls {
                    let url_str = url.to_string();
                    println!("[Tauri] Processing startup deep link: {}", url_str);
                    
                    // Store the deep link event
                    let event = DeepLinkEvent {
                        id: String::new(), // Will be generated in add_event
                        url: url_str.clone(),
                        timestamp: 0, // Will be set in add_event
                        source: "startup".to_string(),
                        processed: false,
                        error: None,
                    };
                    
                    let store_clone = deep_link_store.clone();
                    tauri::async_runtime::spawn(async move {
                        store_clone.add_event(event).await;
                    });
                    
                    // Show permanent notification for startup deep links
                    if let Err(e) = tauri_plugin_notification::NotificationExt::notification(app)
                        .builder()
                        .title("🔗 Deep Link Received (Startup)")
                        .body(&format!("App launched with deep link: {}", format_deep_link_for_notification(&url_str)))
                        .show() {
                        eprintln!("[Tauri] Failed to show startup deep link notification: {}", e);
                    } else {
                        println!("[Tauri] Startup deep link notification shown successfully");
                    }
                    
                    if let Err(e) = app.emit("deep-link-received", &url_str) {
                        eprintln!("[Tauri] Failed to emit startup deep link event: {}", e);
                    } else {
                        println!("[Tauri] Successfully emitted startup deep link event: {}", url_str);
                    }
                }
            } else {
                println!("[Tauri] No startup deep links found");
            }
            
            // Set up deep link event handler for runtime deep links
            let app_handle = app.handle().clone();
            let store_for_runtime = deep_link_store.clone();
            app.deep_link().on_open_url(move |event| {
                let urls = event.urls();
                println!("[Tauri] Runtime deep link received: {:?}", urls);
                
                // Emit each deep link URL to the frontend
                for url in urls {
                    let url_str = url.as_str();
                    println!("[Tauri] Processing runtime deep link: {}", url_str);
                    
                    // Store the deep link event
                    let event = DeepLinkEvent {
                        id: String::new(), // Will be generated in add_event
                        url: url_str.to_string(),
                        timestamp: 0, // Will be set in add_event
                        source: "runtime".to_string(),
                        processed: false,
                        error: None,
                    };
                    
                    let store_clone = store_for_runtime.clone();
                    tauri::async_runtime::spawn(async move {
                        store_clone.add_event(event).await;
                    });
                    
                    // Show permanent notification for runtime deep links
                    if let Err(e) = tauri_plugin_notification::NotificationExt::notification(&app_handle)
                        .builder()
                        .title("🔗 Deep Link Received")
                        .body(&format!("Clipify received: {}", format_deep_link_for_notification(url_str)))
                        .show() {
                        eprintln!("[Tauri] Failed to show runtime deep link notification: {}", e);
                    } else {
                        println!("[Tauri] Runtime deep link notification shown successfully");
                    }
                    
                    if let Err(e) = app_handle.emit("deep-link-received", url_str) {
                        eprintln!("[Tauri] Failed to emit deep link event to frontend: {}", e);
                    } else {
                        println!("[Tauri] Successfully forwarded deep link to frontend: {}", url_str);
                    }
                }
            });
            
            println!("[Tauri] Deep link handler setup complete");
            

            
            // Initialize clipboard history
            let history = load_history_from_file().unwrap_or_else(|e| {
                eprintln!("Failed to load clipboard history: {}", e);
                ClipboardHistory::new(100)
            });
            let history_state = Arc::new(RwLock::new(history));
            app.manage(history_state.clone());
            
            // Initialize clipboard monitor state
            let monitor_state: ClipboardMonitorState = Arc::new(RwLock::new(None));
            app.manage(monitor_state);
            
            // Note: Global shortcut registration is now handled via permission flow
            // The shortcut will be registered when user grants permission through the UI
            println!("Clipify initialized - hotkey registration requires user permission");
            
            // Create system tray menu
            let show_hide = tauri::menu::MenuItem::with_id(app, "show_hide", "Show/Hide Clipify", true, None::<&str>)?;
            let separator1 = tauri::menu::PredefinedMenuItem::separator(app)?;
            let cleanup_clipboard = tauri::menu::MenuItem::with_id(app, "cleanup_clipboard", "🧹 Cleanup Clipboard", true, None::<&str>)?;
            // OS-specific label for the global shortcut hint
            #[cfg(target_os = "macos")]
            let trigger_label = "⌨️ Clean Clipboard (Cmd+Shift+C)";
            #[cfg(not(target_os = "macos"))]
            let trigger_label = "⌨️ Clean Clipboard (Ctrl+Shift+C)";
            let trigger_shortcut = tauri::menu::MenuItem::with_id(app, "trigger_shortcut", trigger_label, true, None::<&str>)?;
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
                    let event_id = event.id().as_ref();
                    match event_id {
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
                        "clear_history" => {
                            let app_handle = app.clone();
                            tauri::async_runtime::spawn(async move {
                                let history_state = app_handle.state::<ClipboardHistoryState>();
                                if let Err(e) = clear_clipboard_history(history_state).await {
                                    eprintln!("Error clearing clipboard history: {}", e);
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
                        _ => {
                            // Handle clipboard item clicks
                            if event_id.starts_with("clipboard_item_") {
                                let entry_id = event_id.strip_prefix("clipboard_item_").unwrap_or("");
                                let app_handle = app.clone();
                                let entry_id = entry_id.to_string();
                                
                                tauri::async_runtime::spawn(async move {
                                    let history_state = app_handle.state::<ClipboardHistoryState>();
                                    
                                    // Get the clipboard entry by ID
                                     let history = history_state.read().await;
                                     if let Some(entry) = history.get_entry_by_id(&entry_id) {
                                         let content = entry.content.clone();
                                         let preview = entry.preview.clone();
                                         drop(history); // Release the lock
                                         
                                         // Copy to clipboard using clipboard plugin
                                         use tauri_plugin_clipboard_manager::ClipboardExt;
                                         if let Err(e) = app_handle.clipboard().write_text(content) {
                                             eprintln!("Error copying to clipboard: {}", e);
                                         } else {
                                             // Show notification that content was copied
                                             if let Err(e) = tauri_plugin_notification::NotificationExt::notification(&app_handle)
                                                 .builder()
                                                 .title("Copied to Clipboard")
                                                 .body(&format!("Copied: {}", preview))
                                                 .show() {
                                                 eprintln!("Failed to show copy notification: {}", e);
                                             }
                                         }
                                     }
                                });
                            }
                        }
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
             // Clipboard commands
             get_clipboard_history,
             add_to_clipboard_history,
             remove_from_clipboard_history,
             clear_clipboard_history,
             search_clipboard_history,
             get_clipboard_entry_by_id,
             paste_from_history,
             trigger_clipboard_copy,
             rephrase_text,
             start_clipboard_monitoring,
             stop_clipboard_monitoring,
             
             // Window commands
             show_main_window,
             hide_main_window,
             toggle_window_visibility,
             
             // System commands
             check_accessibility_permissions,
             simulate_cmd_c,
             
             // Hotkey permission commands
             check_accessibility_permissions_and_shortcut_status,
             open_accessibility_settings,
             get_macos_version,
             get_accessibility_instructions,
             request_input_monitoring_permission,
             
             // Deep link commands
             verify_deep_link_protocols,
             check_protocol_registration,
             register_protocol_windows,
             get_pending_deep_link_events,
             get_all_deep_link_events,
             mark_deep_link_event_processed,
             mark_deep_link_event_error,
             clear_deep_link_events
         ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}