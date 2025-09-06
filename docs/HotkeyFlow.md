# Cmd+Shift+C Hotkey Flow (Clipify)

This document explains the complete flow and function calls that occur when you press the global hotkey Cmd+Shift+C.

It references the following files:
- `src/utils/clipboardUtils.ts`
- `src/hooks/useClipboardMonitoring.ts`
- `src/App.tsx`
- `src/services/rephraseService.ts`
- `src/services/apiClient.ts`
- Backend (Rust) commands referenced by `invoke(...)` calls

---

## 0) App initialization and hook wiring

- File: `src/App.tsx`
  - On mount, `useEffect` calls `setupClipboardMonitoring()` from `useClipboardMonitoring` and retains its cleanup if returned.
    - Path: `src/App.tsx` → `useClipboardMonitoring(...).setupClipboardMonitoring()`
  - Also loads clipboard history on mount via `loadClipboardHistory()`.

Key snippet:
- `src/App.tsx`
  - `useEffect(() => { loadClipboardHistory(); const cleanup = setupClipboardMonitoring(); ... }, [...])`

---

## 1) Global shortcut registration (Cmd+Shift+C)

- File: `src/utils/clipboardUtils.ts`
  - Function: `setupGlobalShortcut()`
  - Steps:
    1. Checks environment and returns in browser contexts.
    2. Ensures accessibility permissions by invoking backend:
       - `invoke("check_accessibility_permissions")`
    3. Attempts to gracefully clear any previous registrations:
       - `invoke("unregister_global_shortcut")` (best-effort)
    4. Waits 100ms for unregistration to settle.
    5. Registers the shortcut with Tauri v2 frontend API:
       - `const { register } = await import("@tauri-apps/plugin-global-shortcut")`
       - `await register("CommandOrControl+Shift+C", handler)`
    6. On registration failure due to conflicts (e.g., `RegisterEventHotKey failed`), it tries:
       - `invoke("force_unregister_all_shortcuts")` then retries registration once.

- Event handler behavior inside `register(...)`:
  - If `event.state === "Pressed"`, it triggers a backend command to copy the currently selected text and broadcast it to the app:
    - `invoke("trigger_clipboard_copy")`

Notes:
- `trigger_clipboard_copy` is a Rust-side command that orchestrates copying the selected text, then emits a frontend event (see step 2).
- Accessibility permission context and troubleshooting are handled by a separate UI/flow, but this function checks it before registering.

---

## 2) Backend emits event with copied text

- Source: Rust backend (not in TS files)
  - Command: `trigger_clipboard_copy`
  - Behavior: Copies the user’s currently selected text to the clipboard and emits a Tauri event with the copied text payload.
  - Event name (frontend listener in step 3): `"text-copied-for-rephrase"`

---

## 3) Frontend listens for the emitted event

- File: `src/hooks/useClipboardMonitoring.ts`
  - Hook: `useClipboardMonitoring`
  - Function: `setupClipboardMonitoring()`
  - Steps after `setupGlobalShortcut()` resolves:
    1. Dynamically imports Tauri event API: `const { listen } = await import('@tauri-apps/api/event')`
    2. Subscribes to the backend event:
       - `const unlisten = await listen('text-copied-for-rephrase', async (event) => { ... })`
    3. Extracts the copied text: `const copiedText = event.payload as string`
    4. Validates non-empty, then proceeds with the rephrase pipeline (step 4).

- Cleanup:
  - Returns a cleanup function that calls `unlisten()` when the hook is torn down.

---

## 4) Rephrase pipeline (authenticated request)

- File: `src/hooks/useClipboardMonitoring.ts`
  - Inside the event handler for `'text-copied-for-rephrase'`:
    1. Gets an access token from the auth service:
       - `const authService = getAuthService()`
       - `const token = await authService.getAccessToken()`
    2. If no token, updates UI status and aborts.
    3. Applies the token to the rephrase service:
       - `rephraseService.setJwtToken(token)`
    4. Calls the rephrase service with parameters:
       - `rephraseService.rephrase(copiedText, 'professional', 'Business communication', 'Colleagues', false)`
    5. On success:
       - Writes the rephrased text back to clipboard via `writeToClipboard(...)`
       - Adds to clipboard history: `addToClipboardHistory(rephrasedText, true, originalCopiedText)`
       - Updates UI state (`setCleanedText`, `setShortcutStatus`) and reloads history.

