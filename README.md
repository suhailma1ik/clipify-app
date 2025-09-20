# Clipify Desktop (Tauri v2 + React + TypeScript)

Clipify is a cross‑platform desktop app built with Tauri v2 and React. It registers a global shortcut (Cmd/Ctrl+Shift+C) to copy selected text, sends it to AI for cleanup/rephrasing, and places the result back on your clipboard.

This README covers setup on macOS and Windows, development commands, permissions for global hotkeys, building installers, and troubleshooting.

## Prerequisites

- Node.js 18+ and npm
- Rust (latest stable) and Cargo
- Tauri CLI v2: `npm i -D @tauri-apps/cli`
- WebView2 (Windows only; usually auto-installed)

Recommended IDE: VS Code with the Tauri and rust-analyzer extensions.

## Quick Start

1) Install dependencies
```
npm install
```

2) Development run (Tauri window)
```
npm run tauri:dev
```

3) Build a release
```
npm run tauri:build
```

## macOS Setup

1) Install Xcode Command Line Tools
```
xcode-select --install
```

2) Ensure Rust is installed
```
curl https://sh.rustup.rs -sSf | sh
rustup update
```

3) Install project deps and run
```
npm install
npm run tauri:dev
```

4) Grant Accessibility permissions (for global shortcut)
- On first run, open the in‑app Hotkey Permission Manager (appears automatically if permissions are missing).
- Click “Open System Settings” when prompted, then enable accessibility access for Clipify.
- If System Settings doesn’t open automatically, use the in‑app button again or open manually:
  - System Settings → Privacy & Security → Accessibility → enable Clipify.
- After granting, return to the app and click “Register Shortcut”. If it still fails, quit and relaunch the app per on‑screen guidance.

Notes
- Deep links and permission helpers are implemented using Tauri v2 APIs and proper capabilities. See troubleshooting below if anything doesn’t open automatically.

## Windows Setup

1) Install Rust and VS Build Tools
- Install Rust from https://rustup.rs and run `rustup update`.
- Install “Desktop development with C++” using Visual Studio Build Tools 2022.

2) WebView2 Runtime
- Install Microsoft Edge WebView2 Runtime (if not already installed): https://developer.microsoft.com/en-us/microsoft-edge/webview2/

3) Install project deps and run
```
npm install
npm run tauri:dev
```

4) Global shortcut permissions
- Windows doesn’t require accessibility permission like macOS. If the shortcut doesn’t register, ensure no other app uses Ctrl+Shift+C and check the in‑app status panel.

## Environment Configuration

Environment files are supported via Vite/Tauri modes:
- `.env` (base), `.env.development`, `.env.production`

If your auth or API requires configuration, set the relevant values in these files (do not commit secrets). Consult your team for the exact variable names.

## Common Scripts

- Development (Vite + Tauri):
  - `npm run tauri:dev` – run the desktop app in development mode
  - `npm run dev` – run Vite web preview only (no desktop shell)

- Builds:
  - `npm run tauri:build` – production Tauri build
  - `npm run build` – web build only

- Testing:
  - `npm run test` – run unit tests with Vitest
  - `npm run test:run` – non-watch tests

Additional scripts:
- `npm run tauri:build:dev` – build using `src-tauri/tauri.dev.conf.json`
- `npm run build:windows:prod` – helper script for Windows production packaging

See `package.json` for the full list of commands.

## Building Installers

### macOS
- Use `npm run tauri:build` to produce a signed/packaged app based on your local signing setup/capabilities.
- On first launch of the built app, you may have to grant Accessibility permissions again.

### Windows
- Local build: `npm run tauri:build`
- GitHub Actions MSI builds:
  - Standard MSI: `.github/workflows/build-windows.yml`
  - Signed MSI: `.github/workflows/build-windows-signed.yml` (requires certificate secrets)
  - Refer to `docs/WINDOWS_BUILD_GUIDE.md` for step‑by‑step instructions and signing requirements.

## Hotkey and Permissions (Important)

- The global shortcut is Cmd+Shift+C on macOS and Ctrl+Shift+C on Windows.
- On macOS, you must grant Accessibility permissions to allow global hotkey monitoring.
- The app provides a Hotkey Permission Manager UI to:
  - Check current permission and registration status
  - Open System Settings to grant access
  - Register/unregister the global shortcut
- If registration fails, it may mean another app is using the shortcut or the permission change requires an app restart.

## Troubleshooting & Docs

- Accessibility/Permissions (macOS):
  - `test-accessibility.sh` – helper for manual checks
  - `TOKEN_REFRESH_IMPLEMENTATION.md`, `TOKEN_REFRESH_ENHANCED.md` – details on auth/token persistence

- Deep Links & OAuth:
  - `OAUTH_TESTING_GUIDE.md`
  - `WINDOWS_DEEPLINK_TESTING.md`

- Windows Builds:
  - `docs/WINDOWS_BUILD_GUIDE.md`
  - `docs/WINDOWS_BUILD_FIXES.md`

If you encounter issues, please include logs from both the frontend (DevTools console) and backend (Tauri/Rust logs) when reporting.

## Recommended IDE Setup

- VS Code + Tauri extension + rust-analyzer

## License

Proprietary. All rights reserved.
