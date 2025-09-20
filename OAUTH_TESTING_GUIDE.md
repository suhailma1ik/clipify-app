# 🔐 OAuth Flow Testing Guide

This guide will help you test and debug the Google OAuth flow in your Clipify Tauri application.

## 🚀 Quick Start

1. **Build and run the app:**
   ```bash
   npm run tauri dev
   ```

2. **Open the test page:**
   - Navigate to `http://localhost:1420/deep-link-test.html` in your browser
   - Or open `refine/public/deep-link-test.html` directly

3. **Test the OAuth flow:**
   - Click "Login with Browser" in the app
   - Complete authentication in the browser
   - Browser should redirect back to the app automatically

## 🔍 Issues Fixed

### 1. Deep Link Protocol Registration
- ✅ Added `deepLink.schemes` to all Tauri config files
- ✅ Supports both `clipify://` (production) and `clipify-dev://` (development)

### 2. Deep Link Event Handling
- ✅ Fixed auth service to use proper Tauri event listeners
- ✅ Added proper URL parsing for server redirect format
- ✅ Added window showing after successful authentication

### 3. Server Redirect Format
- ✅ Server now redirects to: `clipify://auth?token=...&user_id=...&email=...&plan=...`
- ✅ Client properly parses this format

### 4. Event Listener Setup
- ✅ Added proper deep link event listener in auth service
- ✅ Added cleanup for event listeners

## 🧪 Testing Methods

### Method 1: Full OAuth Flow
1. Start the app: `npm run tauri dev`
2. Click "Login with Browser" 
3. Complete Google OAuth in browser
4. Browser redirects to `clipify://auth?token=...`
5. App should receive the deep link and authenticate

### Method 2: Manual Deep Link Testing
1. Run the test script: `./test-deep-link.sh`
2. Or manually run: `open "clipify://auth?token=test&user_id=123&email=test@example.com"`
3. Check the Deep Link Tester component in the app

### Method 3: Browser Test Page
1. Open `http://localhost:1420/deep-link-test.html`
2. Click the test links
3. App should receive the deep links

### Method 4: Terminal Testing
```bash
# macOS
open "clipify://auth?token=test_token&user_id=test_user&email=test@example.com&plan=free"

# Linux  
xdg-open "clipify://auth?token=test_token&user_id=test_user&email=test@example.com&plan=free"

# Windows
start "clipify://auth?token=test_token&user_id=test_user&email=test@example.com&plan=free"
```

## 🔧 Debugging Tools

### Deep Link Tester Component
- Added to the main app for debugging
- Shows all received deep link events
- Displays event source, timestamp, and processing status
- Allows manual testing and event clearing

### Console Logging
- Auth service logs all deep link events
- Environment service shows configuration details
- Logging service tracks authentication flow

### Browser Developer Tools
- Check console for deep link click events
- Network tab shows OAuth redirects
- Application tab shows stored tokens

## 📁 Files Modified

### Tauri Configuration
- `src-tauri/tauri.conf.json` - Added deep link schemes
- `src-tauri/tauri.dev.conf.json` - Added development deep link schemes

### Authentication Service
- `src/services/authService.ts` - Fixed deep link handling
- Added proper event listeners
- Fixed URL parsing for server format
- Added window management

### Components
- `src/components/DeepLinkTester.tsx` - New debugging component
- `src/App.tsx` - Added DeepLinkTester for testing

### Test Files
- `test-deep-link.sh` - Shell script for testing
- `public/deep-link-test.html` - Browser test page
- `OAUTH_TESTING_GUIDE.md` - This guide

## 🐛 Common Issues & Solutions

### Issue: "Nothing happens when clicking Login"
**Solution:** Check that the server is running and the API endpoint is correct.

### Issue: "Browser opens but doesn't redirect back"
**Solution:** 
1. Check that deep link schemes are registered in Tauri config
2. Verify the server redirects to the correct URL format
3. Check browser console for errors

### Issue: "App doesn't receive deep link"
**Solution:**
1. Make sure the app is running when the deep link is triggered
2. Check the Deep Link Tester component for events
3. Verify protocol registration with `./test-deep-link.sh`

### Issue: "Authentication fails after deep link"
**Solution:**
1. Check that the JWT token in the URL is valid
2. Verify token parsing in auth service
3. Check secure token storage initialization

### Issue: "Deep link works but window doesn't show"
**Solution:** The auth service now calls `show_main_window` after successful authentication.

## 🔄 OAuth Flow Sequence

1. **User clicks "Login with Browser"**
   - App calls `authService.login()`
   - Opens browser to `/api/v1/auth/desktop-login`

2. **Server checks for existing session**
   - If valid refresh token cookie exists, generates access token
   - Redirects to `clipify://auth?token=...&user_id=...&email=...&plan=...`

3. **Browser redirects to deep link**
   - OS opens Clipify app with the deep link URL
   - Tauri deep link plugin captures the URL

4. **App processes deep link**
   - Deep link event emitted to frontend
   - Auth service receives event and parses URL
   - Tokens stored securely, user authenticated
   - Main window shown

5. **User is logged in**
   - Auth state updated
   - UI shows authenticated state
   - JWT token available for API calls

## 📊 Environment Configuration

The app automatically detects environment and uses appropriate settings:

### Development
- Deep link scheme: `clipify-dev://`
- API base URL: `http://localhost:8080`
- Frontend URL: `http://localhost:5173`

### Production  
- Deep link scheme: `clipify://`
- API base URL: `https://clipify0.el.r.appspot.com`
- Frontend URL: `https://clipify0.el.r.appspot.com`

## ✅ Success Indicators

When everything is working correctly, you should see:

1. **In the app:**
   - "Opening browser for authentication..." notification
   - Browser opens to OAuth page
   - "Authentication successful!" notification
   - User shown as authenticated in UI

2. **In Deep Link Tester:**
   - Deep link event appears with correct URL
   - Event marked as processed (✅)
   - No error messages

3. **In console logs:**
   - "Deep link received" messages
   - "Authentication completed successfully"
   - No error messages in auth flow

## 🎯 Next Steps

If the OAuth flow is working correctly:

1. Remove the DeepLinkTester component from production builds
2. Add proper error handling for edge cases
3. Implement token refresh functionality
4. Add logout deep link support if needed
5. Test on different operating systems

## 📞 Support

If you're still having issues:

1. Check the console logs for detailed error messages
2. Use the Deep Link Tester component to debug
3. Run `./test-deep-link.sh` to verify protocol registration
4. Test with the browser test page first before trying full OAuth flow