- File: `src/services/rephraseService.ts`
  - Class: `RephraseService`
  - Methods involved:
    - `setJwtToken(token: string | null)` → passes the token to the API client (`getApiClient().setJwtToken(token)`)
    - `rephrase(text, style, context, target_audience, preserve_length)`
      - Validates word limit for free plan
      - Looks up API client → `getApiClient()`
      - Requires a JWT token (`getJwtToken()` must not be null)
      - Calls API client method `rephraseText(...)` and validates `response.data.rephrased_text`
      - Throws `RephraseError` with meaningful `code` if failures occur

---

## 5) API call details

- File: `src/services/apiClient.ts`
  - Class: `ApiClientService`
  - Relevant methods:
    - `setJwtToken(token)` and `getJwtToken()` store and retrieve the current token used for Authorization headers (conditionally applied).
    - `rephraseText(text, style?, context?, target_audience?, preserve_length?)`:
      - Validates `this.jwtToken` is present
      - POSTs to `"/api/v1/protected/rephrase"` via Tauri HTTP plugin (`@tauri-apps/plugin-http`)
      - Handles non-2xx responses, 401 refresh logic via `tokenRefreshService`, and retry
      - Returns `{ data, status, statusText }` with `data.rephrased_text` expected

- Tokens
  - Token refresh path is handled inside `ApiClientService.request()`; on HTTP 401, it attempts `tokenRefreshService.refreshToken()` and retries once on success.

---

## 6) Clipboard write and history persistence

- File: `src/utils/clipboardUtils.ts`
  - `writeToClipboard(text)`
    - In Tauri env: uses `@tauri-apps/plugin-clipboard-manager` → `writeText(text)`
    - In browser: uses `navigator.clipboard.writeText` or a textarea fallback
  - `addToClipboardHistory(content, isCleaned = false, originalContent?)`
    - Calls backend: `invoke("add_to_clipboard_history", { content, is_cleaned, original_content })`

---

## End-to-end sequence (high level)

1. `App.tsx` mounts → calls `useClipboardMonitoring().setupClipboardMonitoring()`
2. `setupClipboardMonitoring()` → calls `setupGlobalShortcut()`
3. `setupGlobalShortcut()`:
   - Ensures accessibility permissions via `check_accessibility_permissions`
   - Unregisters any previous shortcut
   - Registers `CommandOrControl+Shift+C` with Tauri v2 API
4. User presses Cmd+Shift+C → handler calls `invoke("trigger_clipboard_copy")`
5. Rust backend copies selected text and emits `"text-copied-for-rephrase"` with the text content
6. Frontend listener in `useClipboardMonitoring` receives the text
7. Auth token fetched → `rephraseService.setJwtToken(token)`
8. `rephraseService.rephrase(...)` → `apiClient.rephraseText(...)` → API call
9. Response received with `rephrased_text`
10. `writeToClipboard(rephrased_text)`
11. `addToClipboardHistory(rephrased_text, true, originalText)`
12. UI updates (status, cleaned text, history reload)

---

## Key functions and commands (index)

- Frontend registration
  - `src/utils/clipboardUtils.ts` → `setupGlobalShortcut()`
- Backend hotkey copy trigger
  - Rust command: `trigger_clipboard_copy`
- Frontend event listener
  - `src/hooks/useClipboardMonitoring.ts` → `listen('text-copied-for-rephrase', ...)`
- Rephrase logic
  - `src/services/rephraseService.ts` → `setJwtToken()`, `rephrase()`
  - `src/services/apiClient.ts` → `rephraseText()`
- Clipboard + history
  - `src/utils/clipboardUtils.ts` → `writeToClipboard()`, `addToClipboardHistory()`

---

## Notes and assumptions

- The event `"text-copied-for-rephrase"` is emitted by the backend after `trigger_clipboard_copy` captures the selected text. This is inferred from the front-end listener and project memories.
- Accessibility permissions are required on macOS for global shortcuts; the permission flow is handled elsewhere (see `HotkeyPermissionManager` and associated hooks/services).
