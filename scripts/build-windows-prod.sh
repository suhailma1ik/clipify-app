#!/bin/bash

# Windows Production Build Script
# This script ensures the frontend is built with production environment variables
# before building the Windows executable

set -e

echo "🚀 Starting Windows Production Build..."

# Step 1: Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist/
rm -rf src-tauri/target/

# Step 2: Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Step 3: Build frontend with production environment
echo "🏗️  Building frontend with production environment..."
NODE_ENV=production npm run build:prod

# Step 4: Verify production environment variables are loaded
echo "🔍 Verifying production build..."
if [ -f "dist/index.html" ]; then
    echo "✅ Frontend build successful"
else
    echo "❌ Frontend build failed"
    exit 1
fi

# Step 5: Build Windows executable with xwin
echo "🪟 Building Windows executable..."
cargo xwin build --target x86_64-pc-windows-msvc --release --manifest-path src-tauri/Cargo.toml

# Step 6: Verify Windows build
if [ -f "src-tauri/target/x86_64-pc-windows-msvc/release/refine.exe" ]; then
    echo "✅ Windows executable built successfully"
    echo "📍 Location: src-tauri/target/x86_64-pc-windows-msvc/release/refine.exe"
else
    echo "❌ Windows build failed"
    exit 1
fi

echo "🎉 Windows production build completed successfully!"
echo ""
echo "📋 Build Summary:"
echo "  - Frontend: Built with production environment"
echo "  - Backend: Windows x86_64 executable"
echo "  - Environment: Production (uses https://clipify0.el.r.appspot.com)"
echo ""
echo "🚀 To create MSI installer, use:"
echo "  npm run tauri build -- --target x86_64-pc-windows-msvc --bundles msi"
