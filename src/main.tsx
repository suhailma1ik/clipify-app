import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { initializeApiClient } from "./services/apiClient";
import { environmentConfig } from "./services/environmentService";
import { isTauriEnvironment } from "./utils";

console.log('[Main] Application starting');
console.log('[Main] React version:', React.version);
console.log('[Main] Environment check - isTauri:', isTauriEnvironment());
console.log('[Main] Window.__TAURI__ exists:', typeof window !== 'undefined' && '__TAURI__' in window);
console.log('[Main] User agent:', navigator.userAgent);

// Debug Tauri environment
if (typeof window !== 'undefined') {
  console.log('[Main] Available window properties:', Object.keys(window).filter(key => key.includes('TAURI')));
  console.log('[Main] Window location:', window.location);
}

// Initialize API client with environment configuration
console.log('[Main] Initializing API client with config:', environmentConfig.api);
initializeApiClient(environmentConfig.api);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

console.log('[Main] Application rendered');