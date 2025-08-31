#!/bin/bash

# Test script to verify accessibility permissions
echo "🔍 Testing Clipify Accessibility Permissions"
echo "============================================="

# Test 1: Basic AppleScript accessibility test
echo ""
echo "Test 1: Basic System Events access..."
osascript -e 'tell application "System Events" to get name of first process' 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Basic accessibility test passed"
else
    echo "❌ Basic accessibility test failed - permissions likely not granted"
fi

# Test 2: Process list access
echo ""
echo "Test 2: Process list access..."
osascript -e 'tell application "System Events" to get count of processes' 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Process list access test passed"
else
    echo "❌ Process list access test failed"
fi

# Test 3: Keystroke simulation (harmless test)
echo ""
echo "Test 3: Keystroke simulation capability..."
osascript -e 'tell application "System Events" to keystroke "" using {command down}' 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Keystroke simulation test passed"
else
    echo "❌ Keystroke simulation test failed"
fi

echo ""
echo "============================================="
echo "If any tests failed, please:"
echo "1. Open System Settings > Privacy & Security > Accessibility (macOS 13+)"
echo "   OR System Preferences > Security & Privacy > Privacy > Accessibility (macOS 12 and earlier)"
echo "2. Add Clipify to the list of allowed applications"
echo "3. Restart Clipify"
echo "4. Run this test again"
