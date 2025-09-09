# Windows Troubleshooting Guide

This guide helps resolve common Windows-specific issues with Clipify, particularly notifications and OAuth authentication.

## Quick Fixes

### Notifications Not Working

1. **Check Windows Notification Settings**
   - Open Settings > System > Notifications & actions
   - Ensure "Get notifications from apps and other senders" is ON
   - Scroll down and find "Clipify" in the app list
   - Ensure Clipify notifications are enabled

2. **Check Focus Assist**
   - Open Settings > System > Focus assist
   - Set to "Off" or "Priority only"
   - Add Clipify to priority list if using "Priority only"

3. **Run as Administrator (One Time)**
   - Right-click Clipify.exe
   - Select "Run as administrator"
   - This registers notification permissions properly

### OAuth/Google Auth Not Working

1. **Protocol Registration Issue**
   - Run Clipify as Administrator once
   - This registers the `clipify://` and `appclipify://` protocols
   - Restart your browser after running as admin

2. **Browser Default App Settings**
   - Open Windows Settings > Apps > Default apps
   - Search for "clipify" in the search box
   - Ensure Clipify is set as default for clipify:// links

3. **Firewall/Antivirus Blocking**
   - Add Clipify to Windows Defender exceptions
   - Check if third-party antivirus is blocking the app

## Detailed Troubleshooting

### Testing Your Setup

Run the provided test script:
```bash
# In Command Prompt or PowerShell
test-windows-functionality.bat
```

This script will:
- Check if protocols are registered
- Test deep link functionality
- Verify notification system availability
- Provide specific error messages

### Manual Protocol Registration

If automatic registration fails:

1. **Open Registry Editor** (regedit.exe) as Administrator
2. **Create clipify protocol:**
   ```
   HKEY_CLASSES_ROOT\clipify
   (Default) = "URL:Clipify Protocol"
   URL Protocol = ""
   
   HKEY_CLASSES_ROOT\clipify\shell\open\command
   (Default) = "C:\Path\To\Clipify.exe" "%1"
   ```

3. **Create appclipify protocol:**
   ```
   HKEY_CLASSES_ROOT\appclipify
   (Default) = "URL:Clipify App Protocol"
   URL Protocol = ""
   
   HKEY_CLASSES_ROOT\appclipify\shell\open\command
   (Default) = "C:\Path\To\Clipify.exe" "%1"
   ```

### Notification Permissions

1. **Check App Permissions:**
   - Settings > Privacy > Notifications
   - Ensure "Allow apps to access your notifications" is ON
   - Find Clipify and ensure it's enabled

2. **Registry Check:**
   ```cmd
   reg query "HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Notifications\Settings"
   ```

### Common Error Messages

#### "Notification permission denied"
**Solution:**
- Run Clipify as Administrator once
- Check Windows notification settings
- Restart the application

#### "Protocol not registered"
**Solution:**
- Run as Administrator to register protocols
- Manually register protocols (see above)
- Restart browser and application

#### "OAuth redirect failed"
**Solution:**
- Ensure protocols are registered
- Check browser default app settings
- Try different browser
- Disable browser extensions temporarily

### Windows Version Compatibility

- **Windows 10:** Fully supported (version 1903+)
- **Windows 11:** Fully supported
- **Windows 8.1:** Limited support (notifications may not work)
- **Windows 7:** Not supported

### Advanced Debugging

1. **Enable Debug Logging:**
   - Set environment variable: `CLIPIFY_DEBUG=true`
   - Check logs in: `%APPDATA%\Clipify\logs\`

2. **Check Event Viewer:**
   - Open Event Viewer
   - Navigate to Windows Logs > Application
   - Look for Clipify-related errors

3. **Network Debugging:**
   - Ensure no proxy is blocking OAuth redirects
   - Check corporate firewall settings
   - Try different network connection

### Still Having Issues?

1. **Collect Debug Information:**
   ```cmd
   # Run this and save output
   systeminfo > clipify-debug.txt
   reg query "HKEY_CLASSES_ROOT\clipify" >> clipify-debug.txt
   reg query "HKEY_CLASSES_ROOT\appclipify" >> clipify-debug.txt
   ```

2. **Contact Support:**
   - Include the debug information
   - Specify your Windows version
   - Describe exact steps that fail
   - Include any error messages

## Prevention

- **Always run installer as Administrator**
- **Keep Windows updated**
- **Don't block Clipify in antivirus**
- **Regularly check Windows notification settings**

---

*Last updated: January 2024*
*For more help, visit: [GitHub Issues](https://github.com/your-repo/clipify/issues)*