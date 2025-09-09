@echo off
REM Windows Functionality Test Script for Clipify
REM Tests notifications and OAuth deep link redirects

echo ========================================
echo Clipify Windows Functionality Test
echo ========================================
echo.

REM Check if the app is running
echo [1/5] Checking if Clipify is running...
tasklist /FI "IMAGENAME eq Clipify.exe" 2>NUL | find /I /N "Clipify.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo ✓ Clipify is running
) else (
    echo ✗ Clipify is not running
    echo Please start Clipify first, then run this test again.
    pause
    exit /b 1
)
echo.

REM Test protocol registration
echo [2/5] Testing protocol registration...
reg query "HKEY_CLASSES_ROOT\clipify" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ clipify:// protocol is registered
) else (
    echo ✗ clipify:// protocol is NOT registered
    echo This may cause OAuth redirect issues.
)

reg query "HKEY_CLASSES_ROOT\appclipify" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ appclipify:// protocol is registered
) else (
    echo ✗ appclipify:// protocol is NOT registered
)
echo.

REM Test Windows notification settings
echo [3/5] Checking Windows notification settings...
REM Check if notifications are enabled system-wide
reg query "HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Notifications\Settings" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Windows notification system is available
) else (
    echo ✗ Windows notification system may not be properly configured
)
echo.

REM Test deep link functionality
echo [4/5] Testing OAuth deep link redirect...
echo Testing clipify:// protocol with sample auth data...
start "" "clipify://auth?token=test_token_windows&user_id=test_user_windows&email=test@windows.com&plan=free"
echo ✓ Deep link test sent
echo Check the Clipify app to see if it received the deep link event.
echo.

REM Test notification (this will be handled by the app)
echo [5/5] Testing notification functionality...
echo The notification test will be performed by the Clipify app itself.
echo If you see a notification from Clipify, the notification system is working.
echo If you don't see a notification, check:
echo   - Windows notification settings (Settings > System > Notifications)
echo   - Clipify notification permissions
echo   - Windows Focus Assist settings
echo.

echo ========================================
echo Test Summary:
echo ========================================
echo 1. Protocol Registration: Check the output above
echo 2. Deep Link Test: Check if Clipify received the test auth event
echo 3. Notification Test: Check if you received a notification from Clipify
echo.
echo If any tests failed, please:
echo 1. Run Clipify as Administrator once to register protocols
echo 2. Check Windows notification settings
echo 3. Ensure Windows is up to date
echo 4. Try restarting the Clipify application
echo.
echo For more help, see: docs/WINDOWS_BUILD_GUIDE.md
echo ========================================
echo.
pause