use rdev::{simulate, EventType, Key};
use std::process::Command;
use tauri::AppHandle;

#[tauri::command]
pub fn get_macos_version() -> Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        match Command::new("sw_vers").arg("-productVersion").output() {
            Ok(output) => {
                let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
                Ok(version)
            }
            Err(e) => Err(format!("Failed to get macOS version: {}", e))
        }
    }
    
    #[cfg(not(target_os = "macos"))]
    {
        Err("macOS version detection only available on macOS".to_string())
    }
}

#[tauri::command]
pub async fn request_input_monitoring_permission() -> Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        // Attempt a minimal input monitoring operation to trigger permission prompt
        let (tx, rx) = std::sync::mpsc::channel();
        
        std::thread::spawn(move || {
            let result = (|| -> Result<String, String> {
                // Try to simulate a very brief key event to trigger permission request
                // This will fail if permission is not granted, but will prompt the user
                match simulate(&EventType::KeyPress(Key::F12)) {
                    Ok(_) => {
                        // Immediately release the key
                        let _ = simulate(&EventType::KeyRelease(Key::F12));
                        Ok("Input monitoring permission available".to_string())
                    }
                    Err(e) => {
                        Err(format!("Input monitoring permission required: {:?}", e))
                    }
                }
            })();
            
            let _ = tx.send(result);
        });
        
        match rx.recv() {
            Ok(result) => result,
            Err(_) => Err("Failed to check input monitoring permission".to_string()),
        }
    }
    
    #[cfg(not(target_os = "macos"))]
    {
        Ok("Input monitoring not required on this platform".to_string())
    }
}

#[tauri::command]
pub fn get_accessibility_instructions() -> Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        match get_macos_version() {
            Ok(version) => {
                let version_parts: Vec<&str> = version.split('.').collect();
                if let Some(major) = version_parts.get(0) {
                    if let Ok(major_num) = major.parse::<u32>() {
                        if major_num >= 13 {
                            Ok("Please go to System Settings > Privacy & Security > Accessibility and add Clipify to the list of allowed applications.".to_string())
                        } else {
                            Ok("Please go to System Preferences > Security & Privacy > Privacy > Accessibility and add Clipify to the list of allowed applications.".to_string())
                        }
                    } else {
                        Ok("Please go to System Settings > Privacy & Security > Accessibility (macOS 13+) or System Preferences > Security & Privacy > Privacy > Accessibility (macOS 12 and earlier) and add Clipify to the list of allowed applications.".to_string())
                    }
                } else {
                    Ok("Please go to System Settings > Privacy & Security > Accessibility (macOS 13+) or System Preferences > Security & Privacy > Privacy > Accessibility (macOS 12 and earlier) and add Clipify to the list of allowed applications.".to_string())
                }
            }
            Err(_) => {
                Ok("Please go to System Settings > Privacy & Security > Accessibility (macOS 13+) or System Preferences > Security & Privacy > Privacy > Accessibility (macOS 12 and earlier) and add Clipify to the list of allowed applications.".to_string())
            }
        }
    }
    
    #[cfg(not(target_os = "macos"))]
    {
        Err("Accessibility instructions only available on macOS".to_string())
    }
}

#[tauri::command]
pub fn check_accessibility_permissions() -> Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;

        println!("🔍 Starting comprehensive accessibility permission check...");

        // Method 1: Try to get system events process list (most reliable)
        let primary_test = Command::new("osascript")
            .arg("-e")
            .arg("tell application \"System Events\" to get name of first process")
            .output();

        match primary_test {
            Ok(result) => {
                if result.status.success() {
                    println!("✅ Primary accessibility test passed - permissions granted");
                    return Ok("Accessibility permissions are granted".to_string());
                } else {
                    let error = String::from_utf8_lossy(&result.stderr);
                    println!("❌ Primary accessibility test failed: {}", error);

                    // Check for specific permission denial patterns
                    if error.contains("not allowed assistive access") || 
                       error.contains("accessibility") ||
                       error.contains("permission") ||
                       error.contains("1002") || // Common AppleScript permission error code
                       error.contains("Not authorized")
                    {
                        return Err("Accessibility permissions required. Please go to System Settings > Privacy & Security > Accessibility (macOS 13+) or System Preferences > Security & Privacy > Privacy > Accessibility (macOS 12 and earlier) and add Clipify to the list of allowed applications.".to_string());
                    }
                }
            }
            Err(e) => {
                println!("❌ Failed to execute primary accessibility test: {}", e);
            }
        }

        // Method 2: Try alternative AppleScript approach
        println!("🔄 Trying alternative permission check method...");
        let alt_test = Command::new("osascript")
            .arg("-e")
            .arg("tell application \"System Events\" to get processes")
            .output();

        match alt_test {
            Ok(result) => {
                if result.status.success() {
                    println!("✅ Alternative accessibility test passed - permissions granted");
                    return Ok("Accessibility permissions are granted".to_string());
                } else {
                    let error = String::from_utf8_lossy(&result.stderr);
                    println!("❌ Alternative accessibility test failed: {}", error);

                    if error.contains("not allowed assistive access")
                        || error.contains("accessibility")
                        || error.contains("permission")
                        || error.contains("1002")
                    {
                        return Err("Accessibility permissions required. Please go to System Settings > Privacy & Security > Accessibility (macOS 13+) or System Preferences > Security & Privacy > Privacy > Accessibility (macOS 12 and earlier) and add Clipify to the list of allowed applications.".to_string());
                    }
                }
            }
            Err(e) => {
                println!("❌ Failed to execute alternative accessibility test: {}", e);
            }
        }

        // Method 3: Check if we can send a harmless keystroke (final fallback)
        println!("🔄 Trying final fallback permission check...");
        let keystroke_test = Command::new("osascript")
            .arg("-e")
            .arg("tell application \"System Events\" to keystroke \"\" using {command down}")
            .output();

        match keystroke_test {
            Ok(result) => {
                if result.status.success() {
                    println!("✅ Keystroke test passed - permissions granted");
                    return Ok("Accessibility permissions are granted".to_string());
                } else {
                    let error = String::from_utf8_lossy(&result.stderr);
                    println!("❌ Keystroke test failed: {}", error);

                    if error.contains("not allowed assistive access")
                        || error.contains("accessibility")
                        || error.contains("permission")
                        || error.contains("1002")
                    {
                        return Err("Accessibility permissions required. Please go to System Settings > Privacy & Security > Accessibility (macOS 13+) or System Preferences > Security & Privacy > Privacy > Accessibility (macOS 12 and earlier) and add Clipify to the list of allowed applications.".to_string());
                    }
                }
            }
            Err(e) => {
                println!("❌ Failed to execute keystroke test: {}", e);
            }
        }

        // If all tests failed without clear permission errors, return a general error
        println!("❌ All accessibility permission tests failed");
        Err("Unable to verify accessibility permissions. Please ensure Clipify has accessibility permissions in System Settings > Privacy & Security > Accessibility (macOS 13+) or System Preferences > Security & Privacy > Privacy > Accessibility (macOS 12 and earlier). You may need to restart the app after granting permissions.".to_string())
    }

    #[cfg(not(target_os = "macos"))]
    {
        Ok("Permission check not implemented for this platform".to_string())
    }
}

