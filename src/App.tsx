import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isPermissionGranted, requestPermission } from "@tauri-apps/plugin-notification";
import { readText, writeText } from "@tauri-apps/plugin-clipboard-manager";
import "./App.css";

function App() {
  const [originalText, setOriginalText] = useState<string>("");
  const [cleanedText, setCleanedText] = useState<string>("");
  const [clipboard, setClipboard] = useState<string>("");
  const [shortcutStatus, setShortcutStatus] = useState<string>("Global shortcut Cmd+Shift+C ready to capture text");
  const [isProcessing, setIsProcessing] = useState(false);
  const [trayStatus, setTrayStatus] = useState<string>("System tray active");
  const [permissionStatus, setPermissionStatus] = useState<string>("Checking permissions...");
  const lastValueRef = useRef<string>("");

  // System tray and window management functions
  async function hideToTray() {
    try {
      await invoke('hide_main_window');
      setTrayStatus("✅ App minimized to system tray");
    } catch (error) {
      console.error("Error hiding to tray:", error);
      setTrayStatus(`❌ Error hiding to tray: ${error}`);
    }
  }

  // async function showFromTray() {
  //   try {
  //     await invoke('show_main_window');
  //     setTrayStatus("✅ App restored from system tray");
  //   } catch (error) {
  //     console.error("Error showing from tray:", error);
  //     setTrayStatus(`❌ Error showing from tray: ${error}`);
  //   }
  // }

  // Check accessibility permissions
  async function checkPermissions() {
    try {
      const result = await invoke('check_accessibility_permissions');
      setPermissionStatus(`✅ ${result}`);
    } catch (error) {
      setPermissionStatus(`❌ ${error}`);
    }
  }

  async function toggleWindowVisibility() {
    try {
      await invoke('toggle_window_visibility');
      const window = getCurrentWindow();
      const visible = await window.isVisible();
      setTrayStatus(visible ? "✅ Window shown" : "✅ Window hidden to tray");
    } catch (error) {
      console.error("Error toggling window visibility:", error);
      setTrayStatus(`❌ Error toggling visibility: ${error}`);
    }
  }
  function cleanupText(text: string): string {
    if (!text) return "";
    
    return text
      // Remove excessive whitespace and normalize line breaks
      .replace(/\r\n/g, '\n')  // Convert Windows line endings
      .replace(/\r/g, '\n')    // Convert Mac line endings
      .replace(/[ \t]+/g, ' ') // Replace multiple spaces/tabs with single space
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Replace multiple line breaks with double
      .replace(/^\s+|\s+$/gm, '') // Trim each line
      .replace(/\n{3,}/g, '\n\n') // Limit to max 2 consecutive line breaks
      .trim(); // Trim overall
  }

  async function processClipboardText() {
    setIsProcessing(true);
    try {
      const text = await readText();
      if (text) {
        setOriginalText(text);
        const cleaned = cleanupText(text);
        setCleanedText(cleaned);
        
        // Automatically copy cleaned text back to clipboard
        await writeText(cleaned);
        
        setShortcutStatus(`✅ Text cleaned and copied! ${new Date().toLocaleTimeString()}`);
        setTimeout(() => {
          setShortcutStatus("Global shortcut Cmd+Shift+C ready to capture text");
        }, 3000);
      }
    } catch (error) {
      setShortcutStatus(`❌ Error processing text: ${error}`);
      setTimeout(() => {
        setShortcutStatus("Global shortcut Cmd+Shift+C ready to capture text");
      }, 3000);
    }
    setIsProcessing(false);
  }

  async function copyCleanedText() {
    if (cleanedText) {
      await writeText(cleanedText);
      setShortcutStatus(`✅ Cleaned text copied to clipboard!`);
      setTimeout(() => {
        setShortcutStatus("Global shortcut Cmd+Shift+C ready to capture text");
      }, 2000);
    }
  }

  useEffect(() => {
    let mounted = true;
    
    // Monitor clipboard for changes
    const readOnce = async () => {
      try {
        const text = (await readText()) ?? "";
        if (mounted && text !== lastValueRef.current) {
          lastValueRef.current = text;
          setClipboard(text);
        }
      } catch (e) {
        // ignore read errors
      }
    };

    // Initial read
    readOnce();
    // Poll clipboard periodically
    const id = setInterval(readOnce, 500);
    
    // Listen for clipboard updates from global shortcut
    const unlistenClipboard = listen<string>('clipboard-updated', async (event) => {
      setOriginalText(event.payload);
      const cleaned = cleanupText(event.payload);
      setCleanedText(cleaned);
      
      // Auto-copy cleaned text back to clipboard
      await writeText(cleaned);
      
      setShortcutStatus(`✅ Text automatically cleaned via Cmd+Shift+C: ${new Date().toLocaleTimeString()}`);
      
      // Update clipboard display
      setClipboard(cleaned);
      lastValueRef.current = cleaned;
      
      // Reset status after 3 seconds
      setTimeout(() => {
        setShortcutStatus("Global shortcut Cmd+Shift+C ready to capture text");
      }, 3000);
    });
    
    // Request notification permissions
    const setupPermissions = async () => {
      let permission = await isPermissionGranted();
      if (!permission) {
        await requestPermission();
      }
    };
    setupPermissions();
    
    // Check accessibility permissions
    checkPermissions();
    
    return () => {
      mounted = false;
      clearInterval(id);
      unlistenClipboard.then(fn => fn());
    };
  }, []);

  return (
    <main className="container" style={{ 
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '24px',
      fontFamily: '"-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"',
      lineHeight: '1.6',
      color: '#2d3748',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh'
    }}>
      {/* Header Section */}
      <div style={{ 
        textAlign: "center", 
        marginBottom: "2rem",
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: '20px',
        padding: '32px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
          <div style={{
            background: 'linear-gradient(45deg, #667eea, #764ba2)',
            borderRadius: '16px',
            padding: '12px',
            marginRight: '16px',
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
          }}>
            <span style={{ fontSize: '32px' }}>📋</span>
          </div>
          <h1 style={{ 
            background: 'linear-gradient(45deg, #667eea, #764ba2)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontSize: '48px',
            fontWeight: '800',
            margin: 0,
            letterSpacing: '-0.02em'
          }}>Clipify</h1>
        </div>
        <p style={{ 
          color: "#4a5568", 
          fontSize: "20px", 
          fontWeight: '600',
          marginBottom: "8px",
          background: 'linear-gradient(45deg, #4a5568, #2d3748)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Professional Text Cleanup Tool
        </p>
        <p style={{ color: "#718096", fontSize: "16px", margin: 0 }}>
          ✨ Instantly clean and beautify copied text with AI-powered formatting
        </p>
      </div>

      {/* Status Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
        
        {/* System Tray Status Card */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{
              background: 'linear-gradient(45deg, #ff9800, #f57c00)',
              borderRadius: '12px',
              padding: '8px',
              marginRight: '12px',
              boxShadow: '0 3px 10px rgba(255, 152, 0, 0.3)'
            }}>
              <span style={{ fontSize: '20px' }}>🖥️</span>
            </div>
            <h3 style={{ margin: 0, color: '#2d3748', fontSize: '18px', fontWeight: '700' }}>System Tray</h3>
          </div>
          
          <div style={{
            padding: '16px',
            borderRadius: '12px',
            background: trayStatus.includes("✅") ? 'linear-gradient(45deg, #e8f5e8, #f0fff0)' : 
                       trayStatus.includes("❌") ? 'linear-gradient(45deg, #ffe8e8, #fff5f5)' : 'linear-gradient(45deg, #e8f0ff, #f0f8ff)',
            border: trayStatus.includes("✅") ? '2px solid #4caf50' : 
                   trayStatus.includes("❌") ? '2px solid #f44336' : '2px solid #2196f3',
            marginBottom: '16px'
          }}>
            <div style={{ 
              color: trayStatus.includes("✅") ? '#2e7d32' : 
                     trayStatus.includes("❌") ? '#c62828' : '#1565c0',
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '8px'
            }}>
              {trayStatus}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={hideToTray}
              style={{
                flex: 1,
                padding: '10px 16px',
                background: 'linear-gradient(45deg, #ff9800, #f57c00)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600',
                boxShadow: '0 3px 10px rgba(255, 152, 0, 0.3)',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => (e.target as HTMLElement).style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => (e.target as HTMLElement).style.transform = 'translateY(0)'}
            >
              📩 Hide to Tray
            </button>
            <button
              onClick={toggleWindowVisibility}
              style={{
                flex: 1,
                padding: '10px 16px',
                background: 'linear-gradient(45deg, #2196f3, #1976d2)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600',
                boxShadow: '0 3px 10px rgba(33, 150, 243, 0.3)',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => (e.target as HTMLElement).style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => (e.target as HTMLElement).style.transform = 'translateY(0)'}
            >
              🔄 Toggle
            </button>
          </div>
          
          <div style={{ 
            marginTop: '12px', 
            fontSize: '12px', 
            color: '#718096',
            textAlign: 'center',
            fontStyle: 'italic'
          }}>
            Runs continuously in system tray
          </div>
        </div>
        
        {/* Permissions Status Card */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{
              background: permissionStatus.includes("✅") ? 'linear-gradient(45deg, #4caf50, #388e3c)' :
                         permissionStatus.includes("❌") ? 'linear-gradient(45deg, #f44336, #d32f2f)' : 'linear-gradient(45deg, #ffc107, #f57c00)',
              borderRadius: '12px',
              padding: '8px',
              marginRight: '12px',
              boxShadow: permissionStatus.includes("✅") ? '0 3px 10px rgba(76, 175, 80, 0.3)' :
                         permissionStatus.includes("❌") ? '0 3px 10px rgba(244, 67, 54, 0.3)' : '0 3px 10px rgba(255, 193, 7, 0.3)'
            }}>
              <span style={{ fontSize: '20px' }}>🔒</span>
            </div>
            <h3 style={{ margin: 0, color: '#2d3748', fontSize: '18px', fontWeight: '700' }}>Accessibility</h3>
          </div>
          
          <div style={{
            padding: '16px',
            borderRadius: '12px',
            background: permissionStatus.includes("✅") ? 'linear-gradient(45deg, #e8f5e8, #f0fff0)' : 
                       permissionStatus.includes("❌") ? 'linear-gradient(45deg, #ffe8e8, #fff5f5)' : 'linear-gradient(45deg, #fff3cd, #fffacd)',
            border: permissionStatus.includes("✅") ? '2px solid #4caf50' : 
                   permissionStatus.includes("❌") ? '2px solid #f44336' : '2px solid #ffc107',
            marginBottom: '16px'
          }}>
            <div style={{ 
              color: permissionStatus.includes("✅") ? '#2e7d32' : 
                     permissionStatus.includes("❌") ? '#c62828' : '#856404',
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '8px'
            }}>
              {permissionStatus}
            </div>
          </div>
          
          <button
            onClick={checkPermissions}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'linear-gradient(45deg, #6c757d, #495057)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              boxShadow: '0 3px 10px rgba(108, 117, 125, 0.3)',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => (e.target as HTMLElement).style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => (e.target as HTMLElement).style.transform = 'translateY(0)'}
          >
            🔄 Recheck Permissions
          </button>
          
          <div style={{ 
            marginTop: '12px', 
            fontSize: '12px', 
            color: '#718096',
            textAlign: 'center',
            fontStyle: 'italic'
          }}>
            Required for global shortcut functionality
          </div>
        </div>
      </div>
      {/* Global Shortcut Status Card */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '32px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{
            background: 'linear-gradient(45deg, #667eea, #764ba2)',
            borderRadius: '12px',
            padding: '10px',
            marginRight: '16px',
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
          }}>
            <span style={{ fontSize: '24px' }}>⌨️</span>
          </div>
          <div>
            <h2 style={{ margin: 0, color: '#2d3748', fontSize: '22px', fontWeight: '800' }}>Quick Capture</h2>
            <p style={{ margin: 0, color: '#718096', fontSize: '14px' }}>Press Cmd+Shift+C anywhere</p>
          </div>
        </div>
        
        <div style={{
          padding: '20px',
          borderRadius: '12px',
          background: shortcutStatus.includes("✅") ? 'linear-gradient(135deg, #e8f5e8, #f0fff0)' : 
                     shortcutStatus.includes("❌") ? 'linear-gradient(135deg, #ffe8e8, #fff5f5)' : 'linear-gradient(135deg, #e8f0ff, #f0f8ff)',
          border: shortcutStatus.includes("✅") ? '2px solid #4caf50' : 
                 shortcutStatus.includes("❌") ? '2px solid #f44336' : '2px solid #667eea',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Animated background effect */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: shortcutStatus.includes("✅") ? 'radial-gradient(circle at 50% 50%, rgba(76, 175, 80, 0.1), transparent)' :
                       shortcutStatus.includes("❌") ? 'radial-gradient(circle at 50% 50%, rgba(244, 67, 54, 0.1), transparent)' : 'radial-gradient(circle at 50% 50%, rgba(102, 126, 234, 0.1), transparent)',
            animation: shortcutStatus.includes("✅") || shortcutStatus.includes("❌") ? 'pulse 2s ease-in-out infinite' : 'none'
          }} />
          
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              fontSize: '16px',
              fontWeight: '600',
              color: shortcutStatus.includes("✅") ? '#2e7d32' : 
                     shortcutStatus.includes("❌") ? '#c62828' : '#1565c0'
            }}>
              <span style={{ marginRight: '12px', fontSize: '20px' }}>
                {shortcutStatus.includes("✅") ? '🎉' : shortcutStatus.includes("❌") ? '⚠️' : '🔄'}
              </span>
              {shortcutStatus}
            </div>
          </div>
        </div>
        
        <div style={{
          marginTop: '16px',
          padding: '16px',
          background: 'linear-gradient(45deg, rgba(102, 126, 234, 0.05), rgba(118, 75, 162, 0.05))',
          borderRadius: '10px',
          border: '1px solid rgba(102, 126, 234, 0.1)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            color: '#4a5568',
            fontWeight: '500'
          }}>
            <kbd style={{
              background: 'linear-gradient(45deg, #667eea, #764ba2)',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              marginRight: '4px',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
            }}>Cmd</kbd>
            <span style={{ margin: '0 4px' }}>+</span>
            <kbd style={{
              background: 'linear-gradient(45deg, #667eea, #764ba2)',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              marginRight: '4px',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
            }}>Shift</kbd>
            <span style={{ margin: '0 4px' }}>+</span>
            <kbd style={{
              background: 'linear-gradient(45deg, #667eea, #764ba2)',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              marginRight: '8px',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
            }}>C</kbd>
            → Capture & Clean Text Instantly
          </div>
        </div>
      </div>

      {/* Manual Text Cleanup Section */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '32px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{
            background: 'linear-gradient(45deg, #4caf50, #388e3c)',
            borderRadius: '12px',
            padding: '10px',
            marginRight: '16px',
            boxShadow: '0 4px 15px rgba(76, 175, 80, 0.4)'
          }}>
            <span style={{ fontSize: '24px' }}>📝</span>
          </div>
          <div>
            <h2 style={{ margin: 0, color: '#2d3748', fontSize: '22px', fontWeight: '800' }}>Manual Text Cleanup</h2>
            <p style={{ margin: 0, color: '#718096', fontSize: '14px' }}>Paste and clean your text manually</p>
          </div>
        </div>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: '20px' }}>
          {/* Original Text Panel */}
          <div style={{
            background: 'linear-gradient(135deg, #fff8f0, #fff)',
            borderRadius: '12px',
            padding: '16px',
            border: '2px solid #ff9800',
            boxShadow: '0 2px 10px rgba(255, 152, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '18px', marginRight: '8px' }}>📄</span>
              <h3 style={{ margin: 0, color: '#e65100', fontSize: '16px', fontWeight: '700' }}>Original Text</h3>
            </div>
            <textarea
              value={originalText}
              onChange={(e) => {
                setOriginalText(e.target.value);
                if (e.target.value) {
                  setCleanedText(cleanupText(e.target.value));
                }
              }}
              placeholder="📝 Paste your messy text here...\n\nI'll clean it up for you instantly!"
              style={{
                width: "100%",
                height: "220px",
                padding: "16px",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontFamily: "'SF Mono', 'Monaco', 'Cascadia Code', monospace",
                resize: "none",
                backgroundColor: "rgba(255, 255, 255, 0.8)",
                backdropFilter: 'blur(5px)',
                outline: 'none',
                boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.06)',
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => {
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
                e.target.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.06), 0 0 0 3px rgba(255, 152, 0, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
                e.target.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.06)';
              }}
            />
          </div>
          
          {/* Cleaned Text Panel */}
          <div style={{
            background: 'linear-gradient(135deg, #f0fff0, #fff)',
            borderRadius: '12px',
            padding: '16px',
            border: '2px solid #4caf50',
            boxShadow: '0 2px 10px rgba(76, 175, 80, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '18px', marginRight: '8px' }}>✨</span>
              <h3 style={{ margin: 0, color: '#2e7d32', fontSize: '16px', fontWeight: '700' }}>Cleaned Text</h3>
            </div>
            <textarea
              value={cleanedText}
              readOnly
              placeholder="Your beautifully cleaned text will appear here...\n\n✨ Ready to copy and use!"
              style={{
                width: "100%",
                height: "220px",
                padding: "16px",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontFamily: "'SF Mono', 'Monaco', 'Cascadia Code', monospace",
                resize: "none",
                backgroundColor: "rgba(255, 255, 255, 0.8)",
                backdropFilter: 'blur(5px)',
                outline: 'none',
                boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.06)',
                cursor: 'default'
              }}
            />
          </div>
        </div>
        
        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
          <button 
            type="button" 
            onClick={processClipboardText}
            disabled={isProcessing}
            style={{
              padding: "14px 28px",
              background: isProcessing ? 'linear-gradient(45deg, #ccc, #999)' : 'linear-gradient(45deg, #2196f3, #1976d2)',
              color: "white",
              border: "none",
              borderRadius: "12px",
              cursor: isProcessing ? "not-allowed" : "pointer",
              fontSize: '16px',
              fontWeight: '600',
              boxShadow: isProcessing ? 'none' : '0 4px 15px rgba(33, 150, 243, 0.4)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseOver={(e) => !isProcessing && ((e.target as HTMLElement).style.transform = 'translateY(-2px)')}
            onMouseOut={(e) => !isProcessing && ((e.target as HTMLElement).style.transform = 'translateY(0)')}
          >
            <span style={{ fontSize: '18px' }}>{isProcessing ? '🔄' : '📋'}</span>
            {isProcessing ? "Processing..." : "Cleanup from Clipboard"}
          </button>
          
          <button 
            type="button" 
            onClick={copyCleanedText}
            disabled={!cleanedText}
            style={{
              padding: "14px 28px",
              background: !cleanedText ? 'linear-gradient(45deg, #ccc, #999)' : 'linear-gradient(45deg, #4caf50, #388e3c)',
              color: "white",
              border: "none",
              borderRadius: "12px",
              cursor: cleanedText ? "pointer" : "not-allowed",
              fontSize: '16px',
              fontWeight: '600',
              boxShadow: !cleanedText ? 'none' : '0 4px 15px rgba(76, 175, 80, 0.4)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseOver={(e) => cleanedText && ((e.target as HTMLElement).style.transform = 'translateY(-2px)')}
            onMouseOut={(e) => cleanedText && ((e.target as HTMLElement).style.transform = 'translateY(0)')}
          >
            <span style={{ fontSize: '18px' }}>✨</span>
            Copy Cleaned Text
          </button>
        </div>
      </div>

      {/* Current Clipboard Section */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '32px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{
            background: 'linear-gradient(45deg, #9c27b0, #673ab7)',
            borderRadius: '12px',
            padding: '10px',
            marginRight: '16px',
            boxShadow: '0 4px 15px rgba(156, 39, 176, 0.4)'
          }}>
            <span style={{ fontSize: '24px' }}>📋</span>
          </div>
          <div>
            <h2 style={{ margin: 0, color: '#2d3748', fontSize: '22px', fontWeight: '800' }}>Live Clipboard</h2>
            <p style={{ margin: 0, color: '#718096', fontSize: '14px' }}>Real-time clipboard monitoring</p>
          </div>
        </div>
        
        <div style={{
          background: 'linear-gradient(135deg, #fafafa, #fff)',
          border: '2px solid #e0e0e0',
          borderRadius: '12px',
          padding: '20px',
          minHeight: '120px',
          maxHeight: '180px',
          overflowY: 'auto',
          position: 'relative'
        }}>
          {clipboard ? (
            <div style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontSize: '14px',
              fontFamily: "'SF Mono', 'Monaco', 'Cascadia Code', monospace",
              lineHeight: '1.5',
              color: '#2d3748'
            }}>
              {clipboard}
            </div>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '80px',
              color: '#a0aec0',
              fontSize: '16px',
              fontStyle: 'italic'
            }}>
              <span style={{ marginRight: '8px', fontSize: '20px' }}>📎</span>
              Clipboard is empty - copy some text to see it here
            </div>
          )}
        </div>
        
        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <button 
            type="button" 
            onClick={async () => setClipboard((await readText()) ?? "")}
            style={{
              padding: '10px 20px',
              background: 'linear-gradient(45deg, #9c27b0, #673ab7)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              boxShadow: '0 3px 10px rgba(156, 39, 176, 0.3)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              margin: '0 auto'
            }}
            onMouseOver={(e) => (e.target as HTMLElement).style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => (e.target as HTMLElement).style.transform = 'translateY(0)'}
          >
            <span style={{ fontSize: '16px' }}>🔄</span>
            Refresh Clipboard
          </button>
        </div>
      </div>
      
      {/* Footer */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '24px',
        textAlign: 'center',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <div style={{ 
          marginBottom: '20px', 
          padding: '20px', 
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05), rgba(118, 75, 162, 0.05))',
          borderRadius: '12px', 
          border: '1px solid rgba(102, 126, 234, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '24px', marginRight: '12px' }}>💡</span>
            <h4 style={{ margin: 0, color: '#2d3748', fontSize: '18px', fontWeight: '700' }}>Pro Tips</h4>
          </div>
          <div style={{ color: '#4a5568', fontSize: '14px', lineHeight: '1.6' }}>
            <p style={{ margin: '0 0 8px 0' }}>
              • <strong>Background Operation:</strong> Clipify runs continuously in your system tray
            </p>
            <p style={{ margin: '0 0 8px 0' }}>
              • <strong>Smart Minimize:</strong> Closing the window minimizes to tray instead of quitting
            </p>
            <p style={{ margin: '0' }}>
              • <strong>Quick Access:</strong> Right-click tray icon for menu, left-click to show/hide
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
          <div style={{
            background: 'linear-gradient(45deg, #667eea, #764ba2)',
            borderRadius: '12px',
            padding: '8px',
            marginRight: '12px',
            boxShadow: '0 3px 8px rgba(102, 126, 234, 0.3)'
          }}>
            <span style={{ fontSize: '20px' }}>✨</span>
          </div>
          <span style={{ 
            background: 'linear-gradient(45deg, #667eea, #764ba2)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontSize: '18px',
            fontWeight: '700'
          }}>
            Clipify - Making your text clean and professional, one copy at a time
          </span>
        </div>
        
        <p style={{ color: '#a0aec0', fontSize: '12px', margin: 0 }}>
          v1.0.0 • Built with ♥️ for productivity
        </p>
      </div>
    </main>
  );
}

export default App;
