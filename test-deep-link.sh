#!/bin/bash

# Test Deep Link Registration Script
# This script tests if the clipify:// protocol is properly registered

echo "🔗 Testing Deep Link Registration for Clipify"
echo "=============================================="

# Test if the protocol is registered on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "📱 Testing on macOS..."
    
    # Check if clipify protocol is registered
    echo "🔍 Checking protocol registration..."
    
    # Method 1: Check Launch Services database
    if command -v defaults >/dev/null 2>&1; then
        echo "📋 Checking Launch Services database..."
        defaults read com.apple.LaunchServices/com.apple.launchservices.secure LSHandlers 2>/dev/null | grep -i clipify
        if [ $? -eq 0 ]; then
            echo "✅ clipify:// protocol found in Launch Services"
        else
            echo "❌ clipify:// protocol not found in Launch Services"
        fi
    fi
    
    # Method 2: Try to open a test URL
    echo "🧪 Testing deep link opening..."
    echo "This will attempt to open: clipify://auth?token=test&user_id=123&email=test@example.com"
    echo "If Clipify is running, it should receive this deep link."
    echo ""
    read -p "Press Enter to test the deep link, or Ctrl+C to cancel..."
    
    open "clipify://auth?token=test_token&user_id=test_user_123&email=test@example.com&plan=free"
    
    if [ $? -eq 0 ]; then
        echo "✅ Deep link command executed successfully"
        echo "📱 Check your Clipify app to see if it received the deep link"
    else
        echo "❌ Failed to execute deep link command"
    fi
    
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "🐧 Testing on Linux..."
    
    # Check if xdg-mime can find a handler
    if command -v xdg-mime >/dev/null 2>&1; then
        echo "🔍 Checking protocol handler..."
        handler=$(xdg-mime query default x-scheme-handler/clipify 2>/dev/null)
        if [ -n "$handler" ] && [ "$handler" != "No default application" ]; then
            echo "✅ clipify:// protocol handler found: $handler"
        else
            echo "❌ No handler found for clipify:// protocol"
        fi
    fi
    
    # Try to open the URL
    echo "🧪 Testing deep link opening..."
    xdg-open "clipify://auth?token=test_token&user_id=test_user_123&email=test@example.com&plan=free"
    
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    echo "🪟 Testing on Windows..."
    
    # Check registry for protocol handler
    echo "🔍 Checking Windows registry..."
    reg query "HKEY_CLASSES_ROOT\clipify" /ve 2>nul
    if [ $? -eq 0 ]; then
        echo "✅ clipify:// protocol found in registry"
    else
        echo "❌ clipify:// protocol not found in registry"
    fi
    
    # Try to open the URL
    echo "🧪 Testing deep link opening..."
    start "clipify://auth?token=test_token&user_id=test_user_123&email=test@example.com&plan=free"
    
else
    echo "❓ Unknown operating system: $OSTYPE"
    echo "Manual test: Try opening this URL in your browser or terminal:"
    echo "clipify://auth?token=test_token&user_id=test_user_123&email=test@example.com&plan=free"
fi

echo ""
echo "📝 Additional Test URLs:"
echo "clipify://auth?token=abc123&user_id=user456&email=user@example.com&plan=premium"
echo "clipify-dev://auth?token=dev123&user_id=dev456&email=dev@example.com&plan=free"
echo ""
echo "🔧 Troubleshooting:"
echo "1. Make sure Clipify is built and running"
echo "2. Check that the Tauri config includes deepLink schemes"
echo "3. On macOS, you may need to run the app once to register the protocol"
echo "4. Check the Deep Link Tester component in the app for received events"
echo ""
echo "✅ Test completed!"