#[tauri::command]
pub async fn simulate_cmd_c() -> Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        // Run rdev simulation in a synchronous context on a separate thread
        // to avoid async runtime issues
        let (tx, rx) = std::sync::mpsc::channel();
        
        std::thread::spawn(move || {
            let result = (|| -> Result<String, String> {
                std::thread::sleep(std::time::Duration::from_millis(50));
                
                simulate(&EventType::KeyPress(Key::MetaLeft)).map_err(|e| {
                    format!("Failed to press Cmd key: {:?}", e)
                })?;
                
                std::thread::sleep(std::time::Duration::from_millis(20));
                
                simulate(&EventType::KeyPress(Key::KeyC)).map_err(|e| {
                    format!("Failed to press C key: {:?}", e)
                })?;
                
                std::thread::sleep(std::time::Duration::from_millis(20));
                
                // Release C key
                simulate(&EventType::KeyRelease(Key::KeyC)).map_err(|e| {
                    format!("Failed to release C key: {:?}", e)
                })?;
                
                std::thread::sleep(std::time::Duration::from_millis(20));
                
                // Release Cmd key
                simulate(&EventType::KeyRelease(Key::MetaLeft)).map_err(|e| {
                    format!("Failed to release Cmd key: {:?}", e)
                })?;
                
                Ok("Cmd+C simulated successfully".to_string())
            })();
            
            let _ = tx.send(result);
        });
        
        // Wait for the result
        match rx.recv() {
            Ok(result) => result,
            Err(_) => Err("Failed to receive result from rdev thread".to_string()),
        }
    }
    
    #[cfg(target_os = "windows")]
    {
        // Run rdev simulation in a synchronous context on a separate thread
        // to avoid potential thread safety issues
        let (tx, rx) = std::sync::mpsc::channel();
        
        std::thread::spawn(move || {
            let result = (|| -> Result<String, String> {
                // Small delay to ensure proper initialization
                std::thread::sleep(std::time::Duration::from_millis(50));
                
                // On Windows, use Ctrl+C instead of Cmd+C
                // Press Ctrl key
                simulate(&EventType::KeyPress(Key::ControlLeft)).map_err(|e| {
                    format!("Failed to press Ctrl key: {:?}", e)
                })?;
                
                std::thread::sleep(std::time::Duration::from_millis(20));
                
                // Press C key
                simulate(&EventType::KeyPress(Key::KeyC)).map_err(|e| {
                    format!("Failed to press C key: {:?}", e)
                })?;
                
                std::thread::sleep(std::time::Duration::from_millis(20));
                
                // Release C key
                simulate(&EventType::KeyRelease(Key::KeyC)).map_err(|e| {
                    format!("Failed to release C key: {:?}", e)
                })?;
                
                std::thread::sleep(std::time::Duration::from_millis(20));
                
                // Release Ctrl key
                simulate(&EventType::KeyRelease(Key::ControlLeft)).map_err(|e| {
                    format!("Failed to release Ctrl key: {:?}", e)
                })?;
                
                Ok("Ctrl+C simulated successfully".to_string())
            })();
            
            let _ = tx.send(result);
        });
        
        // Wait for the result
        match rx.recv() {
            Ok(result) => result,
            Err(_) => Err("Failed to receive result from rdev thread".to_string()),
        }
    }
    
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        Err("Copy simulation is only supported on macOS and Windows".to_string())
    }
}

#[tauri::command]
pub fn quit_application(app: AppHandle) {
    app.exit(0);
}
