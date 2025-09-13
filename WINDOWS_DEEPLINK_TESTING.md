# Windows DeepLink Testing Guide

This guide provides comprehensive instructions for testing and troubleshooting deeplink functionality on Windows for the Clipify application.

## 🎯 Overview

Clipify uses custom URL protocols (`clipify://`, `appclipify://`, `clipify-dev://`) to handle OAuth authentication callbacks and other deeplink functionality on Windows. This guide helps ensure these protocols work correctly.

## 🛠️ Prerequisites

- Windows 10/11
- PowerShell 5.1 or later
- Administrator privileges (for protocol registration)
- Clipify application installed or built

## 🚀 Quick Testing

### Method 1: Automated PowerShell Script

1. **Run the test script:**
   ```powershell
   # Run as Administrator for full functionality
   .\test-windows-deeplinks.ps1
   ```

2. **The script will:**
   - Check current protocol registration status
   - Locate Clipify executable
   - Register missing protocols (if Administrator)
   - Test deeplink functionality
   - Provide detailed diagnostics

### Method 2: Manual Testing

1. **Check protocol registration:**
   ```powershell
   # Check if clipify:// is registered
   Get-ItemProperty -Path "HKCR:\clipify" -ErrorAction SilentlyContinue
   ```

2. **Test deeplinks manually:**
   - Press `Win + R`
   - Enter: `clipify://test-auth-callback?code=test123`
   - Press Enter
   - Clipify should launch and handle the deeplink

## 🔧 Protocol Registration

### Automatic Registration (Recommended)

The MSI installer should automatically register protocols. If this fails:

1. **Run PowerShell as Administrator**
2. **Execute the registration script:**
   ```powershell
   .\test-windows-deeplinks.ps1
   ```

### Manual Registration

If automatic registration fails, manually register protocols:

```powershell
# Replace with actual path to Clipify.exe
$clipifyPath = "C:\Program Files\Clipify\Clipify.exe"

# Register clipify:// protocol
New-Item -Path "HKCR:\clipify" -Force
Set-ItemProperty -Path "HKCR:\clipify" -Name "(Default)" -Value "URL:clipify Protocol"
Set-ItemProperty -Path "HKCR:\clipify" -Name "URL Protocol" -Value ""
New-Item -Path "HKCR:\clipify\DefaultIcon" -Force
Set-ItemProperty -Path "HKCR:\clipify\DefaultIcon" -Name "(Default)" -Value "$clipifyPath,0"
New-Item -Path "HKCR:\clipify\shell\open\command" -Force
Set-ItemProperty -Path "HKCR:\clipify\shell\open\command" -Name "(Default)" -Value "`"$clipifyPath`" `"%1`""
```

## 🧪 Testing Scenarios

### 1. OAuth Authentication Flow

```powershell
# Test OAuth callback
Start-Process "clipify://auth-callback?code=test_code&state=test_state"
```

**Expected behavior:**
- Clipify launches (if not running)
- Authentication flow processes the callback
- User sees success notification
- Main window becomes visible

### 2. Development Environment

```powershell
# Test development protocol
Start-Process "clipify-dev://debug-test?param=value"
```

### 3. Alternative Protocol

```powershell
# Test alternative protocol
Start-Process "appclipify://test-action?data=sample"
```

## 🔍 Diagnostics

### Registry Inspection

1. **Open Registry Editor (regedit)**
2. **Navigate to:** `HKEY_CLASSES_ROOT`
3. **Look for keys:** `clipify`, `appclipify`, `clipify-dev`
4. **Verify structure:**
   ```
   clipify/
   ├── (Default) = "URL:clipify Protocol"
   ├── URL Protocol = ""
   ├── DefaultIcon/
   │   └── (Default) = "C:\Path\To\Clipify.exe,0"
   └── shell/open/command/
       └── (Default) = "C:\Path\To\Clipify.exe" "%1"
   ```

### Event Viewer

1. **Open Event Viewer**
2. **Navigate to:** Windows Logs > Application
3. **Filter by:** Clipify or Tauri events
4. **Look for:** Protocol handling errors

### Process Monitor

1. **Download Process Monitor (ProcMon)**
2. **Filter by:** Process Name contains "Clipify"
3. **Test deeplink while monitoring**
4. **Check for:** File access, registry access, process creation

## 🐛 Common Issues

### Issue 1: Protocol Not Registered

**Symptoms:**
- "This file does not have a program associated with it" error
- Browser shows "Protocol not supported"

**Solutions:**
1. Run registration script as Administrator
2. Check antivirus software blocking registry changes
3. Verify MSI installer completed successfully

### Issue 2: Wrong Application Path

**Symptoms:**
- "The system cannot find the file specified" error
- Different application launches

**Solutions:**
1. Update registry with correct Clipify.exe path
2. Reinstall Clipify
3. Check if executable was moved or deleted

### Issue 3: Permission Denied

**Symptoms:**
- "Access denied" when registering protocols
- Registry changes don't persist

**Solutions:**
1. Run PowerShell as Administrator
2. Check User Account Control (UAC) settings
3. Verify user has registry modification rights

### Issue 4: Deeplink Not Processed

**Symptoms:**
- Clipify launches but doesn't handle the URL
- No authentication callback processing

**Solutions:**
1. Check Clipify logs for deeplink events
2. Verify deeplink listener is active
3. Test with simpler URLs first
4. Check URL encoding issues

## 🔧 Advanced Troubleshooting

### Enable Detailed Logging

1. **Set environment variable:**
   ```cmd
   set RUST_LOG=debug
   ```

2. **Launch Clipify from command line:**
   ```cmd
   "C:\Program Files\Clipify\Clipify.exe"
   ```

3. **Check console output for deeplink events**

### Network Debugging

If OAuth callbacks aren't working:

1. **Check redirect URI configuration**
2. **Verify OAuth provider settings**
3. **Test with localhost callbacks first**
4. **Use browser developer tools to inspect redirects**

### Registry Backup

Before making changes:

```powershell
# Export current protocol registrations
reg export HKCR\clipify clipify_backup.reg
reg export HKCR\appclipify appclipify_backup.reg
reg export HKCR\clipify-dev clipify-dev_backup.reg
```

## 📋 Testing Checklist

- [ ] PowerShell script runs without errors
- [ ] All three protocols are registered
- [ ] Registry entries have correct executable path
- [ ] Test URLs launch Clipify successfully
- [ ] OAuth callback processing works
- [ ] No error messages in Event Viewer
- [ ] Deeplink events appear in application logs
- [ ] Authentication flow completes successfully

## 🆘 Getting Help

If issues persist:

1. **Collect diagnostic information:**
   - PowerShell script output
   - Registry export of protocol keys
   - Event Viewer errors
   - Clipify application logs

2. **Include system information:**
   - Windows version
   - Clipify version
   - Installation method (MSI/manual)
   - Antivirus software

3. **Test with minimal example:**
   ```powershell
   Start-Process "clipify://test"
   ```

## 🎉 Success Indicators

✅ **Fully Working Setup:**
- All protocols registered in registry
- Test deeplinks launch Clipify
- OAuth authentication completes
- No errors in Event Viewer
- Deeplink events logged in application

---

**Note:** This testing should be performed on the target Windows environment where Clipify will be deployed. Cross-compilation testing from macOS/Linux has limitations.